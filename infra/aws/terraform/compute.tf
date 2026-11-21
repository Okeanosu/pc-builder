# Every new EBS volume and snapshot in this region is encrypted, including ones created by hand later.
resource "aws_ebs_encryption_by_default" "on" {
  enabled = true
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  iam_instance_profile        = aws_iam_instance_profile.app.name
  associate_public_ip_address = true # needed for first-boot package installs; the Elastic IP replaces it
  disable_api_termination     = var.termination_protection
  monitoring                  = false

  # Standard credits cap CPU at the instance baseline once the credit balance is spent, instead of billing extra.
  # A compromised server (crypto mining is the usual payload) then cannot run up the bill.
  credit_specification {
    cpu_credits = "standard"
  }

  # IMDSv2 only, and a hop limit of 1 so containers (one network hop away) cannot reach the metadata service.
  # A request-forgery bug in the API therefore cannot fetch the instance role's credentials.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_gb
    encrypted             = true
    delete_on_termination = true
    tags                  = { Name = local.name, Backup = "${local.name}-daily" }
  }

  # First-boot OS setup only. No secrets here: user data is readable by anyone allowed to describe the instance.
  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    compose_version = "v5.6.1"
    compose_sha256  = "42cfa75f51ad0ccf290bad37899e0038a8c10a0069e85233ecc1d53e3ff1347d"
  })
  user_data_replace_on_change = false

  tags = { Name = local.name }

  lifecycle {
    # A newer AMI or edited user data must not silently replace the server (and its database volume).
    ignore_changes = [ami, user_data]
  }

  depends_on = [aws_ebs_encryption_by_default.on]
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id

  tags = { Name = local.name }

  depends_on = [aws_internet_gateway.main]
}
