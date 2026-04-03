# ---------------------------
# TASK DEFINITION
# ---------------------------
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
          "awslogs-group"         = "/ecs/duemind"
          "awslogs-region"        = "ap-south-1"
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])
}

# ---------------------------
# ECS SERVICE
# ---------------------------
resource "aws_ecs_service" "app" {
  name            = "duemind-service"
  cluster         = "duemind-cluster"   # ✅ existing cluster reuse
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "EC2"

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100   # ✅ FIX (host mode safe)

  force_new_deployment = true

  depends_on = [aws_ecs_task_definition.app]
}