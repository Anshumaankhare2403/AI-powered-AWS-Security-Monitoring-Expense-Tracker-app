# PowerShell Automated Deployment Script for Terraform
param (
    [string]$Action = "apply",
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TfDir = Join-Path (Split-Path -Parent $ScriptDir) "terraform"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   AI-Powered AWS Security & Expense Tracker" -ForegroundColor Cyan
Write-Host "   Terraform Infrastructure Deployment" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Action:      $Action" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region:      $Region" -ForegroundColor Yellow
Write-Host "Directory:   $TfDir" -ForegroundColor Yellow

# Verify Terraform is installed
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Error "Terraform CLI is not installed or not in PATH. Please install Terraform."
    exit 1
}

# Verify AWS CLI caller identity
try {
    $CallerIdentity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "AWS Account: $($CallerIdentity.Account) | ARN: $($CallerIdentity.Arn)" -ForegroundColor Green
} catch {
    Write-Warning "Could not verify AWS caller identity. Ensure your AWS credentials are configured via 'aws configure'."
}

Set-Location $TfDir

# Initialize Terraform
Write-Host "`n[1/3] Initializing Terraform..." -ForegroundColor Yellow
terraform init

# Validate configuration
Write-Host "[2/3] Validating Terraform configuration..." -ForegroundColor Yellow
terraform validate

# Execute Action
if ($Action -eq "plan") {
    Write-Host "`n[3/3] Generating Terraform execution plan..." -ForegroundColor Yellow
    terraform plan -var="environment=$Environment" -var="aws_region=$Region"
} elseif ($Action -eq "apply") {
    Write-Host "`n[3/3] Applying Terraform configuration..." -ForegroundColor Yellow
    terraform apply -auto-approve -var="environment=$Environment" -var="aws_region=$Region"

    Write-Host "`n=========================================================" -ForegroundColor Green
    Write-Host "  Terraform Deployment Complete!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
    terraform output
} elseif ($Action -eq "destroy") {
    Write-Host "`n[3/3] Destroying Terraform resources..." -ForegroundColor Red
    terraform destroy -auto-approve -var="environment=$Environment" -var="aws_region=$Region"
} else {
    Write-Error "Invalid action '$Action'. Choose from: plan, apply, destroy."
}
