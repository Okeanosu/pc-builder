# CloudFront is the only public entry point: HTTPS (its own *.cloudfront.net certificate, or an ACM one for a custom
# domain), HTTP/2 and 3, edge caching of hashed static files close to Vietnamese users, and browser security headers.
# Dynamic pages and the API are never cached and get every cookie and header.

resource "aws_cloudfront_vpc_origin" "alb" {
  vpc_origin_endpoint_config {
    name                   = local.name
    arn                    = aws_lb.main.arn
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only"

    origin_ssl_protocols {
      items    = ["TLSv1.2"]
      quantity = 1
    }
  }
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

# Optimised product photos: the query string (url, width, quality) and Accept (WebP/AVIF) pick the variant.
resource "aws_cloudfront_cache_policy" "next_image" {
  name        = "${local.name}-next-image"
  min_ttl     = 3600
  default_ttl = 86400
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

locals {
  all_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
}

# trivy:ignore:AVD-AWS-0010 (access logs are billed; CloudWatch metrics and the alarms cover availability)
# trivy:ignore:AVD-AWS-0011 (AWS WAF costs at least 5 USD/month; the API rate-limits by visitor IP)
# trivy:ignore:AVD-AWS-0013 (the default *.cloudfront.net certificate cannot set a minimum TLS version)
resource "aws_cloudfront_distribution" "site" {
  enabled         = true
  comment         = "PC Builder"
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = "PriceClass_200" # includes edge locations in Vietnam and Southeast Asia
  aliases         = var.custom_domain != "" ? [var.custom_domain] : []

  origin {
    origin_id   = "alb"
    domain_name = aws_lb.main.dns_name

    vpc_origin_config {
      vpc_origin_id            = aws_cloudfront_vpc_origin.alb.id
      origin_read_timeout      = 60
      origin_keepalive_timeout = 5
    }
  }

  # Pages: never cached, every cookie/header/query forwarded (the original Host too, so Next.js sees its domain).
  default_cache_behavior {
    target_origin_id           = "alb"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = local.all_methods
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
    compress                   = true
  }

  # API: never cached and never compressed at the edge, which would buffer the chat's SSE stream.
  ordered_cache_behavior {
    path_pattern               = "/api/*"
    target_origin_id           = "alb"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = local.all_methods
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
    compress                   = false
  }

  # Build output with content hashes in the file names: cache at the edge for a long time.
  ordered_cache_behavior {
    path_pattern               = "/_next/static/*"
    target_origin_id           = "alb"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
    compress                   = true
  }

  ordered_cache_behavior {
    path_pattern               = "/_next/image*"
    target_origin_id           = "alb"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = aws_cloudfront_cache_policy.next_image.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
    compress                   = false # already WebP/AVIF
  }

  ordered_cache_behavior {
    path_pattern               = "/images/*"
    target_origin_id           = "alb"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
    compress                   = false
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain == ""
    acm_certificate_arn            = var.custom_domain != "" ? var.custom_domain_certificate_arn : null
    ssl_support_method             = var.custom_domain != "" ? "sni-only" : null
    minimum_protocol_version       = var.custom_domain != "" ? "TLSv1.2_2021" : "TLSv1"
  }
}
