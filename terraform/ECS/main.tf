# ─────────────────────────────────────────────────────────────
# DATA SOURCE — reference existing cluster, never manage it
# ─────────────────────────────────────────────────────────────
data "aws_ecs_cluster" "main" {
  cluster_name = "duemind-cluster"
}

# ─────────────────────────────────────────────────────────────
# CLOUDWATCH LOG GROUP
# ─────────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/duemind"
  retention_in_days = 7

  lifecycle {
    ignore_changes    = [tags]
    prevent_destroy   = false
  }
}

# ─────────────────────────────────────────────────────────────
# IAM ROLE — ECS task execution
# ECS agent uses this to pull ECR images + read SSM secrets
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
    ignore_changes = [tags]
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ssm_read" {
  name = "duemind-ssm-read"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameters",
        "ssm:GetParameter",
        "kms:Decrypt"
      ]
      Resource = [
        "arn:aws:ssm:ap-south-1:062000001375:parameter/duemind/*"
      ]
    }]
  })
}

# ─────────────────────────────────────────────────────────────
# TASK DEFINITION
# New revision registered on every deploy — correct ECS behaviour
# ─────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "app" {
  family                   = "duemind-task"
  requires_compatibilities = ["EC2"]
  network_mode             = "host"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_image
      essential = true

      cpu               = 128
      memoryReservation = 256
      memory            = 400

      portMappings = [{
        containerPort = 5000
        hostPort      = 5000
        protocol      = "tcp"
      }]

      environment = [
        { name = "PORT",    value = "5000" },
        { name = "DB_NAME", value = "duemind_pro" }
      ]

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
          "awslogs-group"         = "/ecs/duemind"
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

      portMappings = [{
        containerPort = 80
        hostPort      = 80
        protocol      = "tcp"
      }]

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

# ─────────────────────────────────────────────────────────────
# ECS SERVICE — always updates, never recreates
# ─────────────────────────────────────────────────────────────
resource "aws_ecs_service" "app" {
  name            = "duemind-service"
  cluster         = data.aws_ecs_cluster.main.arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "EC2"

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  force_new_deployment = true

  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_execution,
    aws_iam_role_policy.ssm_read
  ]
}