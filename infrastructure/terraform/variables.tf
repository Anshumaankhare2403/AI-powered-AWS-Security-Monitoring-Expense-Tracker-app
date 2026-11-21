variable "aws_region" {
  description = "AWS region for resources deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment identifier (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the entire VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_1_cidr" {
  description = "CIDR block for Public Subnet 1"
  type        = string
  default     = "10.0.1.0/24"
}

variable "public_subnet_2_cidr" {
  description = "CIDR block for Public Subnet 2"
  type        = string
  default     = "10.0.2.0/24"
}

variable "private_subnet_1_cidr" {
  description = "CIDR block for Private Subnet 1 (Compute Tier)"
  type        = string
  default     = "10.0.11.0/24"
}

variable "private_subnet_2_cidr" {
  description = "CIDR block for Private Subnet 2 (Compute Tier)"
  type        = string
  default     = "10.0.12.0/24"
}

variable "database_subnet_1_cidr" {
  description = "CIDR block for Isolated Database Subnet 1"
  type        = string
  default     = "10.0.21.0/24"
}

variable "database_subnet_2_cidr" {
  description = "CIDR block for Isolated Database Subnet 2"
  type        = string
  default     = "10.0.22.0/24"
}

# Compute Variables
variable "instance_type" {
  description = "EC2 instance type for FastAPI backend servers"
  type        = string
  default     = "t3.micro"
}

variable "asg_min_size" {
  description = "Minimum capacity for Auto Scaling Group"
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum capacity for Auto Scaling Group"
  type        = number
  default     = 3
}

variable "asg_desired_capacity" {
  description = "Desired capacity for Auto Scaling Group"
  type        = number
  default     = 1
}

# Relational Database (RDS MySQL 8.0) Variables
variable "db_name" {
  description = "MySQL database name"
  type        = string
  default     = "expensetracker"
}

variable "db_username" {
  description = "Master username for RDS MySQL database"
  type        = string
  default     = "trackeradmin"
}

variable "db_password" {
  description = "Master password for RDS MySQL database"
  type        = string
  default     = "ExpensePass2026Secure!"
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS MySQL instance class (AWS Graviton t4g.micro for cost & performance efficiency)"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB for RDS MySQL (gp3)"
  type        = number
  default     = 20
}

# AI Security Variables
variable "bedrock_model_id" {
  description = "Amazon Bedrock Foundation Model ID for AI security analysis"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "enable_waf" {
  description = "Whether to deploy and associate AWS WAFv2 with CloudFront"
  type        = bool
  default     = true
}
