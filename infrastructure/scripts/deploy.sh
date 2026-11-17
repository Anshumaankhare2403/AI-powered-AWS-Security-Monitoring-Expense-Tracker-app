#!/usr/bin/env bash
# Deploy script for AI-Powered AWS Security Monitoring & Expense Tracker
set -euo pipefail

STACK_NAME="${1:-expense-tracker-security-dev}"
ENVIRONMENT="${2:-dev}"
REGION="${3:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="${SCRIPT_DIR}/../cloudformation/all-in-one.yml"

echo "=========================================================="
echo "  AWS Security Monitoring & Expense Tracker Deployment"
echo "=========================================================="
echo "Stack Name:  ${STACK_NAME}"
echo "Environment: ${ENVIRONMENT}"
echo "Region:      ${REGION}"

# Step 1: Validate AWS identity
echo -e "\n[*] Checking AWS credentials..."
CALLER_ARN=$(aws sts get-caller-identity --query "Arn" --output text)
echo "[✓] Connected as: ${CALLER_ARN}"

# Step 2: Validate template
echo -e "\n[*] Validating CloudFormation template..."
aws cloudformation validate-template --template-body "file://${TEMPLATE_PATH}" --region "${REGION}" > /dev/null
echo "[✓] Template validation successful!"

# Step 3: Deploy stack
echo -e "\n[*] Deploying stack via aws cloudformation deploy..."
aws cloudformation deploy \
    --template-file "${TEMPLATE_PATH}" \
    --stack-name "${STACK_NAME}" \
    --parameter-overrides EnvironmentName="${ENVIRONMENT}" \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --region "${REGION}"

echo -e "\n[✓] CloudFormation deployment complete!"
echo -e "\n--- Outputs ---"
aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[*].[OutputKey, OutputValue]" \
    --output table
