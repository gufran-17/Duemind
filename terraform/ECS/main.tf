# main.tf
variable "frontend_image" {
  default = "frontend-v1"
}

# --------------------------- 
# ECS Cluster 
# ---------------------------
resource "aws_ecs_cluster" "main" {
  name = "duemind-cluster"
}

# ---------------------------
# TASK DEFINITION
# ---------------------------
resource "aws_ecs_task_definition" "app" {
  family                   = "duemind-task"
  requires_compatibilities = ["EC2"]
  network_mode             = "host"

  # No top-level cpu/memory for host mode EC2 — let containers define their own
  # (Task-level cpu/memory is required for Fargate, optional for EC2 host mode)

  container_definitions = jsonencode([
    {
      name      = "backend"
      image = var.backend_image
      essential = true

      cpu               = 128   # out of 2048 vCPU units on t3.small
      memoryReservation = 256   # soft limit — won't block placement
      memory            = 400   # hard limit

      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "PORT",        value = "5000" },
        { name = "DB_HOST",     value = "duemind-db.c7qim6s6ogkd.ap-south-1.rds.amazonaws.com" },
        { name = "DB_USER",     value = "admin" },
        { name = "DB_PASSWORD", value = "gufran2003" },
        { name = "DB_NAME",     value = "duemind_pro" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/duemind"
          "awslogs-region"        = "ap-south-1"
          "awslogs-stream-prefix" = "backend"
        }
      }
    },
    {
      name      = "frontend"
      image = var.frontend_image
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
          "awslogs-group"         = "/ecs/duemind"
          "awslogs-region"        = "ap-south-1"
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])
}

# ---------------------------
# ECS SERVICE — key fix is here
# ---------------------------
resource "aws_ecs_service" "app" {
  name            = "duemind-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "EC2"

  # THIS IS THE CRITICAL FIX:
  # Stop old task BEFORE starting new one.
  # Default (100% min / 200% max) tries to run both simultaneously — port conflict guaranteed.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200

  depends_on = [aws_ecs_task_definition.app]
}

# ---------------------------
# CloudWatch Log Group
# ---------------------------
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/duemind"
  retention_in_days = 7
}