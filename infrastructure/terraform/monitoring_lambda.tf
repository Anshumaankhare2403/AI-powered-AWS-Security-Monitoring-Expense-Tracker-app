# GuardDuty Threat Detection
resource "aws_guardduty_detector" "primary" {
  count                        = var.enable_guardduty ? 1 : 0
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = {
    Name = "${var.environment}-guardduty-detector"
  }
}

# IAM Role for Lambda Security Scanner
resource "aws_iam_role" "lambda_role" {
  name = "${var.environment}-SecurityScannerLambdaRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "SecurityScannerPermissions"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.security_findings.arn,
          "${aws_dynamodb_table.security_findings.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.scan_reports.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:ApplyGuardrail"
        ]
        Resource = [
          aws_bedrock_guardrail.security_guardrail.guardrail_arn,
          "${aws_bedrock_guardrail.security_guardrail.guardrail_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "guardduty:GetFindings",
          "guardduty:ListFindings"
        ]
        Resource = var.enable_guardduty && length(aws_guardduty_detector.primary) > 0 ? aws_guardduty_detector.primary[0].arn : "*"
      }
    ]
  })
}

# Package Lambda function source code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambda/security_scanner.py"
  output_path = "${path.module}/security_scanner.zip"
}

# AWS Lambda Function: AI Threat Analysis & Bedrock Guardrail Sanitization
resource "aws_lambda_function" "security_scanner" {
  function_name    = "${var.environment}-SecurityScannerFunction"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.11"
  handler          = "security_scanner.handler"
  role             = aws_iam_role.lambda_role.arn
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      FINDINGS_TABLE_NAME       = aws_dynamodb_table.security_findings.name
      REPORTS_BUCKET_NAME       = aws_s3_bucket.scan_reports.id
      BEDROCK_MODEL_ID          = var.bedrock_model_id
      BEDROCK_GUARDRAIL_ID      = aws_bedrock_guardrail.security_guardrail.guardrail_id
      BEDROCK_GUARDRAIL_VERSION = "DRAFT"
    }
  }

  tags = {
    Name = "${var.environment}-SecurityScannerFunction"
  }
}

# EventBridge Rule 1: GuardDuty Threat Findings
resource "aws_cloudwatch_event_rule" "guardduty_rule" {
  name        = "${var.environment}-GuardDutyFindingsRule"
  description = "Capture GuardDuty findings and forward to Security Scanner Lambda"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
  })

  tags = {
    Name = "${var.environment}-GuardDutyFindingsRule"
  }
}

resource "aws_cloudwatch_event_target" "guardduty_target" {
  rule      = aws_cloudwatch_event_rule.guardduty_rule.name
  target_id = "TargetSecurityScannerLambda"
  arn       = aws_lambda_function.security_scanner.arn
}

resource "aws_lambda_permission" "allow_eventbridge_guardduty" {
  statement_id  = "AllowExecutionFromGuardDutyEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.security_scanner.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.guardduty_rule.arn
}

# EventBridge Rule 2: Scheduled 6-Hour FinOps & Security Audit
resource "aws_cloudwatch_event_rule" "scheduled_scan_rule" {
  name                = "${var.environment}-ScheduledSecurityScanRule"
  description         = "Triggers automated 6-hour security and expense audit scans"
  schedule_expression = "rate(6 hours)"

  tags = {
    Name = "${var.environment}-ScheduledSecurityScanRule"
  }
}

resource "aws_cloudwatch_event_target" "scheduled_target" {
  rule      = aws_cloudwatch_event_rule.scheduled_scan_rule.name
  target_id = "TargetScheduledScannerLambda"
  arn       = aws_lambda_function.security_scanner.arn
}

resource "aws_lambda_permission" "allow_eventbridge_scheduled" {
  statement_id  = "AllowExecutionFromScheduledEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.security_scanner.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduled_scan_rule.arn
}
