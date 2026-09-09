output "aws_region" {
  description = "AWS region for this deployment."
  value       = var.aws_region
}

output "queue_name" {
  description = "Name of the SQS queue."
  value       = module.queue.queue_name
}

output "queue_url" {
  description = "Queue URL."
  value       = module.queue.queue_url
}

output "queue_arn" {
  description = "Queue ARN for IAM policy wiring and diagnostics."
  value       = module.queue.queue_arn
}

output "lambda_name" {
  description = "Lambda function name."
  value       = module.worker.function_name
}

output "app_runtime_aws_access_key_id" {
  description = "AWS access key ID for the prod app runtime user."
  value       = aws_iam_access_key.app_runtime.id
  sensitive   = true
}

output "app_runtime_aws_secret_access_key" {
  description = "AWS secret access key for the prod app runtime user."
  value       = aws_iam_access_key.app_runtime.secret
  sensitive   = true
}

output "app_runtime_iam_user_name" {
  description = "IAM user name for the prod app runtime identity."
  value       = aws_iam_user.app_runtime.name
}
