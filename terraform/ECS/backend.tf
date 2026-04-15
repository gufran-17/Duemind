terraform {
  backend "s3" {
    bucket = "duemind-terraform-state"
    key    = "ecs/terraform.tfstate"
    region = "ap-south-1"
    encrypt = true

    # dynamodb_table is deprecated in Terraform 1.14+
    # use_lockfile uses S3 native locking instead — no DynamoDB needed
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
