output "cloudfront_endpoint" {
  description = "Global HTTPS endpoint for React Frontend and API Gateway routing"
  value       = "https://${aws_cloudfront_distribution.frontend_distribution.domain_name}"
}

output "frontend_s3_bucket" {
  description = "S3 Bucket name hosting the static React Vite build"
  value       = aws_s3_bucket.frontend.id
}

output "scan_reports_s3_bucket" {
  description = "S3 Bucket name storing automated AI audit and scan reports"
  value       = aws_s3_bucket.scan_reports.id
}

output "security_findings_table" {
  description = "DynamoDB Table name containing threat findings, status, and AI remediations"
  value       = aws_dynamodb_table.security_findings.name
}

output "bedrock_guardrail_id" {
  description = "Amazon Bedrock Guardrail ID enforcing safety and PII masking"
  value       = aws_bedrock_guardrail.security_guardrail.guardrail_id
}

output "http_api_endpoint" {
  description = "API Gateway HTTP API Endpoint connected via VPC Link to ALB"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "internal_alb_dns" {
  description = "Internal Application Load Balancer DNS Name"
  value       = aws_lb.internal_alb.dns_name
}

output "autoscaling_group_name" {
  description = "Auto Scaling Group Name for FastAPI Backend EC2 instances"
  value       = aws_autoscaling_group.backend_asg.name
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}
