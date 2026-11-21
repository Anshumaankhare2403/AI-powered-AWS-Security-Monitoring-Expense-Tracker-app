# Enterprise Expense Tracker & AI-Powered AWS Security Monitoring Platform

A modern, production-quality, enterprise-grade Expense Tracker application built with **React 19**, **Vite**, **Tailwind CSS**, **FastAPI**, **SQLAlchemy 2.0**, and **MySQL 8.0**, augmented by an **AI-powered AWS Security Monitoring & FinOps Architecture** leveraging **Amazon Bedrock Guardrails**, **Amazon GuardDuty**, **Amazon EventBridge**, and **AWS Lambda**.

---

## 🌟 Key Features

### 📊 Financial Management
- **Interactive SaaS Dashboard**: Real-time KPI summary cards (Total Balance, Income, Expenses, Monthly Savings, Savings Rate %).
- **Dynamic Charts**: Income vs. Expense bar comparisons, Category spending distribution donut chart, 30-day cashflow area wave, and spending leaderboards (powered by Recharts).
- **Transaction Engine**: Add, edit, delete, search, sort, and paginate transactions with decimal-precision arithmetic.
- **Category Customization**: 16 seeded default system categories plus custom user categories with color palette selection.
- **Budget Alerts**: Monthly category limits with automated warning thresholds (80%) and exceeded indicators (100%).
- **Savings Goals**: Milestone progress bars with contribution deposit history.
- **Financial Reports**: Monthly and yearly aggregation tables with direct one-click streaming exports to **CSV** and **PDF** (via ReportLab).
- **User Settings**: Profile updating, primary currency switcher (USD, EUR, GBP, INR, JPY, CAD, AUD), light/dark themes, and bcrypt password changes.

### 🛡️ AI-Powered AWS Cloud Architecture & FinOps
- **Amazon Bedrock Guardrails**: Input and output sanitization protecting against prompt injections, PII leakage (credit cards, AWS keys, emails), and toxic content.
- **Threat Detection**: Automated Amazon GuardDuty finding ingestion through Amazon EventBridge.
- **AI Remediation Scanner**: AWS Lambda invoking Foundation Models (Claude 3 Haiku / Titan) to assess cloud security risks and recommend FinOps remediations.
- **Live Cloud Security & FinOps Dashboard**: Built-in React view displaying real-time AWS infrastructure telemetry, active GuardDuty findings, Bedrock AI remediation advice, and archived S3 audit reports.
- **Isolated Relational Data Tier**: Amazon RDS MySQL 8.0 on AWS Graviton (`db.t4g.micro`) in isolated private subnets with AWS Secrets Manager credentials.
- **Perimeter Defense**: AWS WAFv2 with IP rate limiting and OWASP Top 10 Common Rules protecting CloudFront edge distributions.
- **Cost-Optimized FinOps Architecture**: Free VPC Gateway Endpoints for S3 & DynamoDB bypassing NAT Gateway data transfer surcharges.
- **Multi-Tenant Isolation**: Multi-tenant row-level access control preventing cross-user data exposure.
- **🎓 Comprehensive Exam & Viva Guide**: In-depth architecture defense and 25+ viva questions in [docs/CLOUD_INFRASTRUCTURE_EXAM_GUIDE.md](docs/CLOUD_INFRASTRUCTURE_EXAM_GUIDE.md).

---

## 🗂️ Project Directory Structure

```
AI-powered-AWS-Security-Monitoring-Expense-Tracker-app/
├── frontend/                     # React 19 + Vite + Tailwind CSS + Lucide + Recharts
│   ├── src/
│   │   ├── pages/                # Dashboard, Transactions, Categories, Budgets, Analytics, Goals, Reports, Security & FinOps, Settings, Auth
│   │   ├── layouts/              # Responsive AppLayout with Sidebar & Navigation
│   │   ├── context/              # AuthContext (JWT session & notification polling)
│   │   ├── services/             # Axios API client with automatic token refresh
│   │   ├── utils/                # Monetary & date formatters
│   │   └── App.jsx               # React Router DOM configuration & Route Guards
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── backend/                      # Python 3.11 FastAPI Backend
│   ├── app/
│   │   ├── api/                  # REST API Endpoints (Auth, Categories, Transactions, Budgets, Goals, Analytics, Reports, Notifications, Security)
│   │   ├── core/                 # Config, Security, JWT Bearer Token Rotation, Bcrypt
│   │   ├── models/               # SQLAlchemy 2.0 ORM Models (8 Relational Tables)
│   │   ├── schemas/              # Pydantic V2 Request & Response Validation Schemas
│   │   ├── database/             # Engine, SessionLocal, Seeder, and SQLite Fallback
│   │   └── main.py               # Application entrypoint & CORS
│   ├── tests/                    # Automated Pytest suite (full-coverage tests)
│   ├── requirements.txt
│   └── Dockerfile
│
├── infrastructure/               # AWS Infrastructure as Code (CloudFormation & Terraform)
│   ├── cloudformation/           # Modular & All-in-One CloudFormation Templates
│   │   ├── all-in-one.yml        # Complete architecture stack
│   │   ├── 01-vpc.yml            # Multi-AZ VPC & Subnets
│   │   ├── 02-storage-dynamo.yml # S3 Buckets & DynamoDB Table
│   │   ├── 03-bedrock-guardrails.yml # Amazon Bedrock AI Guardrails
│   │   ├── 04-compute-alb.yml    # Internal ALB & Auto Scaling Group
│   │   ├── 05-apigateway-cloudfront.yml # API Gateway & CloudFront CDN
│   │   ├── 06-guardduty-lambda-events.yml # GuardDuty, EventBridge & Lambda
│   │   └── main.yml              # Nested Master Stack
│   ├── terraform/                # Complete Modular Terraform HCL Stack
│   │   ├── main.tf               # Provider configuration & data lookups
│   │   ├── variables.tf          # Parameter declarations & validation rules
│   │   ├── outputs.tf            # Stack outputs (URLs, bucket names, ARNs)
│   │   ├── vpc.tf                # VPC, subnets, NAT Gateway & VPC Gateway Endpoints
│   │   ├── security_groups.tf    # ALB, EC2, VPC Link, and RDS security groups
│   │   ├── database.tf           # Amazon RDS MySQL 8.0 (AWS Graviton db.t4g.micro)
│   │   ├── secrets.tf            # AWS Secrets Manager credentials & JWT keys
│   │   ├── waf.tf                # AWS WAFv2 Web ACL (OWASP Top 10 & Rate Limiting)
│   │   ├── storage.tf            # S3 buckets (Lifecycle enabled) & DynamoDB table
│   │   ├── bedrock.tf            # Bedrock Guardrail & policy definitions
│   │   ├── compute.tf            # Internal ALB, ASG, Launch Template & IAM
│   │   ├── apigateway.tf         # HTTP API, VPC Link & integration
│   │   ├── cloudfront.tf         # CloudFront CDN, OAC & S3 bucket policy
│   │   └── monitoring_lambda.tf  # GuardDuty, EventBridge & Lambda scanner
│   ├── lambda/                   # AI Security Scanner Lambda (Claude 3 + Bedrock Guardrails)
│   └── scripts/                  # Deploy & validation scripts (deploy.ps1, deploy_tf.ps1, deploy_tf.sh)
│
├── database/
│   ├── schema.sql                # Complete MySQL 8.0 DDL Script
│   └── mysqldata/                # Dedicated local MySQL 8.0 data directory
│
├── docs/
│   ├── CLOUD_INFRASTRUCTURE_EXAM_GUIDE.md # 🎓 Comprehensive Cloud Exam & Viva Guide (25+ Q&As)
│   ├── AWS_ARCHITECTURE.md       # In-depth AWS Architecture Specification
│   ├── API_DOCUMENTATION.md      # Full REST API Reference & Request/Response examples
│   ├── DATABASE_DESIGN.md        # Relational ER diagrams & schema documentation
│   ├── TESTING_REPORT.md         # Comprehensive QA & test verification report
│   ├── CLOUDFORMATION_GUIDE.md   # Step-by-step CloudFormation deployment guide
│   ├── TERRAFORM_GUIDE.md        # Step-by-step Terraform deployment guide
│   └── Expense_Tracker_API.postman_collection.json # Postman Test Collection
│
├── .github/workflows/
│   ├── ci.yml                    # Full-Stack GitHub Actions CI Pipeline
│   └── aws-cloudformation-deploy.yml # AWS CloudFormation CI/CD Deployment
│
├── start-all.bat                 # One-click Master Launcher for Windows
├── start-all.ps1                 # One-click Master Launcher for PowerShell
├── run-backend.bat               # Standalone FastAPI Launcher
├── run-frontend.bat              # Standalone React Vite Launcher
├── run-mysql.bat                 # Standalone MySQL 8 Server Launcher
├── docker-compose.yml            # Docker Compose multi-service definition
├── AGENT_LOG.md                  # Milestone-by-milestone engineering log
└── README.md
```

---

## 🚀 Quick Start Guide

### Option A: One-Click Launch (All Services)
Double-click `start-all.bat` or run in PowerShell:
```powershell
.\start-all.ps1
```
This automatically starts:
1. **MySQL 8 Server** on `localhost:3307`
2. **FastAPI Backend** on `http://localhost:8000`
3. **React Vite Frontend** on `http://localhost:5173`

---

### Option B: Individual Service Launch

#### 1. MySQL 8 Database
```powershell
.\run-mysql.bat
```
*(Credentials: Host: `localhost:3307`, User: `tracker`, Password: `trackerpass`, Database: `expensetracker`)*
*(Note: If MySQL is not running, the backend automatically falls back to local SQLite storage seamlessly).*

#### 2. Backend API (FastAPI)
```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Swagger Interactive Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

#### 3. Frontend Web App (React + Vite)
```powershell
cd frontend
npm.cmd run dev
```
- Web Application: `http://localhost:5173`

---

## 🧪 Automated Testing & QA

Run the backend Pytest test suite:
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```
All **12 automated test cases pass** with 100% success rate:
- `test_database_connection`
- `test_database_tables_exist`
- `test_seeded_default_categories`
- `test_auth_me`
- `test_categories_api`
- `test_transaction_crud_and_analytics`
- `test_budgets_api`
- `test_savings_goals`
- `test_reports_and_export`
- `test_cross_user_isolation`
- `test_root_endpoint`
- `test_health_check_endpoint`

Validate AWS CloudFormation templates:
```powershell
python infrastructure/scripts/validate_cfn.py
```

Run Amazon Bedrock AI Lambda unit tests:
```powershell
python infrastructure/scripts/test_bedrock_lambda.py
```

---

## ☁️ Deploying to AWS (CloudFormation or Terraform)

### Option 1: Deploy with Terraform (Recommended for HCL workflows)

Deploy the entire infrastructure using Terraform:

```powershell
# Using the automated PowerShell deployment script
.\infrastructure\scripts\deploy_tf.ps1 -Action apply -Environment dev -Region us-east-1
```

Or deploy directly via Terraform CLI:
```bash
cd infrastructure/terraform
terraform init
terraform apply -auto-approve -var="environment=dev" -var="aws_region=us-east-1"
```

Refer to [docs/TERRAFORM_GUIDE.md](docs/TERRAFORM_GUIDE.md) for detailed inputs, state management, and teardown steps.

---

### Option 2: Deploy with AWS CloudFormation

To deploy using CloudFormation:

```powershell
# Using the PowerShell automated deploy script
.\infrastructure\scripts\deploy.ps1 -StackName "ExpenseTracker-Prod" -Environment "prod"
```

Or deploy directly via AWS CLI:
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/all-in-one.yml \
  --stack-name ExpenseTracker-Stack \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides Environment=prod DBPassword=YourSecurePassword123!
```

---

## 🐳 Docker Deployment

To launch all containers via Docker Compose:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- MySQL 8: `localhost:3307`
