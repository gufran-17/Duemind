# ─────────────────────────────────────────────────────────────
# ACM SSL CERTIFICATE
# Covers both root domain and www subdomain
# ─────────────────────────────────────────────────────────────
resource "aws_acm_certificate" "main" {
  domain_name               = "duemind.in"
  subject_alternative_names = ["www.duemind.in"]
  validation_method         = "DNS"

  # Best practice: allows zero-downtime cert renewal
  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "duemind-ssl-cert" }
}

# ─────────────────────────────────────────────────────────────
# OUTPUT VALIDATION DNS RECORDS
# After terraform apply, copy these values into GoDaddy
# ─────────────────────────────────────────────────────────────
output "acm_validation_dns_records" {
  description = "Add ALL of these CNAME records in GoDaddy to validate your SSL cert"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      cname_name  = dvo.resource_record_name
      cname_value = dvo.resource_record_value
      type        = dvo.resource_record_type
    }
  }
}

# ─────────────────────────────────────────────────────────────
# WAIT FOR CERTIFICATE VALIDATION
# Terraform will pause here until AWS confirms DNS ownership
# You MUST add the CNAME records in GoDaddy before this completes
# ─────────────────────────────────────────────────────────────
resource "aws_acm_certificate_validation" "main" {
  certificate_arn = aws_acm_certificate.main.arn

  timeouts {
    create = "45m"   # Terraform waits up to 45 min for AWS to validate
  }
}