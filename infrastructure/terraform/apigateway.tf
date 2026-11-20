# API Gateway VPC Link to Internal ALB
resource "aws_apigatewayv2_vpc_link" "vpc_link" {
  name               = "${var.environment}-api-gw-vpc-link"
  security_group_ids = [aws_security_group.vpclink_sg.id]
  subnet_ids         = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "${var.environment}-api-gw-vpc-link"
  }
}

# HTTP API (API Gateway v2)
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.environment}-ExpenseTrackerHttpApi"
  protocol_type = "HTTP"
  description   = "HTTP API routing external traffic through VPC Link to Internal ALB"

  tags = {
    Name = "${var.environment}-ExpenseTrackerHttpApi"
  }
}

# HTTP API Integration with Internal ALB via VPC Link
resource "aws_apigatewayv2_integration" "alb_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "HTTP_PROXY"
  integration_uri  = aws_lb_listener.alb_listener.arn

  integration_method = "ANY"
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.vpc_link.id

  payload_format_version = "1.0"
}

# Default Route
resource "aws_apigatewayv2_route" "default_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.alb_integration.id}"
}

# Default Auto-Deploy Stage
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name = "${var.environment}-default-stage"
  }
}
