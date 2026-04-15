terraform {
  backend "s3" {
    bucket         = "duemind-terraform-state"
    key            = "ecs/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "duemind-terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

