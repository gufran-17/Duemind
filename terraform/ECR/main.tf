resource "aws_ecr_repository" "duemind_repo" {
  name = "duemind"

  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}