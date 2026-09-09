terraform {
  required_version = ">= 1.6.0"

  backend "s3" {}

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
  environment = "prod"
  name_prefix = "${var.project_name}-${local.environment}"
  common_tags = {
    Environment = local.environment
    ManagedBy   = "terraform"
    Project     = var.project_name
  }
}

moved {
  from = aws_iam_user.app_runtime[0]
  to   = aws_iam_user.app_runtime
}

moved {
  from = aws_iam_user_policy.app_runtime_sqs_send[0]
  to   = aws_iam_user_policy.app_runtime_sqs_send
}

moved {
  from = aws_iam_access_key.app_runtime[0]
  to   = aws_iam_access_key.app_runtime
}

module "queue" {
  source = "./modules/sqs"

  name = "${local.name_prefix}-queue"
  tags = local.common_tags
}

resource "aws_iam_user" "app_runtime" {
  name = "${local.name_prefix}-app-runtime"
  tags = local.common_tags
}

resource "aws_iam_user_policy" "app_runtime_sqs_send" {
  name = "${local.name_prefix}-app-runtime-sqs-send"
  user = aws_iam_user.app_runtime.name

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
  user = aws_iam_user.app_runtime.name
}

module "worker" {
  source = "./modules/lambda"

  function_name      = "${local.name_prefix}-worker"
  source_file        = "${path.module}/../database-lambda/index.js"
  archive_excludes   = ["database-lambda.zip"]
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

module "dlq_retry" {
  source = "./modules/dlq_retry_lambda"

  function_name               = "${local.name_prefix}-dlq-retry"
  source_dir                  = "${path.module}/../dlq-retry-lambda"
  archive_excludes            = ["dlq-retry-lambda.zip"]
  dlq_arn                     = module.queue.dlq_arn
  dlq_url                     = module.queue.dlq_url
  main_queue_arn              = module.queue.queue_arn
  main_queue_url              = module.queue.queue_url
  max_messages_per_invocation = 10
  tags                        = local.common_tags
}
