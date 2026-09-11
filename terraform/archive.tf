resource "aws_s3_bucket" "database_lambda_log_archive" {
  bucket = "drawingboard-prod-archive"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "database_lambda_log_archive" {
  bucket = aws_s3_bucket.database_lambda_log_archive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "database_lambda_log_archive" {
  bucket = aws_s3_bucket.database_lambda_log_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "aws_iam_policy_document" "archive_lambda_access" {
  statement {
    actions   = ["logs:FilterLogEvents"]
    resources = [aws_cloudwatch_log_group.database_lambda.arn]
  }

  statement {
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.database_lambda_log_archive.arn}/*"]
  }
}

resource "aws_iam_role_policy" "archive_lambda_access" {
  name   = "${local.name_prefix}-archive-access"
  role   = module.archive.role_name
  policy = data.aws_iam_policy_document.archive_lambda_access.json
}

resource "aws_cloudwatch_event_rule" "archive_database_lambda_logs" {
  name                = "${local.name_prefix}-archive-database-lambda-logs"
  description         = "Archives database Lambda logs to S3 every 15 days."
  schedule_expression = "rate(15 days)"
  tags                = local.common_tags
}

resource "aws_cloudwatch_event_target" "archive_database_lambda_logs" {
  rule      = aws_cloudwatch_event_rule.archive_database_lambda_logs.name
  target_id = "archive-database-lambda-logs"
  arn       = module.archive.function_arn
}

resource "aws_lambda_permission" "allow_eventbridge_archive_database_lambda_logs" {
  statement_id  = "AllowEventBridgeArchiveInvocation"
  action        = "lambda:InvokeFunction"
  function_name = module.archive.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.archive_database_lambda_logs.arn
}
