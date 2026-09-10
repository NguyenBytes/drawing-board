resource "aws_sns_topic" "database_lambda_failures" {
  name = "${local.name_prefix}-database-lambda-failures"
  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "database_lambda_failure_email" {
  topic_arn = aws_sns_topic.database_lambda_failures.arn
  protocol  = "email"
  endpoint  = "vietnguyent22@gmail.com"
}

resource "aws_cloudwatch_metric_alarm" "database_lambda_failures" {
  alarm_name          = "${local.name_prefix}-database-lambda-failures"
  alarm_description   = "Database Lambda recorded five or more failed requests in one minute."
  namespace           = "DrawingBoard/DatabaseLambda"
  metric_name         = "RecordsFailed"
  dimensions          = { InvocationType = "SQS" }
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [
    aws_sns_topic.database_lambda_failures.arn,
    module.dlq_retry.function_arn,
  ]

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_cloudwatch_database_failure_alarm" {
  statement_id   = "AllowDatabaseFailureAlarmInvocation"
  action         = "lambda:InvokeFunction"
  function_name  = module.dlq_retry.function_name
  principal      = "lambda.alarms.cloudwatch.amazonaws.com"
  source_account = data.aws_caller_identity.current.account_id
  source_arn     = aws_cloudwatch_metric_alarm.database_lambda_failures.arn
}
