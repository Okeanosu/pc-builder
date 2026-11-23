# Internal load balancer: no public address. CloudFront reaches it through a VPC origin, terminates HTTPS at the edge
# and forwards over AWS's private network, so the only public entry point is CloudFront.
# /api/* goes to the api container, everything else to the Next.js web container (same host name, so the
# SameSite=Lax auth cookies keep working exactly as behind Caddy).

# trivy:ignore:AVD-AWS-0054 (plain HTTP inside the VPC; TLS is terminated by CloudFront)
resource "aws_lb" "main" {
  name                       = local.name
  internal                   = true
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = aws_subnet.private[*].id
  drop_invalid_header_fields = true
  enable_deletion_protection = var.deletion_protection
  idle_timeout               = 120 # chat answers stream over SSE
}

resource "aws_lb_target_group" "app" {
  for_each = {
    web = { port = 3000, health = "/" }
    api = { port = 4000, health = "/api/health" }
  }

  name                 = "${local.name}-${each.key}"
  port                 = each.value.port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 15

  health_check {
    path                = each.value.health
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# trivy:ignore:AVD-AWS-0054
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["web"].arn
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["api"].arn
  }
}
