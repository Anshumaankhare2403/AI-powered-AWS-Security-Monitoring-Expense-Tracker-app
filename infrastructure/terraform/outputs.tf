output "cloudfront_endpoint" {
  description = "Global HTTPS endpoint for React Frontend and API Gateway routing"
  value       = var.enable_cloudfront && length(aws_cloudfront_distribution.frontend_distribution) > 0 ? "https://${aws_cloudfront_distribution.frontend_distribution[0].domain_name}" : "CloudFront disabled (Account verification required). Direct API Gateway URL: ${aws_apigatewayv2_stage.default_stage.invoke_url}"
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

output "rds_endpoint" {
  description = "Amazon RDS MySQL Database Endpoint (Isolated Data Tier)"
  value       = aws_db_instance.mysql.endpoint
}

output "rds_database_name" {
  description = "Relational database name"
  value       = aws_db_instance.mysql.db_name
}

output "secrets_manager_secret_arn" {
  description = "AWS Secrets Manager ARN storing production database credentials and JWT keys"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "waf_web_acl_arn" {
  description = "AWS WAFv2 Web ACL ARN protecting the CloudFront distribution"
  value       = var.enable_waf && var.enable_cloudfront && length(aws_wafv2_web_acl.cloudfront_waf) > 0 ? aws_wafv2_web_acl.cloudfront_waf[0].arn : "disabled"
}

output "s3_gateway_endpoint_id" {
  description = "VPC Gateway Endpoint for Amazon S3 (Cost-optimized, bypasses NAT Gateway)"
  value       = aws_vpc_endpoint.s3.id
}

output "dynamodb_gateway_endpoint_id" {
  description = "VPC Gateway Endpoint for Amazon DynamoDB (Cost-optimized, bypasses NAT Gateway)"
  value       = aws_vpc_endpoint.dynamodb.id
}
