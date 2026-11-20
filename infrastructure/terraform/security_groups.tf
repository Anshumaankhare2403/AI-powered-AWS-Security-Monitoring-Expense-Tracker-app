# Security Group for Internal Application Load Balancer
resource "aws_security_group" "alb_sg" {
  name        = "${var.environment}-alb-sg"
  description = "Allow inbound HTTP from VPC Link to Internal ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP ingress from within VPC CIDR"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-alb-sg"
  }
}

# Security Group for Backend EC2 Instances
resource "aws_security_group" "ec2_sg" {
  name        = "${var.environment}-ec2-sg"
  description = "Allow inbound port 8000 from ALB Security Group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Port 8000 from Internal ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    description = "Allow all outbound traffic to internet/services"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-ec2-sg"
  }
}

# Security Group for API Gateway VPC Link
resource "aws_security_group" "vpclink_sg" {
  name        = "${var.environment}-vpclink-sg"
  description = "Security group for API Gateway VPC Link"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow outbound to Internal ALB"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-vpclink-sg"
  }
}
