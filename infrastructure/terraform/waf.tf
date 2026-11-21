# ==============================================================================
# AWS WAFV2 WEB ACL: PERIMETER PROTECTION FOR CLOUDFRONT CDN
# Mitigates Layer 7 DDoS, OWASP Top 10 vulnerabilities, and Rate Abuse
# Note: CloudFront WAF WebACL must be provisioned in the us-east-1 region.
# ==============================================================================

resource "aws_wafv2_web_acl" "cloudfront_waf" {
  name        = "${var.environment}-expense-tracker-waf"
  description = "WAF protecting CloudFront edge distribution with OWASP Core Rules and Rate Limiting"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule 1: IP Rate Limiting (Prevents Brute Force on Auth / APIs)
  rule {
    name     = "RateLimitApiTraffic"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitApiTrafficMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Rules - Common Rule Set (OWASP Top 10)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed Rules - Known Bad Inputs (Log4j, SQL Injection, RCE)
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.environment}ExpenseTrackerWafMetric"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.environment}-expense-tracker-waf"
    Environment = var.environment
  }
}
