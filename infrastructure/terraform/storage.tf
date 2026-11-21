# S3 Bucket for Frontend Hosting (React Vite SPA)
resource "aws_s3_bucket" "frontend" {
  bucket        = "expense-tracker-frontend-${var.environment}-${data.aws_caller_identity.current.account_id}-${random_string.suffix.result}"
  force_destroy = true

  tags = {
    Name = "${var.environment}-expense-tracker-frontend"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for Storing Automated AI Security & Cost Scan Reports
resource "aws_s3_bucket" "scan_reports" {
  bucket        = "expense-tracker-scan-reports-${var.environment}-${data.aws_caller_identity.current.account_id}-${random_string.suffix.result}"
  force_destroy = true

  tags = {
    Name = "${var.environment}-expense-tracker-scan-reports"
  }
}

resource "aws_s3_bucket_versioning" "scan_reports" {
  bucket = aws_s3_bucket.scan_reports.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "scan_reports" {
  bucket = aws_s3_bucket.scan_reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "scan_reports" {
  bucket = aws_s3_bucket.scan_reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# FinOps Cost-Optimization: S3 Lifecycle Rule for Scan Reports
resource "aws_s3_bucket_lifecycle_configuration" "scan_reports_lifecycle" {
  bucket = aws_s3_bucket.scan_reports.id

  rule {
    id     = "retire-old-scan-reports"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90
    }
  }
}

# DynamoDB Table for Security Findings, Threat Events & AI Remediation Status
resource "aws_dynamodb_table" "security_findings" {
  name         = "${var.environment}-SecurityFindingsTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "finding_id"
  range_key    = "timestamp"

  attribute {
    name = "finding_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.environment}-SecurityFindingsTable"
    Application = "ExpenseTrackerSecurityMonitoring"
  }
}
