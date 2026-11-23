# CloudFront Origin Access Control for S3 Frontend
resource "aws_cloudfront_origin_access_control" "frontend_oac" {
  count                             = var.enable_cloudfront ? 1 : 0
  name                              = "${var.environment}-frontend-oac-${random_string.suffix.result}"
  description                       = "OAC for static React Frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution Routing Frontend (S3) and API (/api/*, /health to API Gateway)
resource "aws_cloudfront_distribution" "frontend_distribution" {
  count               = var.enable_cloudfront ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${var.environment} Expense Tracker Frontend & API Distribution"
  web_acl_id          = var.enable_waf && var.enable_cloudfront && length(aws_wafv2_web_acl.cloudfront_waf) > 0 ? aws_wafv2_web_acl.cloudfront_waf[0].arn : null

  # Origin 1: React Frontend in S3
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3FrontendOrigin"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend_oac[0].id
  }

  # Origin 2: API Gateway HTTP API
  origin {
    domain_name = replace(replace(aws_apigatewayv2_api.http_api.api_endpoint, "https://", ""), "/", "")
    origin_id   = "ApiGatewayOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default Cache Behavior (serves React Vite frontend SPA)
  default_cache_behavior {
    target_origin_id       = "S3FrontendOrigin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
    compress    = true
  }

  # Ordered Cache Behavior 1: /api/* to API Gateway
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ApiGatewayOrigin"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Ordered Cache Behavior 2: /health to API Gateway
  ordered_cache_behavior {
    path_pattern           = "/health"
    target_origin_id       = "ApiGatewayOrigin"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # SPA Routing: Redirect 403 and 404 to index.html for React Router
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.environment}-expense-tracker-cf"
  }
}

# S3 Bucket Policy allowing CloudFront OAC Read Access
resource "aws_s3_bucket_policy" "frontend_policy" {
  count  = var.enable_cloudfront ? 1 : 0
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontServicePrincipalReadOnly"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend_distribution[0].arn
        }
      }
    }]
  })
}
