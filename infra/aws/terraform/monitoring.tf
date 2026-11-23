# Alerts carry no secrets. CloudWatch cannot publish to a topic encrypted with the AWS-managed SNS key.
# trivy:ignore:AVD-AWS-0095
resource "aws_sns_topic" "alerts" {
  name = "${local.name}-alerts"
}

# AWS emails a confirmation link first; alerts only arrive after it is clicked.
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# No healthy web or api container behind the load balancer for 5 minutes: the site is down. ECS replaces failed
# tasks by itself; this tells you when that is not enough. Expected to fire until the first deploy.
resource "aws_cloudwatch_metric_alarm" "no_healthy_target" {
  for_each = aws_lb_target_group.app

  alarm_name          = "${local.name}-${each.key}-down"
  alarm_description   = "No healthy ${each.key} container behind the load balancer."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  dimensions          = { TargetGroup = each.value.arn_suffix, LoadBalancer = aws_lb.main.arn_suffix }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "db_storage" {
  alarm_name          = "${local.name}-db-storage-low"
  alarm_description   = "Less than 2 GB free on the database (storage autoscaling may already be growing it)."
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 2 * 1024 * 1024 * 1024
  comparison_operator = "LessThanThreshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

# Unexpected spend is the first visible sign of leaked credentials (someone launching machines).
resource "aws_budgets_budget" "monthly" {
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
