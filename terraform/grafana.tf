data "aws_iam_policy_document" "grafana_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [aws_iam_user.grafana.arn]
    }
  }
}

resource "aws_iam_user" "grafana" {
  name = "${local.name_prefix}-grafana"
  tags = local.common_tags
}

resource "aws_iam_access_key" "grafana" {
  user = aws_iam_user.grafana.name
}

resource "aws_iam_role" "grafana_database_lambda_logs" {
  name               = "${local.name_prefix}-grafana-database-lambda-logs"
  assume_role_policy = data.aws_iam_policy_document.grafana_assume_role.json
  tags               = local.common_tags
}

data "aws_iam_policy_document" "grafana_database_lambda_logs" {
  statement {
    sid       = "DiscoverDatabaseLambdaLogGroup"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }

  statement {
    sid = "ReadDatabaseLambdaLogs"
    actions = [
      "logs:DescribeLogStreams",
      "logs:FilterLogEvents",
      "logs:GetLogEvents",
      "logs:GetLogGroupFields",
      "logs:StartQuery",
    ]
    resources = [
      trimsuffix(aws_cloudwatch_log_group.database_lambda.arn, ":*"),
      "${trimsuffix(aws_cloudwatch_log_group.database_lambda.arn, ":*")}:*",
    ]
  }

  statement {
    sid = "ReadCloudWatchLogsQueryResults"
    actions = [
      "logs:GetQueryResults",
      "logs:StopQuery",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "grafana_database_lambda_logs" {
  name   = "${local.name_prefix}-grafana-database-lambda-logs"
  role   = aws_iam_role.grafana_database_lambda_logs.id
  policy = data.aws_iam_policy_document.grafana_database_lambda_logs.json
}

resource "aws_iam_user_policy" "grafana_assume_database_lambda_logs_role" {
  name = "${local.name_prefix}-grafana-assume-database-lambda-logs-role"
  user = aws_iam_user.grafana.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sts:AssumeRole"]
        Resource = aws_iam_role.grafana_database_lambda_logs.arn
      },
    ]
  })
}
