# AWS Cloud Infrastructure & Architecture Comprehensive Exam Guide

> **Prepared for Academic Defense, Cloud Computing Examinations, and Technical Architecture Viva.**
> This document details every architectural decision, security boundary, FinOps cost-optimization strategy, and oral examination questions with model answers.

---

## Table of Contents
1. [Executive Architecture Overview](#1-executive-architecture-overview)
2. [End-to-End Request Flow & Network Topology](#2-end-to-end-request-flow--network-topology)
3. [AWS Well-Architected Framework (6-Pillar Alignment)](#3-aws-well-architected-framework-6-pillar-alignment)
4. [FinOps & Cost Optimization Breakdown](#4-finops--cost-optimization-breakdown)
5. [Cloud Security & Zero-Trust Defense-in-Depth](#5-cloud-security--zero-trust-defense-in-depth)
6. [AI Security & Bedrock Guardrails Engineering](#6-ai-security--bedrock-guardrails-engineering)
7. [High Availability & Disaster Recovery (HA/DR)](#7-high-availability--disaster-recovery-hadr)
8. [25+ High-Yield Cloud Exam / Viva Questions & Model Answers](#8-25-high-yield-cloud-exam--viva-questions--model-answers)

---

## 1. Executive Architecture Overview

This platform implements an enterprise **3-Tier Cloud Architecture** augmented by a **Serverless AI Security & FinOps Automation Loop**.

```
[ Client Browser ]
        │
        ▼
[ AWS WAF (Web ACL Rate Limiting & OWASP Core) ]
        │
        ▼
[ Amazon CloudFront CDN (Global Edge Delivery + TLS 1.3) ]
        ├─────────────────────────────────────────┐
        │ Behavior: Default /*                    │ Behavior: /api/* & /health
        ▼                                         ▼
[ Amazon S3 (Static Frontend) ]          [ Amazon API Gateway (HTTP API v2) ]
  (Enforced CloudFront OAC)                       │
                                                  ▼
                                         [ API Gateway VPC Link ]
                                                  │
┌─ Amazon VPC (10.0.0.0/16 Multi-AZ) ────────────┼────────────────────────────────────────────────────────┐
│                                                 ▼                                                        │
│  ┌─ Public Subnets (AZ-a & AZ-b) ─────────────────────────────────────────────────────────────────────┐  │
│  │  - Internet Gateway (IGW)                                                                          │  │
│  │  - NAT Gateway (Elastic IP)                                                                        │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────────────┘  │
│                                                 │                                                        │
│  ┌─ Private Subnets: Compute Tier (AZ-a & AZ-b) ▼ ──────────────────────────────────────────────────┐  │
│  │                                                                                                    │  │
│  │   [ Internal Application Load Balancer (ALB) ] (Port 80)                                           │  │
│  │         │                                                                                          │  │
│  │         ▼                                                                                          │  │
│  │   [ EC2 Auto Scaling Group ] (FastAPI Python 3.11 Backend, Port 8000)                              │  │
│  │   - AWS Secrets Manager integration for database credentials                                       │  │
│  │   - AWS Systems Manager (SSM) Session Manager (Zero Bastion)                                       │  │
│  │   - VPC Gateway Endpoints to S3 & DynamoDB (Free, bypasses NAT Gateway)                            │  │
│  │                                                                                                    │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────────────┘  │
│                                                 │                                                        │
│  ┌─ Isolated Data Subnets (AZ-a & AZ-b - Zero Route to Internet/NAT) ────────────────────────────────┐  │
│  │                                              ▼                                                     │  │
│  │   [ Amazon RDS MySQL 8.0 ] (AWS Graviton db.t4g.micro, gp3 Encrypted)                              │  │
│  │   - Port 3306 ingress strictly restricted to EC2 Security Group                                    │  │
│  │   - Automated daily snapshots, KMS encryption at rest                                              │  │
│  │                                                                                                    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─ Threat Detection & Autonomous AI Security Loop ─────────────────────────────────────────────────────────┐
│                                                                                                          │
│   [ Amazon GuardDuty ] (Continuous VPC Flow Logs & DNS Threat Ingestion)                                 │
│            │                                                                                             │
│            ▼ (Event: GuardDuty Finding)                                                                  │
│   [ Amazon EventBridge ] ◄────────── (Cron Event: rate(6 hours) for FinOps Scan)                         │
│            │                                                                                             │
│            ▼                                                                                             │
│   [ AWS Lambda Security Scanner ]                                                                        │
│            │                                                                                             │
│            ├─► [ Amazon Bedrock Guardrails ] (Input PII Masking & Prompt Attack Defense)                 │
│            │         │                                                                                   │
│            │         ▼                                                                                   │
│            ├─► [ Amazon Bedrock Foundation Model ] (Anthropic Claude 3 Haiku / Titan)                    │
│            │         │ (Outputs Root Cause Analysis, Severity, and FinOps Remediation Steps)             │
│            │         ▼                                                                                   │
│            ├─► [ Amazon DynamoDB (SecurityFindingsTable) ] (Pay-Per-Request Persistence)                 │
│            │                                                                                             │
│            └─► [ Amazon S3 (ScanReportsBucket) ] (Lifecycle: 30d Standard-IA, 90d Expire)                │
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End Request Flow & Network Topology

### Scenario A: User Navigating the Web Application
1. **DNS Resolution**: Client sends request for domain; resolved to **Amazon CloudFront** edge location.
2. **Perimeter Inspection**: **AWS WAF** inspects request against IP rate limits (max 500 req/5 min) and OWASP Top 10 rules.
3. **Static Content (`/*`)**:
   - CloudFront serves cached assets (HTML, CSS, JS) from regional edge caches.
   - Cache miss: CloudFront signs request using **SigV4 Origin Access Control (OAC)** and retrieves asset from private **Amazon S3 Frontend Bucket**.
   - Client-side routing: HTTP 403/404 responses are rewritten to `/index.html` with HTTP 200 to allow React Router DOM client navigation.

### Scenario B: Dynamic API Invocation (`/api/*`, `/health`)
1. **Edge Forwarding**: CloudFront recognizes `/api/*` path pattern, bypasses cache (`TTL=0`), forwards headers, cookies, and query strings to **Amazon API Gateway HTTP API v2**.
2. **Private Transit**: API Gateway uses a private **VPC Link** connected to private subnets, tunneling traffic into the VPC.
3. **Internal Load Balancing**: The VPC Link delivers traffic to the **Internal Application Load Balancer (ALB)** on port 80.
4. **Compute Target**: Internal ALB forwards traffic across private subnets to healthy instances in the **EC2 Auto Scaling Group** on port 8000.
5. **Database Query**: Backend retrieves credentials dynamically from **AWS Secrets Manager**, connects over private isolated subnets to **Amazon RDS MySQL 8.0** on port 3306.
6. **Telemetry & Findings**: Backend queries the **Amazon DynamoDB SecurityFindingsTable** via a **free VPC Gateway Endpoint**, retrieving live threat findings and Bedrock AI remediation advice.

---

## 3. AWS Well-Architected Framework (6-Pillar Alignment)

| Pillar | Architectural Implementation in this Project |
| :--- | :--- |
| **1. Operational Excellence** | Infrastructure defined 100% as code (**Terraform** & **CloudFormation**). Automated CI/CD pipelines via GitHub Actions. Health check probes (`/health`) on Target Groups with auto-recovery in ASG. |
| **2. Security** | Zero-trust subnet isolation (Public, Private, Isolated DB). AWS WAF edge filtering. Bedrock Guardrails PII masking. AWS Secrets Manager credential management. S3 OAC blocking direct public access. IAM least privilege. |
| **3. Reliability** | Multi-AZ deployment across 2 Availability Zones (`us-east-1a`, `us-east-1b`). Auto Scaling Group (Min 1, Max 3) with automatic instance replacement. RDS automated snapshots and multi-AZ support. |
| **4. Performance Efficiency** | CloudFront CDN offloads 85%+ of static traffic from origin. AWS Graviton (`t4g.micro`) ARM-based compute for RDS (up to 40% better price/performance over x86). API Gateway HTTP API v2 offers lower latency than REST APIs. |
| **5. Cost Optimization (FinOps)** | Free VPC Gateway Endpoints for S3 & DynamoDB. Graviton RDS instance. S3 Lifecycle expiration (90 days). DynamoDB Pay-Per-Request (zero idle cost). Claude 3 Haiku for high-speed, cost-effective inference. |
| **6. Sustainability** | Graviton processors consume up to 60% less energy than comparable x86 processors. Auto Scaling shrinks compute footprint during low-traffic periods. CloudFront caching avoids redundant origin server compute cycles. |

---

## 4. FinOps & Cost Optimization Breakdown

### Monthly Cost Estimation Table (us-east-1)

| AWS Service | Configuration / Tier | Estimated Monthly Cost (Idle / Dev) | Estimated Monthly Cost (Active / Prod) | FinOps Optimization Strategy Applied |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon CloudFront** | 10 GB Data Transfer Out, 100,000 requests | **$0.00** (Free Tier) | $2.50 | 1 TB/month free tier permanently available. |
| **AWS WAFv2** | 1 Web ACL, 3 Rules, 100,000 requests | $5.00 | $7.00 | Targeted rate-limiting prevents costly DDoS compute spikes. |
| **Amazon S3** | Frontend & Scan Reports (~2 GB) | $0.05 | $0.25 | **S3 Lifecycle Rule**: 30-day transition to Standard-IA, 90-day expire. |
| **Amazon API Gateway** | HTTP API v2 (100,000 requests) | $0.10 | $1.00 | **HTTP API v2** is 70% cheaper than traditional REST APIs ($1.00 vs $3.50/M). |
| **NAT Gateway** | 1 NAT Gateway (Single AZ for dev) | $32.40 | $64.80 (Multi-AZ) | **VPC Gateway Endpoints** route S3 & DynamoDB traffic for FREE, saving data charges. |
| **Internal ALB** | 1 Load Balancer, 0.5 LCU | $18.00 | $22.50 | Health checks tuned to 30s intervals to minimize synthetic traffic. |
| **EC2 Backend (ASG)** | 1x `t3.micro` (2 vCPU, 1 GB RAM) | $7.49 (or $0 Free Tier) | $22.47 (3 instances peak) | ASG scales to minimum 1 instance; can use EC2 Spot instances for 70% savings. |
| **Amazon RDS MySQL** | 1x `db.t4g.micro` (AWS Graviton2, 20GB gp3) | $12.41 | $24.82 (Multi-AZ) | **Graviton2** provides 20% lower hourly cost than `db.t3.micro`. |
| **Amazon DynamoDB** | Pay-Per-Request (`PAY_PER_REQUEST`) | **$0.00** (Within 25 RCU/WCU free) | $0.50 | On-demand billing means zero spend when no security findings occur. |
| **Amazon Bedrock** | Claude 3 Haiku (~500 scans/month) | $0.15 | $1.50 | **Claude 3 Haiku** ($0.25/M input, $1.25/M output) vs Sonnet ($3.00/M input). |
| **Amazon GuardDuty** | CloudTrail, VPC Flow & DNS events | $1.50 | $5.00 | 30-day free trial on new accounts; 15-minute finding batching. |
| **AWS Secrets Manager**| 1 Secret (App Credentials) | $0.40 | $0.40 | Single JSON secret containing all keys minimizes per-secret charges. |
| **VPC Gateway Endpoints**| S3 & DynamoDB Gateway Endpoints | **$0.00 (100% Free)** | **$0.00 (100% Free)** | Completely eliminates NAT Gateway data processing fees ($0.045/GB). |
| **Total Estimated Cost**| | **~$77.50 / month** | **~$152.00 / month** | **All components optimized for minimum cost per workload unit.** |

---

## 5. Cloud Security & Zero-Trust Defense-in-Depth

### The 4 Security Boundaries
```
Internet
   │  [Boundary 1: AWS WAF + CloudFront]
   ▼  - Rate limits: 500 req / 5 min
Edge  - OWASP Top 10 Common Rule Set
   │  - Strict HTTPS / TLS 1.3 enforced
   ▼  [Boundary 2: API Gateway + VPC Link]
VPC   - No direct public IP on ALB or EC2
   │  - API Gateway validates incoming requests before private VPC transit
   ▼  [Boundary 3: Security Group Chaining]
Compute - ALB SG allows ingress from VPC Link SG only
   │    - EC2 SG allows ingress from ALB SG on port 8000 only
   ▼  [Boundary 4: Isolated Data Tier]
Database - RDS SG allows ingress strictly from EC2 SG on port 3306
         - Database subnets have NO route to Internet Gateway or NAT Gateway
```

---

## 6. AI Security & Bedrock Guardrails Engineering

### Why Amazon Bedrock Guardrails?
Standard LLMs are vulnerable to **prompt injection attacks**, **data poisoning**, and accidental **PII leakage**. The `ExpenseTrackerSecurityGuardrail` acts as a deterministic security filter before and after foundation model execution:

1. **Input Sanitization**:
   - **Prompt Attack Filter (`PROMPT_ATTACK: HIGH`)**: Detects and aborts prompt overrides, jailbreaks, and system prompt exfiltration attempts.
   - **PII Anonymization / Blocking**: Automatically masks `EMAIL`, `PHONE`, and `IP_ADDRESS`; immediately blocks `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `CREDIT_DEBIT_CARD_NUMBER`, and `US_BANK_ACCOUNT_NUMBER`.
   - **Denied Topics**: Blocks queries requesting administrative credentials, system passwords, or authorization bypasses.
2. **Output Sanitization**:
   - Evaluates the Claude 3 response to verify that no internal infrastructure secrets or toxic content are hallucinated.
3. **Structured FinOps Feedback**:
   - The foundation model returns structured JSON with `severity_level`, `risk_analysis`, `financial_impact`, and `remediation_steps`, which are saved in DynamoDB and visualized on the frontend.

---

## 7. High Availability & Disaster Recovery (HA/DR)

- **Recovery Point Objective (RPO)**:
  - RDS MySQL automated backups with 5-minute point-in-time recovery (PITR).
  - DynamoDB Continuous Backups with Point-in-Time Recovery enabled.
  - S3 Versioning enabled on both frontend and scan reports buckets.
- **Recovery Time Objective (RTO)**:
  - EC2 instance failure: Target Group health checks detect unhealthy instance within 60s; ASG launches a replacement within 2 minutes.
  - Availability Zone outage: Traffic automatically redirected to second AZ via ALB and API Gateway VPC Link.
  - RDS Multi-AZ: Automated failover to standby replica in under 60 seconds with zero manual DNS changes.

---

## 8. 25+ High-Yield Cloud Exam / Viva Questions & Model Answers

### Q1: Why is an API Gateway placed in front of an Internal Application Load Balancer instead of making the ALB public?
> **Answer**: Placing Amazon API Gateway in front of an Internal ALB using a **VPC Link** provides several key architectural advantages:
> 1. **Zero Public Attack Surface**: The ALB resides entirely within private subnets and has no public IPv4 address, making direct internet-based port probing impossible.
> 2. **Decoupling & Traffic Management**: API Gateway provides managed throttling, request validation, API key authentication, and telemetry before traffic ever reaches the private network.
> 3. **Native CloudFront Integration**: Enables clean separation of static SPA hosting (S3) and dynamic API routing (`/api/*`) through a unified domain.

### Q2: What is the difference between CloudFront Origin Access Control (OAC) and Origin Access Identity (OAI)? Why did you use OAC?
> **Answer**: **Origin Access Control (OAC)** is AWS’s modern replacement for legacy OAI. OAC supports:
> 1. Full AWS Signature Version 4 (SigV4) request signing.
> 2. All S3 buckets in all AWS regions (including regions launched after 2019 that require SigV4).
> 3. Server-side encryption with AWS KMS (SSE-KMS), which legacy OAI cannot access.
> 4. Dynamic HTTP methods (PUT, POST, DELETE) to S3 origins.
> We configured OAC to ensure that direct access to the S3 frontend bucket is blocked; only CloudFront can read bucket objects.

### Q3: What are VPC Gateway Endpoints, and how do they optimize costs?
> **Answer**: A **VPC Gateway Endpoint** provides a direct, highly reliable route from within a VPC to Amazon S3 or Amazon DynamoDB without traversing the Internet Gateway or NAT Gateway.
> - **Cost Optimization**: AWS charges **$0.00** (100% free) for Gateway Endpoints, whereas NAT Gateways incur a **$0.045/GB data processing charge**. Routing large S3 scan reports and high-volume DynamoDB queries through Gateway Endpoints saves significant bandwidth costs and reduces latency.

### Q4: Why did you choose Amazon RDS MySQL on `db.t4g.micro` instead of running MySQL inside an EC2 container?
> **Answer**:
> 1. **Separation of Concerns**: Compute is stateless and scalable; database storage is stateful. Running MySQL on EC2 instances inside an Auto Scaling Group would cause data corruption and state loss when instances terminate during scale-in.
> 2. **Managed Lifecycle**: RDS provides automated patch management, automated daily backups with point-in-time recovery, storage auto-scaling, and optional Multi-AZ synchronous replication.
> 3. **FinOps Efficiency**: `db.t4g.micro` runs on custom **AWS Graviton2** ARM processors, delivering up to 20% lower hourly cost and up to 40% better price/performance compared to x86-based `db.t3.micro`.

### Q5: How do AWS Secrets Manager and IAM eliminate hardcoded credentials in this architecture?
> **Answer**:
> 1. The database master password and JWT encryption key are generated by Terraform and stored directly in **AWS Secrets Manager**.
> 2. The EC2 instances are assigned an **IAM Instance Profile** (`ExpenseTrackerEC2InstanceProfile`) with explicit read permission (`secretsmanager:GetSecretValue`) strictly scoped to the secret ARN.
> 3. During instance launch, the UserData bootstrap script calls the AWS CLI to retrieve the connection string into memory and inject it as environment variables into the systemd service. No plain-text passwords exist in git repositories or launch templates.

### Q6: How does Amazon Bedrock Guardrails protect the application from Prompt Injection?
> **Answer**:
> Amazon Bedrock Guardrails applies a machine-learning-based **Prompt Attack Filter** with strength set to `HIGH`. When incoming security summaries or user queries contain injection signatures (such as "Ignore previous instructions", "Output system prompt", or shell command overrides), the Guardrail intercepts the prompt with status `GUARDRAIL_INTERVENED` before the prompt is forwarded to the Claude 3 model. The system returns a safe, pre-configured blocked response.

### Q7: Explain Security Group Chaining in this architecture.
> **Answer**:
> Security Group Chaining means referencing another Security Group ID instead of IP CIDR ranges in ingress rules.
> 1. `alb_sg` allows port 80 only from the VPC CIDR (or `vpclink_sg`).
> 2. `ec2_sg` allows port 8000 ingress strictly from `source: aws_security_group.alb_sg.id`.
> 3. `db_sg` allows port 3306 ingress strictly from `source: aws_security_group.ec2_sg.id`.
> Even if an unauthorized host enters the VPC private subnets, it cannot connect to the database because it lacks membership in `ec2_sg`.

### Q8: What happens when an EC2 instance in the Auto Scaling Group becomes unhealthy?
> **Answer**:
> 1. The Internal ALB Target Group performs HTTP health checks against `/health` every 30 seconds.
> 2. If the health check fails 2 consecutive times (Unhealthy Threshold = 2), the ALB stops routing new traffic to that instance.
> 3. The Auto Scaling Group receives the unhealthy notification (via `HealthCheckType: ELB`), marks the instance for termination, drains active connections, terminates the instance, and automatically launches a new instance from the Launch Template.

### Q9: Why is the DynamoDB table configured with `PAY_PER_REQUEST` billing mode?
> **Answer**:
> In `PAY_PER_REQUEST` (on-demand) mode:
> 1. There are zero hourly capacity charges when the system is idle.
> 2. It accommodates unpredictable spikes in security findings (e.g. during an ongoing GuardDuty port probe) without requiring manual capacity planning or auto-scaling alarms.
> 3. Under the AWS Free Tier, the first 25 Read and Write Capacity Units are free, making it ideal for event-driven architectures.

### Q10: How does Amazon EventBridge route GuardDuty threats to AWS Lambda?
> **Answer**:
> 1. Amazon GuardDuty publishes threat findings to EventBridge under the default event bus.
> 2. An EventBridge rule filters for `source: ["aws.guardduty"]` and `detail-type: ["GuardDuty Finding"]`.
> 3. When matched, EventBridge asynchronously invokes the `SecurityScannerFunction` Lambda with the JSON payload.
> 4. An additional EventBridge scheduled rule (`rate(6 hours)`) fires periodic cron events to trigger autonomous FinOps compliance scans.

### Q11: What is the purpose of S3 Bucket Lifecycle Configurations in FinOps?
> **Answer**:
> Cloud audit logs and security scan reports accumulate over time, increasing storage costs. We configured an `aws_s3_bucket_lifecycle_configuration` rule that:
> 1. Transitions objects older than 30 days to **S3 Standard-Infrequent Access (Standard-IA)**, saving ~40% on storage costs.
> 2. Automatically permanently expires (deletes) objects older than 90 days, preventing runaway storage debt.

### Q12: Why is AWS WAF deployed in the `us-east-1` region specifically?
> **Answer**:
> Amazon CloudFront is a global edge service. When associating an **AWS WAFv2 Web ACL** with a CloudFront distribution, the Web ACL must have its scope set to `CLOUDFRONT`, and AWS requires all CloudFront-scoped Web ACLs to be provisioned in the **`us-east-1` (N. Virginia)** region, from where AWS replicates the rules to 600+ edge locations worldwide.

### Q13: How does the React Vite SPA handle browser page refreshes when hosted on Amazon S3?
> **Answer**:
> Since React Router uses client-side routing (e.g., `/transactions`, `/security`), a browser refresh causes the browser to request an S3 object key like `s3://bucket/transactions`. Because no such file exists on S3, S3 returns HTTP 403 or 404.
> - **Solution**: We configured CloudFront `custom_error_response` rules for both 403 and 404 with `response_code = 200` and `response_page_path = "/index.html"`. CloudFront returns `index.html` with a 200 OK status, and the React client-side router parses the URL and renders the correct view.

### Q14: What is the role of AWS Systems Manager (SSM) Session Manager in this architecture?
> **Answer**:
> The EC2 IAM Role includes `AmazonSSMManagedInstanceCore`. This allows DevOps engineers to open encrypted shell sessions into the backend instances directly via the AWS Console or AWS CLI **without**:
> 1. Opening inbound SSH port 22 in Security Groups.
> 2. Deploying a public Bastion / Jump Host.
> 3. Managing and rotating SSH private key pairs (`.pem` files).

### Q15: Why did you use Anthropic Claude 3 Haiku instead of Claude 3 Opus or GPT-4 for the security scanner?
> **Answer**:
> 1. **Latency**: Claude 3 Haiku generates structured JSON responses in sub-second timeframes, allowing the Lambda function to complete within a 60-second execution envelope.
> 2. **FinOps Cost**: Claude 3 Haiku costs **$0.25 per million input tokens** and **$1.25 per million output tokens**, which is ~60x cheaper than Claude 3 Opus. For repetitive threat summarization and FinOps auditing, Haiku provides the optimal accuracy-to-cost ratio.

### Q16: How does the system prevent cross-user data leakage in multi-tenant environments?
> **Answer**:
> Multi-tenancy is enforced at both the API and ORM database levels:
> 1. The FastAPI dependency `get_current_user` extracts the JWT bearer token, validates its signature, and resolves the user ID.
> 2. Every SQLAlchemy query explicitly filters by `user_id = current_user.id`.
> 3. Automated Pytest test `test_cross_user_isolation` verifies that User A cannot read, modify, or delete categories, transactions, or budgets created by User B.

### Q17: What is the purpose of the Database Subnet Group having subnets in two Availability Zones?
> **Answer**:
> Amazon RDS requires a DB Subnet Group to span at least **two distinct Availability Zones** within the selected VPC. Even when running a Single-AZ RDS instance, this requirement enables seamless one-click promotion to a Multi-AZ standby replica without recreating the subnet group or interrupting the database.

### Q18: What is the purpose of the S3 Versioning configuration on both buckets?
> **Answer**:
> S3 Versioning preserves every version of an object uploaded to the bucket.
> 1. **Disaster Recovery**: Protects against accidental overwrites or malicious deletions (ransomware defense).
> 2. **Audit Compliance**: Maintains an immutable timeline of security reports generated over time.

### Q19: Why are backend instances placed in Private Subnets rather than Public Subnets with Elastic IPs?
> **Answer**:
> Instances in Private Subnets have no public IPv4 addresses and cannot be reached directly from the internet. They can only initiate outbound connections to the internet (for software updates or external APIs) through the **NAT Gateway**. This prevents port scanning, direct OS-level attacks, and unauthenticated traffic from reaching the compute tier.

### Q20: How does this architecture achieve Zero-Downtime deployments?
> **Answer**:
> 1. **Frontend**: CloudFront serves static files with versioned asset hashes (`index-[hash].js`). New builds are synced to S3 and an invalidation is issued, instantly updating users without downtime.
> 2. **Backend**: The Auto Scaling Group supports **Rolling Updates** (`AutoScalingRollingUpdate`). New EC2 instances are launched, registered with the Target Group, pass `/health` checks, and only then are old instances drained and terminated.

### Q21: What is the difference between AWS GuardDuty and AWS WAF?
> **Answer**:
> - **AWS WAF**: An active **Layer 7 inline firewall** inspecting HTTP/S requests at the edge in real time, blocking malicious payloads (SQL injection, XSS, rate violations) before they reach the backend.
> - **Amazon GuardDuty**: A passive **intelligent threat detection service** that analyzes CloudTrail management events, VPC Flow Logs, and DNS query logs using machine learning to detect compromised credentials, rogue EC2 instances, and internal anomalies.

### Q22: What are the trade-offs of deploying a single NAT Gateway instead of Multi-AZ NAT Gateways?
> **Answer**:
> - **Trade-off**: A single NAT Gateway in `public_subnet_1` costs ~$32.40/month. A Multi-AZ setup requires one NAT Gateway per AZ (~$64.80/month for 2 AZs).
> - **Decision**: For development/testing environments, a single NAT Gateway is the recommended FinOps practice to reduce baseline cost. For high-availability production environments, one NAT Gateway per AZ is required so that an outage in AZ-1 does not sever internet connectivity for private instances in AZ-2.

### Q23: How does the application prevent IEEE 754 floating-point errors in financial transactions?
> **Answer**:
> Floating-point types (`FLOAT` or `DOUBLE`) introduce rounding inaccuracies (e.g., `0.1 + 0.2 = 0.30000000000000004`). The application enforces:
> 1. Database level: MySQL column `DECIMAL(12, 2)` storing exact fixed-point numbers.
> 2. Backend level: Python standard library `decimal.Decimal` in SQLAlchemy and Pydantic schemas.
> 3. Frontend level: Explicit monetary formatting with `Intl.NumberFormat`.

### Q24: What is the difference between an HTTP API and a REST API in Amazon API Gateway?
> **Answer**:
> - **HTTP API (API Gateway v2)**: Designed for low latency and high cost-efficiency. It supports OIDC/OAuth2, native CORS, and VPC Links to private ALBs. It is up to **70% cheaper** and delivers lower p99 latency compared to REST APIs.
> - **REST API (API Gateway v1)**: Supports legacy features like API keys with usage plans, request validation via JSON schema models, and AWS WAF integration directly on the stage (though WAF is handled at the CloudFront layer in our architecture).

### Q25: If you had to scale this architecture to 1 million daily active users, what 3 changes would you make?
> **Answer**:
> 1. **Compute**: Migrate from EC2 ASG to **AWS ECS Fargate** with container auto-scaling and warm pools for instantaneous horizontal scaling.
> 2. **Caching**: Introduce an **Amazon ElastiCache (Redis)** cluster in private subnets to cache expensive financial analytics aggregations and user sessions, reducing RDS read load by 80%+.
> 3. **Database**: Upgrade from single RDS MySQL to **Amazon Aurora Serverless v2** with Multi-AZ Read Replicas, offloading read-heavy dashboard and reporting traffic.
