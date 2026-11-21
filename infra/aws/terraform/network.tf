# One VPC with one public subnet: the server needs a public address for HTTPS, and a NAT gateway or load balancer
# would cost more than the server itself.
# trivy:ignore:AVD-AWS-0178 (flow logs are billed per GB; enable them when investigating an incident)
resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = local.name }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = local.name }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = false

  tags = { Name = "${local.name}-public" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name}-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# The default security group of a new VPC allows all traffic between its members; strip it so nothing can use it.
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
}

# Only HTTP and HTTPS come in. There is no SSH port: shell access goes through SSM Session Manager, which is
# authenticated by IAM and needs no inbound port or key pair.
resource "aws_security_group" "web" {
  name        = "${local.name}-web"
  description = "HTTPS shop; HTTP only for the ACME challenge and the redirect"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-web" }
}

resource "aws_vpc_security_group_ingress_rule" "web" {
  for_each = { http = 80, https = 443 }

  security_group_id = aws_security_group.web.id
  description       = upper(each.key)
  ip_protocol       = "tcp"
  from_port         = each.value
  to_port           = each.value
  cidr_ipv4         = "0.0.0.0/0"
}

# Outbound is limited to web ports: package updates, ECR, SSM, S3, Gemini, Let's Encrypt and SePay all use
# HTTP(S). DNS and time sync go to the VPC resolver and link-local services, which security groups do not filter.
# trivy:ignore:AVD-AWS-0104 (those endpoints have no fixed address ranges)
resource "aws_vpc_security_group_egress_rule" "web" {
  for_each = { http = 80, https = 443 }

  security_group_id = aws_security_group.web.id
  description       = "${upper(each.key)} out"
  ip_protocol       = "tcp"
  from_port         = each.value
  to_port           = each.value
  cidr_ipv4         = "0.0.0.0/0"
}
