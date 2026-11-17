# AWS CloudFormation Deployment Guide

This guide provides step-by-step instructions for deploying the **AI-Powered AWS Security Monitoring & Expense Tracker** infrastructure to your AWS account.

---

## 1. Prerequisites

1. **AWS Account**: An active AWS account with permissions for:
   - VPC, EC2, Auto Scaling, Elastic Load Balancing
   - API Gateway v2, CloudFront, Route 53
   - S3, DynamoDB, IAM
   - Amazon GuardDuty, Amazon EventBridge, AWS Lambda
   - Amazon Bedrock & Bedrock Guardrails
2. **AWS CLI** (v2 installed and configured):
   ```bash
   aws configure
   aws sts get-caller-identity
   ```
3. **Bedrock Model Access**:
   Ensure **Anthropic Claude 3 Haiku** or **Amazon Titan / Nova** is requested and active under `AWS Console -> Amazon Bedrock -> Model Access`.

---

## 2. CloudFormation Template Files

| Template File | Description |
| :--- | :--- |
| `infrastructure/cloudformation/all-in-one.yml` | **Self-contained production template**. Deploys all components in a single stack with inline Lambda code. |
| `infrastructure/cloudformation/01-vpc.yml` | VPC, Public/Private Subnets, NAT Gateway, Route Tables. |
| `infrastructure/cloudformation/02-storage-dynamo.yml` | Frontend S3 Bucket, Scan Reports Bucket, DynamoDB Findings Table. |
| `infrastructure/cloudformation/03-bedrock-guardrails.yml` | Amazon Bedrock Guardrails (Content filters, PII masking, Denied topics). |
| `infrastructure/cloudformation/04-compute-alb.yml` | Internal ALB, Target Group, Launch Template, Auto Scaling Group. |
| `infrastructure/cloudformation/05-apigateway-cloudfront.yml` | API Gateway HTTP API, VPC Link, CloudFront Distribution with OAC. |
| `infrastructure/cloudformation/06-guardduty-lambda-events.yml` | GuardDuty Detector, Lambda Function, EventBridge Rules. |
| `infrastructure/cloudformation/main.yml` | Master nested stack orchestrating all sub-stacks. |

---

## 3. Quick Deployment (Single Command)

### Option A: Using PowerShell (Windows)
```powershell
.\infrastructure\scripts\deploy.ps1 -StackName "expense-tracker-security-dev" -Environment "dev" -Region "us-east-1"
```

### Option B: Using Bash (Linux / macOS / WSL)
```bash
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh expense-tracker-security-dev dev us-east-1
```

### Option C: Using AWS CLI Directly
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/all-in-one.yml \
  --stack-name expense-tracker-security-dev \
  --parameter-overrides EnvironmentName=dev \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1
```

---

## 4. Deploying via AWS Management Console (No CLI Required)

1. Sign in to the **AWS Management Console** and select your target region (e.g., `us-east-1`).
2. Navigate to **CloudFormation** -> Click **Create stack** -> **With new resources (standard)**.
3. Under **Prerequisite - Prepare template**, select **Template is ready**.
4. Under **Specify template**, select **Upload a template file** -> Click **Choose file** -> Select `infrastructure/cloudformation/all-in-one.yml`.
5. Click **Next**:
   - **Stack name**: `expense-tracker-security-dev`
   - **EnvironmentName**: `dev`
   - **InstanceType**: `t3.micro`
   - **BedrockModelId**: `anthropic.claude-3-haiku-20240307-v1:0`
6. Click **Next** -> Keep default options -> Click **Next**.
7. In the final **Review** page, check the acknowledgment checkbox:
   - *"I acknowledge that AWS CloudFormation might create IAM resources with custom names."*
8. Click **Submit**.
9. Wait ~5-8 minutes until the stack status transitions to `CREATE_COMPLETE`.

---

## 5. Post-Deployment: Upload Frontend to S3

Once CloudFormation finishes, get the **Frontend S3 Bucket Name** from the CloudFormation Outputs:

```bash
# 1. Build the React frontend
cd frontend
npm install --legacy-peer-deps
npm run build

# 2. Get the S3 bucket name from stack outputs
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name expense-tracker-security-dev \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendS3Bucket'].OutputValue" \
  --output text)

# 3. Synchronize build files to S3
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ --delete

# 4. Invalidate CloudFront cache (optional, for immediate refresh)
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?Id=='S3FrontendOrigin']].Id" \
  --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

Open the `CloudFrontEndpoint` URL from stack outputs in your browser to access the live application!

---

## 6. Testing AI Security & Threat Remediation

### 1. Trigger a Test GuardDuty Finding
Generate a sample finding via AWS CLI:
```bash
DETECTOR_ID=$(aws guardduty list-detectors --query "DetectorIds[0]" --output text)
aws guardduty create-sample-findings \
  --detector-id $DETECTOR_ID \
  --finding-types "UnauthorizedAccess:EC2/SSHBruteForce"
```

### 2. Check Event Processing in Lambda
View Lambda execution logs:
```bash
aws logs tail /aws/lambda/dev-SecurityScannerFunction --follow
```

### 3. Verify Findings in DynamoDB
```bash
aws dynamodb scan --table-name dev-SecurityFindingsTable --output table
```

### 4. Verify Scan Report in S3
```bash
REPORTS_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name expense-tracker-security-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ScanReportsS3Bucket'].OutputValue" \
  --output text)

aws s3 ls s3://${REPORTS_BUCKET}/reports/
```

---

## 7. Cleaning Up Resources (To Avoid Ongoing AWS Charges)

When you are finished testing, delete all created resources:

```bash
# 1. Empty S3 Buckets first (required before CloudFormation can delete them)
aws s3 rm s3://${FRONTEND_BUCKET}/ --recursive
aws s3 rm s3://${REPORTS_BUCKET}/ --recursive

# 2. Delete the CloudFormation Stack
aws cloudformation delete-stack --stack-name expense-tracker-security-dev
```
