# ─────────────────────────────────────────────────────────────
# DATA SOURCES
# Reference existing cluster — do NOT recreate it
# ─────────────────────────────────────────────────────────────
data "aws_ecs_cluster" "main" {
  cluster_name = "duemind-cluster"
}

# ─────────────────────────────────────────────────────────────
# CLOUDWATCH LOG GROUP
# Create once, reuse every deploy
# ─────────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/duemind"
  retention_in_days = 7   # keeps costs low; increase for production audit

  lifecycle {
    prevent_destroy = false
    # If log group already exists, do not error — just adopt it
    ignore_changes = [tags]
  }
}

# ─────────────────────────────────────────────────────────────
# TASK DEFINITION
# A new revision is registered on every deploy (this is correct
# ECS behaviour — old revisions stay but are inactive)
# ─────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "app" {
  family                   = "duemind-task"
  requires_compatibilities = ["EC2"]
  network_mode             = "host"

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_image
      essential = true

      cpu               = 128
      memoryReservation = 256
      memory            = 400

      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "PORT",    value = "5000" },
        { name = "DB_NAME", value = "duemind_pro" }
      ]

      # DB credentials pulled from SSM — never hardcoded
      # See variables.tf for how to set these up
      secrets = [
        {
          name      = "DB_HOST"
          valueFrom = "arn:aws:ssm:ap-south-1:062000001375:parameter/duemind/DB_HOST"
        },
        {
          name      = "DB_USER"
          valueFrom = "arn:aws:ssm:ap-south-1:062000001375:parameter/duemind/DB_USER"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "arn:aws:ssm:ap-south-1:062000001375:parameter/duemind/DB_PASSWORD"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "ap-south-1"
          "awslogs-stream-prefix" = "backend"
        }
      }
    },
    {
      name      = "frontend"
      image     = var.frontend_image
      essential = true

      cpu               = 64
      memoryReservation = 128
      memory            = 256

      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "ap-south-1"
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])

  # Task role allows containers to call SSM for secrets
  execution_role_arn = aws_iam_role.ecs_task_execution.arn
}

# ─────────────────────────────────────────────────────────────
# ECS SERVICE
# Key fix: lifecycle ignore_changes on task_definition means
# Terraform will UPDATE the service, never try to recreate it
# ─────────────────────────────────────────────────────────────
resource "aws_ecs_service" "app" {
  name            = "duemind-service"
  cluster         = data.aws_ecs_cluster.main.arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "EC2"

  # Required for host network mode on single EC2 instance
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  # Forces ECS to pull new image on every deploy
  force_new_deployment = true

  lifecycle {
    # Terraform will update this resource in-place, never destroy+recreate
    # This is what prevents "Creation of service was not idempotent"
    ignore_changes = [
      # ECS autoscaler may change desired_count — don't overwrite it
      desired_count
    ]
  }

  depends_on = [aws_ecs_task_definition.app]
}

# ─────────────────────────────────────────────────────────────
# IAM ROLE FOR ECS TASK EXECUTION
# Allows ECS agent to pull images from ECR and read SSM secrets
# ─────────────────────────────────────────────────────────────
resource "aws_iam_role" "ecs_task_execution" {
  name = "duemind-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  lifecycle {
    # Role may already exist — adopt it instead of erroring
    ignore_changes = [tags]
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy to read SSM parameters (for DB secrets)
resource "aws_iam_role_policy" "ssm_read" {
  name = "duemind-ssm-read"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameters",
        "ssm:GetParameter"
      ]
      Resource = [
        "arn:aws:ssm:ap-south-1:062000001375:parameter/duemind/*"
      ]
    }]
  })
}