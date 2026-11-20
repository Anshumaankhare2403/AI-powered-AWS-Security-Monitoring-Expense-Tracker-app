#!/usr/bin/env bash
# Automated Bash Deployment Script for Terraform
set -e

ACTION=${1:-apply}
ENVIRONMENT=${2:-dev}
REGION=${3:-us-east-1}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform"

echo "========================================================="
echo "   AI-Powered AWS Security & Expense Tracker"
echo "   Terraform Infrastructure Deployment"
echo "========================================================="
echo "Action:      $ACTION"
echo "Environment: $ENVIRONMENT"
echo "Region:      $REGION"
echo "Directory:   $TF_DIR"

command -v terraform >/dev/null 2>&1 || { echo "Terraform is not installed. Aborting." >&2; exit 1; }

cd "$TF_DIR"

echo -e "\n[1/3] Initializing Terraform..."
terraform init

echo -e "[2/3] Validating Terraform configuration..."
terraform validate

if [ "$ACTION" == "plan" ]; then
    echo -e "\n[3/3] Running terraform plan..."
    terraform plan -var="environment=$ENVIRONMENT" -var="aws_region=$REGION"
elif [ "$ACTION" == "apply" ]; then
    echo -e "\n[3/3] Applying terraform configuration..."
    terraform apply -auto-approve -var="environment=$ENVIRONMENT" -var="aws_region=$REGION"
    echo "========================================================="
    echo "  Terraform Deployment Complete!"
    echo "========================================================="
    terraform output
elif [ "$ACTION" == "destroy" ]; then
    echo -e "\n[3/3] Destroying terraform resources..."
    terraform destroy -auto-approve -var="environment=$ENVIRONMENT" -var="aws_region=$REGION"
else
    echo "Unknown action $ACTION. Use plan, apply, or destroy."
    exit 1
fi
