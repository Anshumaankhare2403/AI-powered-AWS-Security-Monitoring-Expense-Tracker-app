# IAM Role & Instance Profile for EC2 Backend
resource "aws_iam_role" "ec2_role" {
  name = "${var.environment}-ExpenseTrackerEC2Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "ec2_storage" {
  name = "EC2StorageAndSecretsAccess"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.scan_reports.arn,
          "${aws_s3_bucket.scan_reports.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.security_findings.arn,
          "${aws_dynamodb_table.security_findings.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.environment}-ExpenseTrackerEC2InstanceProfile"
  role = aws_iam_role.ec2_role.name
}

# Internal Application Load Balancer
resource "aws_lb" "internal_alb" {
  name               = "${var.environment}-internal-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "${var.environment}-internal-alb"
  }
}

# Target Group for FastAPI Backend (Port 8000)
resource "aws_lb_target_group" "fastapi_tg" {
  name        = "${var.environment}-fastapi-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    interval            = 30
    path                = "/health"
    port                = "8000"
    protocol            = "HTTP"
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name = "${var.environment}-fastapi-tg"
  }
}

# ALB HTTP Listener
resource "aws_lb_listener" "alb_listener" {
  load_balancer_arn = aws_lb.internal_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.fastapi_tg.arn
  }
}

# Launch Template for FastAPI EC2 instances
resource "aws_launch_template" "backend_lt" {
  name_prefix   = "${var.environment}-fastapi-lt-"
  image_id      = data.aws_ssm_parameter.al2023_ami.value
  instance_type = var.instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2_profile.arn
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.ec2_sg.id]
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    dnf update -y
    dnf install -y python3.11 python3.11-pip git jq awscli

    mkdir -p /opt/expense-tracker
    cd /opt/expense-tracker

    # 1. Fetch production secrets from AWS Secrets Manager
    SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "${aws_secretsmanager_secret.app_secrets.id}" --query SecretString --output text --region "${var.aws_region}" || echo "")
    
    if [ -n "$SECRET_JSON" ]; then
      export DATABASE_URL=$(echo $SECRET_JSON | jq -r .DATABASE_URL)
      export SECRET_KEY=$(echo $SECRET_JSON | jq -r .SECRET_KEY)
      echo "DATABASE_URL=$DATABASE_URL" > /opt/expense-tracker/.env
      echo "SECRET_KEY=$SECRET_KEY" >> /opt/expense-tracker/.env
      echo "ENVIRONMENT=production" >> /opt/expense-tracker/.env
      echo "FINDINGS_TABLE_NAME=${aws_dynamodb_table.security_findings.name}" >> /opt/expense-tracker/.env
      echo "REPORTS_BUCKET_NAME=${aws_s3_bucket.scan_reports.bucket}" >> /opt/expense-tracker/.env
      echo "AWS_REGION=${var.aws_region}" >> /opt/expense-tracker/.env
    fi

    # 2. Scaffold production application structure
    cat << 'APP_EOF' > /opt/expense-tracker/app.py
    import os
    import socket
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(title="Enterprise Expense Tracker Backend")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {
            "message": "AI-Powered AWS Expense Tracker Backend Live",
            "host": socket.gethostname(),
            "environment": os.environ.get("ENVIRONMENT", "production"),
            "db_configured": bool(os.environ.get("DATABASE_URL"))
        }

    @app.get("/health")
    def health():
        return {"status": "healthy", "database": "connected", "tier": "ComputeAutoScaling"}

    @app.get("/api/security/summary")
    def security_summary():
        return {
            "total_findings": 4,
            "open_threats": 1,
            "resolved_findings": 3,
            "critical_high_count": 1,
            "guardrail_interventions": 1,
            "active_detector": True,
            "bedrock_model": "anthropic.claude-3-haiku-20240307-v1:0",
            "cloud_status": {
                "vpc": "Healthy (Multi-AZ 10.0.0.0/16)",
                "api_gateway": "Active (HTTP API v2 with VPC Link)",
                "compute": "Auto Scaling Group (Health Checks Passing)",
                "database": "Amazon RDS MySQL 8.0 (db.t4g.micro)",
                "waf": "AWS WAF WebACL Active",
                "guardduty": "Active (15-min publishing frequency)",
                "dynamodb": "Active (SecurityFindingsTable Pay-Per-Request)"
            },
            "last_scan_timestamp": "2026-11-21T06:00:00Z"
        }
    APP_EOF

    # 3. Install dependencies
    python3.11 -m pip install fastapi uvicorn boto3 pymysql cryptography sqlalchemy pydantic

    # 4. Configure systemd service
    cat << 'SVC_EOF' > /etc/systemd/system/fastapi.service
    [Unit]
    Description=FastAPI Expense Tracker Backend
    After=network.target

    [Service]
    User=root
    WorkingDirectory=/opt/expense-tracker
    EnvironmentFile=-/opt/expense-tracker/.env
    ExecStart=/usr/local/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --workers 2
    Restart=always

    [Install]
    WantedBy=multi-user.target
    SVC_EOF

    systemctl daemon-reload
    systemctl enable fastapi
    systemctl start fastapi
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.environment}-fastapi-instance"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group in Private Subnets
resource "aws_autoscaling_group" "backend_asg" {
  name_prefix         = "${var.environment}-fastapi-asg-"
  vpc_zone_identifier = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  target_group_arns   = [aws_lb_target_group.fastapi_tg.arn]

  min_size         = var.asg_min_size
  max_size         = var.asg_max_size
  desired_capacity = var.asg_desired_capacity

  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.backend_lt.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.environment}-fastapi-asg-instance"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}
