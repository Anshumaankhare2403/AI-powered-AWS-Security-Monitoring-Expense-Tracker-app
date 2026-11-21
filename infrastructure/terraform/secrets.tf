# ==============================================================================
# AWS SECRETS MANAGER: PRODUCTION CREDENTIAL PERSISTENCE
# Secures Database URLs and Application JWT signing keys without hardcoding
# ==============================================================================

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.environment}-expense-tracker-credentials-${random_string.suffix.result}"
  description             = "Production environment credentials for FastAPI Backend and MySQL Database"
  recovery_window_in_days = 0

  tags = {
    Name        = "${var.environment}-expense-tracker-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets_val" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL = "mysql+pymysql://${var.db_username}:${var.db_password}@${aws_db_instance.mysql.endpoint}/${var.db_name}"
    DB_HOST      = aws_db_instance.mysql.address
    DB_PORT      = 3306
    DB_USER      = var.db_username
    DB_PASSWORD  = var.db_password
    DB_NAME      = var.db_name
    SECRET_KEY   = random_password.jwt_secret.result
    ALGORITHM    = "HS256"
  })
}
