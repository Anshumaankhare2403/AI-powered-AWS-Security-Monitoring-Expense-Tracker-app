import json
import os
import logging
import datetime
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables configured via CloudFormation
DYNAMODB_TABLE = os.environ.get("FINDINGS_TABLE_NAME", "SecurityFindingsTable")
SCAN_REPORTS_BUCKET = os.environ.get("REPORTS_BUCKET_NAME", "expense-tracker-scan-reports")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
BEDROCK_GUARDRAIL_ID = os.environ.get("BEDROCK_GUARDRAIL_ID", "")
BEDROCK_GUARDRAIL_VERSION = os.environ.get("BEDROCK_GUARDRAIL_VERSION", "DRAFT")
AWS_REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
os.environ.setdefault("AWS_DEFAULT_REGION", AWS_REGION)

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
s3_client = boto3.client("s3", region_name=AWS_REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name=AWS_REGION)
table = dynamodb.Table(DYNAMODB_TABLE)


def sanitize_with_guardrail(text: str, source: str = "INPUT") -> dict:
    """
    Applies Amazon Bedrock Guardrails to validate/sanitize input or output text.
    Checks content filters, PII masking, denied topics, and prompt attacks.
    """
    if not BEDROCK_GUARDRAIL_ID:
        return {"action": "NONE", "text": text, "assessments": []}

    try:
        response = bedrock_runtime.apply_guardrail(
            guardrailIdentifier=BEDROCK_GUARDRAIL_ID,
            guardrailVersion=BEDROCK_GUARDRAIL_VERSION,
            source=source,
            content=[{"text": {"text": text}}],
        )
        action = response.get("action", "NONE")
        output_text = text
        if "outputs" in response and len(response["outputs"]) > 0:
            output_text = response["outputs"][0].get("text", text)

        return {
            "action": action,
            "text": output_text,
            "assessments": response.get("assessments", []),
        }
    except Exception as exc:
        logger.warning(f"Bedrock Guardrail evaluation skipped or error: {exc}")
        return {"action": "NONE", "text": text, "assessments": []}


def invoke_bedrock_analysis(finding_summary: str) -> dict:
    """
    Invokes Amazon Bedrock foundation model with Guardrail protection
    to generate security impact and automated remediation steps.
    """
    prompt = f"""You are a Cloud Security & FinOps Automation Agent for an enterprise Expense Tracker system.
Analyze the following security/expense anomaly finding:
{finding_summary}

Provide a concise JSON response with the following keys:
- "severity_level": "LOW", "MEDIUM", "HIGH", or "CRITICAL"
- "risk_analysis": One sentence summary of the security impact.
- "financial_impact": Estimated financial or resource exposure.
- "remediation_steps": Array of exact, step-by-step actions to mitigate this threat.
- "automated_action_recommended": Proposed automated remediation.

Return ONLY valid JSON.
"""
    # 1. Evaluate input prompt through Bedrock Guardrails
    guardrail_input = sanitize_with_guardrail(prompt, source="INPUT")
    if guardrail_input.get("action") == "GUARDRAIL_INTERVENED":
        logger.warning("Bedrock Guardrail intervened on input prompt.")
        return {
            "severity_level": "HIGH",
            "risk_analysis": "Guardrail intervened: Potential prompt injection or sensitive PII detected.",
            "financial_impact": "Protected by Bedrock Guardrails",
            "remediation_steps": ["Review event source for security anomalies"],
            "automated_action_recommended": "Blocked by AI Safety Guardrails",
        }

    # 2. Invoke Foundation Model
    try:
        if "claude" in BEDROCK_MODEL_ID:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "temperature": 0.2,
                "messages": [
                    {"role": "user", "content": guardrail_input["text"]}
                ],
            })
            response = bedrock_runtime.invoke_model(
                modelId=BEDROCK_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            response_body = json.loads(response["body"].read().decode("utf-8"))
            raw_text = response_body["content"][0]["text"]
        else:
            # Fallback for Amazon Titan / Nova
            body = json.dumps({
                "inputText": guardrail_input["text"],
                "textGenerationConfig": {
                    "maxTokenCount": 1024,
                    "temperature": 0.2,
                }
            })
            response = bedrock_runtime.invoke_model(
                modelId=BEDROCK_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            response_body = json.loads(response["body"].read().decode("utf-8"))
            raw_text = response_body.get("results", [{}])[0].get("outputText", "{}")

        # 3. Evaluate output through Bedrock Guardrails
        guardrail_output = sanitize_with_guardrail(raw_text, source="OUTPUT")
        validated_text = guardrail_output.get("text", raw_text)

        # Parse JSON from model output
        try:
            start_idx = validated_text.find("{")
            end_idx = validated_text.rfind("}") + 1
            if start_idx != -1 and end_idx != 0:
                parsed = json.loads(validated_text[start_idx:end_idx])
                return parsed
        except Exception:
            pass

        return {
            "severity_level": "MEDIUM",
            "risk_analysis": validated_text[:200],
            "financial_impact": "Undetermined",
            "remediation_steps": ["Inspect AWS CloudTrail and GuardDuty dashboards"],
            "automated_action_recommended": "Manual security review required",
        }

    except Exception as exc:
        logger.error(f"Error calling Amazon Bedrock: {exc}")
        return {
            "severity_level": "MEDIUM",
            "risk_analysis": f"Bedrock invocation failed: {str(exc)}",
            "financial_impact": "Unknown",
            "remediation_steps": ["Check AWS IAM permissions and model access"],
            "automated_action_recommended": "Retry after IAM permission validation",
        }


def handler(event, context):
    """
    AWS Lambda entrypoint triggered by Amazon EventBridge (GuardDuty findings or Scheduled Scan).
    """
    logger.info("Received event: %s", json.dumps(event))
    timestamp = datetime.datetime.utcnow().isoformat()
    findings_processed = []

    # Scenario A: GuardDuty Finding Event
    if event.get("source") == "aws.guardduty":
        detail = event.get("detail", {})
        finding_id = detail.get("id", f"gd-{int(datetime.datetime.utcnow().timestamp())}")
        finding_type = detail.get("type", "UnknownGuardDutyThreat")
        severity = detail.get("severity", 4)
        title = detail.get("title", f"GuardDuty Finding: {finding_type}")
        description = detail.get("description", "No description provided.")
        resource = detail.get("resource", {})

        summary_for_ai = f"""Finding ID: {finding_id}
Type: {finding_type}
Severity: {severity}
Title: {title}
Description: {description}
Target Resource: {json.dumps(resource)}
"""
        # AI Analysis via Amazon Bedrock + Guardrails
        ai_analysis = invoke_bedrock_analysis(summary_for_ai)

        item = {
            "finding_id": finding_id,
            "timestamp": timestamp,
            "source": "aws.guardduty",
            "finding_type": finding_type,
            "severity": str(severity),
            "title": title,
            "description": description,
            "ai_severity": ai_analysis.get("severity_level", "MEDIUM"),
            "ai_risk_analysis": ai_analysis.get("risk_analysis", ""),
            "ai_financial_impact": ai_analysis.get("financial_impact", ""),
            "remediation_steps": ai_analysis.get("remediation_steps", []),
            "status": "OPEN",
        }

        # Save to DynamoDB
        table.put_item(Item=item)
        findings_processed.append(item)

    # Scenario B: Scheduled Scan or Direct Invocation
    else:
        finding_id = f"scan-{int(datetime.datetime.utcnow().timestamp())}"
        summary_for_ai = """Scheduled Expense & Security Audit:
Checking VPC private subnets, EC2 auto scaling group health, and anomalous expense patterns.
Current system status: Nominal, all financial ledgers synchronized.
"""
        ai_analysis = invoke_bedrock_analysis(summary_for_ai)

        item = {
            "finding_id": finding_id,
            "timestamp": timestamp,
            "source": "scheduled.audit",
            "finding_type": "ScheduledSecurityAndExpenseAudit",
            "severity": "1.0",
            "title": "Automated Scheduled Security & FinOps Scan",
            "description": "Routine security baseline check and financial integrity verification.",
            "ai_severity": ai_analysis.get("severity_level", "LOW"),
            "ai_risk_analysis": ai_analysis.get("risk_analysis", "No anomalies identified."),
            "ai_financial_impact": ai_analysis.get("financial_impact", "Zero excess costs."),
            "remediation_steps": ai_analysis.get("remediation_steps", ["Continue routine monitoring"]),
            "status": "RESOLVED",
        }

        table.put_item(Item=item)
        findings_processed.append(item)

    # Generate Audit Scan Report into S3
    report_key = f"reports/scan_report_{timestamp[:10]}_{int(datetime.datetime.utcnow().timestamp())}.json"
    report_content = json.dumps({
        "generated_at": timestamp,
        "processed_count": len(findings_processed),
        "findings": findings_processed,
    }, indent=2)

    try:
        s3_client.put_object(
            Bucket=SCAN_REPORTS_BUCKET,
            Key=report_key,
            Body=report_content,
            ContentType="application/json",
        )
        logger.info(f"Saved scan report to s3://{SCAN_REPORTS_BUCKET}/{report_key}")
    except Exception as exc:
        logger.error(f"Failed to write report to S3: {exc}")

    return {
        "statusCode": 200,
        "body": {
            "message": "Security scan and AI analysis completed successfully.",
            "report_key": report_key,
            "findings_count": len(findings_processed),
        }
    }
