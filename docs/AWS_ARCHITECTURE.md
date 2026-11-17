# AWS Cloud Architecture Specification

## AI-Powered AWS Security Monitoring & Expense Tracker Web Application

This document details the enterprise cloud architecture represented in the architecture diagram and implemented via CloudFormation infrastructure-as-code templates in this repository.

---

## Architecture Diagram Overview

```
                                      [ Amazon Route 53 (DNS) ]
                                                  |
                                                  v
                                     [ Amazon CloudFront (CDN) ]
                                     /                         \
                           (Default /*)                   (/api/* & /health)
                                 |                                 |
                                 v                                 v
                     [ Amazon S3 (Frontend) ]         [ Amazon API Gateway (HTTP API) ]
                                                                   |
                                                                   v
                                                        [ API Gateway VPC Link ]
                                                                   |
+-- Amazon VPC ----------------------------------------------------+--------------------------+
|                                                                  v                          |
|  +-- Public Subnets --------------------+    +-- Private Subnets ------------------------+  |
|  |                                      |    |                                           |  |
|  |  [ Application Load Balancer ] <-----+----+                                           |  |
|  |  (Internal ALB on Port 80)           |    |                                           |  |
|  |                                      |    |  [ Amazon EC2 Auto Scaling Group ]        |  |
|  |                                      |    |  (FastAPI Backend, Port 8000)             |  |
|  |                                      |    |  - Target Group Health Checks             |  |
|  |                                      |    |                                           |  |
|  |                                      |    |  [ AWS Lambda Function ] <-------------+  |  |
|  |                                      |    |  (Scan & Remediation)                  |  |  |
|  +--------------------------------------+    +----------------------------------------+--+--+
|                                                                                       |     |
+---------------------------------------------------------------------------------------+-----+
                                                                                        |
         +------------------------------------------------------------------------------+
         |                                                                              |
         v                                                                              v
[ Amazon GuardDuty ] (Threats)                                              [ Amazon EventBridge ]
         |                                                                  (Cron: rate(6 hours))
         +----------------------------------> [ AWS Lambda ] <--------------------------+
                                                     |
                 +-----------------------------------+-----------------------------------+
                 |                                                                       |
                 v                                                                       v
  [ Amazon Bedrock Guardrails ]                                            [ Amazon DynamoDB & S3 ]
  (Safety & Responsible AI)                                                - DynamoDB: SecurityFindingsTable
  - Content Filters (Hate, Violence, Misconduct)                           - S3: Scan Reports Bucket
  - Sensitive Info (PII Masking: Email, Phone, Cards)
  - Prompt-Attack & Injection Detection
  - Foundation Model (Claude 3 / Nova / Titan)
```

---

## 1. Perimeter, DNS & Edge Delivery
- **Amazon Route 53**: Resolves custom domain names and routes traffic to Amazon CloudFront with latency-based and failover routing.
- **Amazon CloudFront**:
  - Global Content Delivery Network (CDN) with TLS 1.3 encryption.
  - **Behavior 1 (`/*`)**: Serves the React 19 single-page application from an isolated S3 bucket protected by **CloudFront Origin Access Control (OAC)**. Rewrites 403/404 errors to `/index.html` for client-side routing.
  - **Behavior 2 (`/api/*` and `/health`)**: Proxies dynamic backend requests directly to Amazon API Gateway with query string and header forwarding (zero cache TTL).

---

## 2. API Gateway & VPC Link Layer
- **Amazon API Gateway (HTTP API)**:
  - Low-latency, cost-effective serverless API gateway.
  - Validates incoming requests and terminates public traffic.
- **VPC Link**:
  - Securely bridges API Gateway traffic into the private subnets of the VPC without exposing the Internal ALB to the public internet.

---

## 3. High Availability VPC Networking
- **Amazon VPC (`10.0.0.0/16`)**:
  - **Public Subnets (2 AZs)**: `10.0.1.0/24`, `10.0.2.0/24` with Internet Gateway and Elastic IP NAT Gateway.
  - **Private Subnets (2 AZs)**: `10.0.11.0/24`, `10.0.12.0/24` with default routes through the NAT Gateway.
- **Internal Application Load Balancer (ALB)**:
  - Deployed internally across subnets.
  - Distributes traffic to the backend instances on port 8000.
  - Target Group health checks monitor the `/health` endpoint every 30 seconds.

---

## 4. Compute & Auto Scaling Group
- **Amazon EC2 Launch Template**:
  - Amazon Linux 2023 with Python 3.11, systemd daemon management, and FastAPI backend service.
  - Protected with IAM instance profile (`AmazonSSMManagedInstanceCore`) enabling zero-bastion AWS Systems Manager Session Manager access.
- **Auto Scaling Group (ASG)**:
  - Min: 1, Max: 3, Desired: 1.
  - Automatically replaces unhealthy instances and scales up under CPU/network thresholds.

---

## 5. Threat Detection & Event Automation
- **Amazon GuardDuty**:
  - Continuous intelligent threat detection monitoring AWS CloudTrail, VPC Flow Logs, and DNS logs.
  - Detects compromised credentials, unauthorized port probes, and crypto-mining activity.
- **Amazon EventBridge**:
  - **Rule 1 (Real-Time Threat Rule)**: Filters for `source: ["aws.guardduty"]` and `detail-type: ["GuardDuty Finding"]`.
  - **Rule 2 (Scheduled Scan Rule)**: Fires automated 6-hour cron triggers (`rate(6 hours)`) to audit expenses, anomalies, and cloud resource configurations.

---

## 6. AI Security Analysis with Amazon Bedrock & Guardrails
- **AWS Lambda (`SecurityScannerFunction`)**:
  - Executes Python 3.11 runtime within private subnet or with VPC endpoint access.
  - Extracts threat attributes (severity, affected EC2 instance, IP address, finding type).
- **Amazon Bedrock Guardrails (`ExpenseTrackerSecurityGuardrail`)**:
  - **Input Evaluation**: Sanitizes input prompts, masks PII (emails, phone numbers, AWS access keys), and thwarts prompt injections.
  - **Foundation Model**: Invokes Anthropic Claude 3 Haiku or Amazon Nova/Titan to generate actionable root-cause analysis and automated remediation steps.
  - **Output Evaluation**: Filters potential model hallucinations, policy leaks, or sensitive financial data before persisting results.

---

## 7. Storage, Findings & Reports
- **Amazon DynamoDB (`SecurityFindingsTable`)**:
  - Low-latency NoSQL table storing processed security findings, AI analysis, severity ratings, and remediation status.
  - Key schema: Partition Key `finding_id`, Sort Key `timestamp`.
  - Global Secondary Index: `StatusIndex` on `status` and `timestamp`.
- **Amazon S3 (`ScanReportsBucket`)**:
  - Encrypted with AES-256 server-side encryption.
  - Stores formatted JSON and Markdown audit reports generated by the Lambda scanner for compliance and FinOps audits.
- **Amazon S3 (`FrontendBucket`)**:
  - Dedicated hosting bucket for Vite React build artifacts.

---

## 8. CI/CD & Infrastructure as Code (IaC)
- **GitHub**: Source code repository tracking application and infrastructure code.
- **GitHub Actions**:
  - Runs automated test suites (`pytest`, `cfn-lint`, `npm run build`).
  - Deploys CloudFormation stack via AWS credentials.
  - Synchronizes frontend build to the S3 bucket.
