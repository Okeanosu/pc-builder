############################################
# RDS PostgreSQL
############################################

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

# Bootstrap only: RDS needs a master password at creation. scripts/secrets.sh replaces it right after the first
# apply (modify-db-instance) with the value it keeps in Parameter Store, so the one in terraform.tfstate is dead.
resource "random_password" "db_bootstrap" {
  length  = 40
  special = false
}

# trivy:ignore:AVD-AWS-0176 (the app signs in with a password; IAM tokens expire every 15 minutes and would need a refresher)
resource "aws_db_instance" "main" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  db_name  = "pcbuilder"
  username = "pc"
  password = random_password.db_bootstrap.result

  allocated_storage     = var.db_storage_gb
  max_allocated_storage = var.db_storage_gb * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  # Daily snapshots with point-in-time restore for 7 days. Times are UTC (01:00 and Sunday 02:30 in Vietnam).
  backup_retention_period    = 7
  backup_window              = "18:00-18:30"
  maintenance_window         = "sun:19:30-sun:20:00"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name}-final"

  # PostgreSQL 16 on RDS rejects unencrypted connections by default (rds.force_ssl = 1).
  ca_cert_identifier = "rds-ca-rsa2048-g1"

  lifecycle {
    ignore_changes = [password]
  }
}

############################################
# ElastiCache (Valkey): refresh tokens, guest carts, chat intent, rate limits, caches
############################################

resource "aws_elasticache_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = local.name
  description          = "PC Builder sessions, carts and caches"
  engine               = "valkey"
  engine_version       = "8.0"
  node_type            = var.cache_node_type
  num_cache_clusters   = 1
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.cache.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true # the app connects with rediss://

  snapshot_retention_limit = 1
  snapshot_window          = "18:30-19:30"
  maintenance_window       = "sun:20:00-sun:21:00"
  apply_immediately        = true
}
