<#
.SYNOPSIS
    Automated deployment script for AI-Powered AWS Security Monitoring & Expense Tracker.

.DESCRIPTION
    Validates and deploys the CloudFormation stack to AWS.
    Supports single-command deployment via AWS CLI.

.PARAMETER StackName
    Name of the CloudFormation stack. Default is 'expense-tracker-security-dev'.

.PARAMETER Environment
    Environment tag (dev, staging, prod). Default is 'dev'.

.PARAMETER Region
    Target AWS region. Default is 'us-east-1'.
#>

param (
    [string]$StackName = "expense-tracker-security-dev",
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AWS Security Monitoring & Expense Tracker Deployment" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Stack Name:  $StackName" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region:      $Region" -ForegroundColor Yellow

# Step 1: Check AWS CLI
try {
    $caller = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "`n[✓] AWS Identity verified: $($caller.Arn)" -ForegroundColor Green
} catch {
    Write-Host "`n[!] Error: AWS CLI is not configured or credentials have expired." -ForegroundColor Red
    Write-Host "Please run 'aws configure' before deploying." -ForegroundColor Yellow
    exit 1
}

# Step 2: Validate Template
$templatePath = Join-Path $PSScriptRoot "..\cloudformation\all-in-one.yml"
Write-Host "`n[*] Validating CloudFormation template: $templatePath..." -ForegroundColor Yellow
try {
    aws cloudformation validate-template --template-body "file://$templatePath" --region $Region | Out-Null
    Write-Host "[✓] Template validation successful!" -ForegroundColor Green
} catch {
    Write-Host "[!] Template validation failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy Stack
Write-Host "`n[*] Deploying CloudFormation stack '$StackName'..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file $templatePath `
    --stack-name $StackName `
    --parameter-overrides EnvironmentName=$Environment `
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
    --region $Region

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[✓] Stack deployed successfully!" -ForegroundColor Green

    # Retrieve Outputs
    Write-Host "`n--- Stack Outputs ---" -ForegroundColor Cyan
    aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query "Stacks[0].Outputs[*].[OutputKey, OutputValue]" `
        --output table
} else {
    Write-Host "`n[!] Stack deployment failed." -ForegroundColor Red
    exit 1
}
