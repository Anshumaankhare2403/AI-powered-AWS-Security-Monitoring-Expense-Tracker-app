# ==============================================================================
# AMAZON RDS MYSQL 8.0 DATABASE INSTANCE (ISOLATED DATA TIER)
# ==============================================================================

resource "aws_db_parameter_group" "mysql_params" {
  name        = "${var.environment}-mysql8-custom-params"
  family      = "mysql8.0"
  description = "Custom parameter group with utf8mb4 character set for Expense Tracker"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  parameter {
    name  = "max_connections"
    value = "150"
  }

  tags = {
    Name = "${var.environment}-mysql8-params"
  }
}

resource "aws_db_instance" "mysql" {
  identifier             = "${var.environment}-expense-tracker-mysql"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = 50
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  parameter_group_name   = aws_db_parameter_group.mysql_params.name

  publicly_accessible = false
  multi_az            = var.environment == "prod" ? true : false

  backup_retention_period   = var.environment == "prod" ? 7 : 1
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:30-sun:05:30"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot     = true
  deletion_protection       = var.environment == "prod" ? true : false
  skip_final_snapshot       = true

  tags = {
    Name        = "${var.environment}-expense-tracker-mysql"
    Environment = var.environment
    Tier        = "DataTier"
  }
}
