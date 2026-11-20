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
  name = "EC2StorageAccess"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.scan_reports.arn,
        "${aws_s3_bucket.scan_reports.arn}/*"
      ]
    }]
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
    dnf update -y
    dnf install -y python3.11 python3.11-pip git

    mkdir -p /opt/expense-tracker
    cd /opt/expense-tracker

    cat << 'APP_EOF' > app.py
    from fastapi import FastAPI
    import socket
    app = FastAPI(title="Expense Tracker Backend")

    @app.get("/")
    def root():
        return {"message": "Expense Tracker API live on EC2 via Terraform", "host": socket.gethostname()}

    @app.get("/health")
    def health():
        return {"status": "healthy", "database": "connected"}
    APP_EOF

    python3.11 -m pip install fastapi uvicorn

    cat << 'SVC_EOF' > /etc/systemd/system/fastapi.service
    [Unit]
    Description=FastAPI Expense Tracker Backend
    After=network.target

    [Service]
    User=root
    WorkingDirectory=/opt/expense-tracker
    ExecStart=/usr/local/bin/uvicorn app:app --host 0.0.0.0 --port 8000
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
