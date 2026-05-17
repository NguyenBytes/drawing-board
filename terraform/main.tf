terraform {
  required_version = ">= 1.6.0"

  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.5"
    }

    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  environment = terraform.workspace
  is_prod     = local.environment == "prod"
  name_prefix = "${var.project_name}-${local.environment}"
  common_tags = {
    Environment = local.environment
    ManagedBy   = "terraform"
    Project     = var.project_name
  }
}

check "supported_workspace" {
  assert {
    condition     = contains(["dev", "prod"], local.environment)
    error_message = "Unsupported Terraform workspace. Use either \"dev\" or \"prod\"."
  }
}

module "queue" {
  source = "./modules/sqs"

  name = "${local.name_prefix}-queue"
  tags = local.common_tags
}

resource "aws_iam_user" "app_runtime" {
  count = local.is_prod ? 1 : 0

  name = "${local.name_prefix}-app-runtime"
  tags = local.common_tags
}

resource "aws_iam_user_policy" "app_runtime_sqs_send" {
  count = local.is_prod ? 1 : 0

  name = "${local.name_prefix}-app-runtime-sqs-send"
  user = aws_iam_user.app_runtime[0].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = module.queue.queue_arn
      },
    ]
  })
}

resource "aws_iam_access_key" "app_runtime" {
  count = local.is_prod ? 1 : 0

  user = aws_iam_user.app_runtime[0].name
}

module "worker" {
  source = "./modules/lambda"

  function_name      = "${local.name_prefix}-worker"
  source_file        = "${path.module}/../lambda/index.js"
  dependencies_path  = "${path.module}/../lambda/node_modules"
  package_json_path  = "${path.module}/../lambda/package.json"
  package_lock_path  = "${path.module}/../lambda/package-lock.json"
  extra_file_paths   = ["${path.module}/../lambda/ca-certificate.crt"]
  queue_arn          = module.queue.queue_arn
  enable_sqs_trigger = true

  environment_variables = {
    APP_ENV   = local.environment
    QUEUE_URL = module.queue.queue_url
    host      = var.host
    username  = var.username
    password  = var.password
    port      = var.port
    database  = var.database
    sslmode   = var.sslmode
  }

  tags = local.common_tags
}
