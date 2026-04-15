output "task_definition_arn" {
  value       = aws_ecs_task_definition.app.arn
  description = "Currently deployed task definition"
}

output "service_name" {
  value       = aws_ecs_service.app.name
}

output "deployed_backend_image" {
  value       = var.backend_image
}

output "deployed_frontend_image" {
  value       = var.frontend_image
}