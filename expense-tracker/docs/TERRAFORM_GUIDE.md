# AWS Terraform Deployment Guide: AI-Powered Security & Expense Tracker

This guide details how to deploy, manage, and tear down the **AI-Powered AWS Security Monitoring & Expense Tracker** infrastructure using **Terraform**.

---

## 1. Architecture Overview (Terraform Components)

The Terraform configuration reproduces the exact AWS architecture specification:

```
[Users / Internet]
       │
       ▼
 [Amazon Route 53] (Optional custom DNS)
       │
       ▼
 [Amazon CloudFront] (Global CDN Distribution)
  ├── Default Route -> [Amazon S3] (Frontend Bucket with Origin Access Control)
  └── /api/*, /health -> [Amazon API Gateway HTTP API v2]
                              │ (VPC Link)
                              ▼
           [Internal Application Load Balancer] (Private Subnets)
                              │ (Port 8000)
                              ▼
           [EC2 Auto Scaling Group] (FastAPI Backend Servers)
                              ▲
                              │
               [AWS Lambda Scanner] ◄── [Amazon EventBridge]
               ├── Amazon GuardDuty (Threat Events)
               ├── 6-Hour Scheduled Audit Scan
               ├── Amazon Bedrock Guardrails (PII Masking, Content & Prompt Defense)
               ├── Amazon Bedrock Foundation Model (Claude 3 / Titan Analysis)
               ├── Amazon DynamoDB (Findings Table)
               └── Amazon S3 (Scan Reports Bucket)
```

---

## 2. Directory Structure

```
infrastructure/terraform/
├── main.tf                    # AWS & Archive Provider config, AMI SSM lookup
├── variables.tf               # Input variables, validation constraints, and defaults
├── outputs.tf                 # CloudFront URL, S3 Buckets, ALB DNS, API Gateway, DynamoDB
├── terraform.tfvars.example   # Sample variable definitions
├── vpc.tf                     # 2-AZ VPC, Public & Private Subnets, NAT GW, Route Tables
├── security_groups.tf         # ALB, EC2, and API Gateway VPC Link security groups
├── storage.tf                 # Frontend S3 (encrypted), Scan Reports S3, DynamoDB
├── bedrock.tf                 # Amazon Bedrock Guardrail (Content, PII, Denied Topics)
├── compute.tf                 # Internal ALB, Target Group, Launch Template, ASG, IAM
├── apigateway.tf              # HTTP API v2, VPC Link, ALB integration, default route
├── cloudfront.tf              # CloudFront Distribution, Origin Access Control, Bucket Policy
└── monitoring_lambda.tf       # GuardDuty Detector, EventBridge Rules, Lambda Scanner
```

---

## 3. Quick Start Deployment

### Step 1: Configure AWS CLI Credentials
Ensure you have active AWS credentials:
```bash
aws configure
aws sts get-caller-identity
```

### Step 2: Request Bedrock Model Access
Ensure model access is granted in the AWS Console:
- Go to **Amazon Bedrock** -> **Model access** -> Request access for **Anthropic Claude 3 Haiku** or **Amazon Titan Text**.

### Step 3: Run Deployment

#### Using PowerShell (Windows):
```powershell
.\infrastructure\scripts\deploy_tf.ps1 -Action apply -Environment dev -Region us-east-1
```

#### Using Bash (Linux / macOS / WSL):
```bash
chmod +x infrastructure/scripts/deploy_tf.sh
./infrastructure/scripts/deploy_tf.sh apply dev us-east-1
```

#### Using Standard Terraform Commands:
```bash
cd infrastructure/terraform

# 1. Initialize
terraform init

# 2. Plan
terraform plan -var="environment=dev" -var="aws_region=us-east-1"

# 3. Apply
terraform apply -auto-approve -var="environment=dev" -var="aws_region=us-east-1"
```

---

## 4. Post-Deployment: Upload Frontend to S3

Once Terraform outputs the created resources:

```powershell
# 1. Build React frontend
cd frontend
npm.cmd run build

# 2. Sync to S3 bucket created by Terraform
$Bucket = (terraform -chdir=../infrastructure/terraform output -raw frontend_s3_bucket)
aws s3 sync dist/ s3://$Bucket/ --delete

# 3. Access your live web application using the CloudFront URL
terraform -chdir=../infrastructure/terraform output -raw cloudfront_endpoint
```

---

## 5. Clean-Up / Destroying Resources

To delete all created cloud resources and avoid AWS charges:

```powershell
# 1. Empty S3 buckets first
$FrontendBucket = (terraform -chdir=infrastructure/terraform output -raw frontend_s3_bucket)
$ReportsBucket = (terraform -chdir=infrastructure/terraform output -raw scan_reports_s3_bucket)

aws s3 rm s3://$FrontendBucket/ --recursive
aws s3 rm s3://$ReportsBucket/ --recursive

# 2. Destroy via Terraform
cd infrastructure/terraform
terraform destroy -auto-approve
```
