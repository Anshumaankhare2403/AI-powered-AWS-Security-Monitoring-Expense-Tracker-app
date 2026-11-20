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
  description = "CIDR block for Private Subnet 1"
  type        = string
  default     = "10.0.11.0/24"
}

variable "private_subnet_2_cidr" {
  description = "CIDR block for Private Subnet 2"
  type        = string
  default     = "10.0.12.0/24"
}

variable "instance_type" {
  description = "EC2 instance type for FastAPI backend servers"
  type        = string
  default     = "t3.micro"
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock Foundation Model ID for AI security analysis"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
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
