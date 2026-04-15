# ─────────────────────────────────────────────────────────────
# FETCH the manually-created second subnet using data source
# We are NOT creating it — just reading its ID from AWS
# ─────────────────────────────────────────────────────────────
data "aws_subnet" "public_subnet_2" {
  filter {
    name   = "tag:Name"
    values = ["tf-public-subnet-2"]   # exact name from your AWS console
  }

  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]        # scoped to YOUR vpc only
  }
}

# ─────────────────────────────────────────────────────────────
# SECURITY GROUP for ALB
# ─────────────────────────────────────────────────────────────
resource "aws_security_group" "alb_sg" {
  name        = "duemind-alb-sg"
  description = "Allow HTTP and HTTPS from internet to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "duemind-alb-sg" }
}

# ─────────────────────────────────────────────────────────────
# UPDATE EC2 SECURITY GROUP
# Allow port 80 traffic specifically from ALB (more secure)
# ─────────────────────────────────────────────────────────────
resource "aws_security_group_rule" "ec2_allow_alb_80" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ec2_sg.id
  source_security_group_id = aws_security_group.alb_sg.id
  description              = "Allow ALB to reach EC2 on port 80"
}

# ─────────────────────────────────────────────────────────────
# APPLICATION LOAD BALANCER
# Uses both subnets: Terraform-managed + manually-created
# ─────────────────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "duemind-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]

  # One is your Terraform subnet, one is fetched via data source
  subnets = [
    aws_subnet.public_subnet.id,
    data.aws_subnet.public_subnet_2.id
  ]

  tags = { Name = "duemind-alb" }
}

# ─────────────────────────────────────────────────────────────
# TARGET GROUP
# type = instance, port 80, forwards to your EC2
# ─────────────────────────────────────────────────────────────
resource "aws_lb_target_group" "frontend" {
  name        = "duemind-tg-frontend"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = { Name = "duemind-tg-frontend" }
}

# ─────────────────────────────────────────────────────────────
# REGISTER EC2 INSTANCE IN TARGET GROUP
# ─────────────────────────────────────────────────────────────
resource "aws_lb_target_group_attachment" "ec2" {
  target_group_arn = aws_lb_target_group.frontend.arn
  target_id        = aws_instance.ec2.id
  port             = 80
}

# ─────────────────────────────────────────────────────────────
# HTTP LISTENER (port 80) → redirect to HTTPS
# ─────────────────────────────────────────────────────────────
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─────────────────────────────────────────────────────────────
# HTTPS LISTENER (port 443) → forward to target group
# NOTE: depends on certificate validation completing first
# ─────────────────────────────────────────────────────────────
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ─────────────────────────────────────────────────────────────
# OUTPUTS
# ─────────────────────────────────────────────────────────────
output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Copy this value → use as CNAME target in GoDaddy"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "ALB hosted zone ID (for Route53 if needed later)"
}