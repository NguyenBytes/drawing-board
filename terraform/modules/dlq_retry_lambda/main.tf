data "archive_file" "package" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/${var.function_name}.zip"
  excludes    = var.archive_excludes
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "queue_access" {
  statement {
    sid = "ReadAndDeleteDeadLetterMessages"

    actions = [
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage",
    ]
    resources = [var.dlq_arn]
  }

  statement {
    sid       = "RetryMessagesOnMainQueue"
    actions   = ["sqs:SendMessage"]
    resources = [var.main_queue_arn]
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "queue_access" {
  name   = "${var.function_name}-queue-access"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.queue_access.json
}

resource "aws_lambda_function" "this" {
  function_name    = var.function_name
  role             = aws_iam_role.this.arn
  handler          = var.handler
  runtime          = var.runtime
  filename         = data.archive_file.package.output_path
  source_code_hash = data.archive_file.package.output_base64sha256
  memory_size      = var.memory_size
  timeout          = var.timeout

  environment {
    variables = merge(var.environment_variables, {
      DLQ_URL                     = var.dlq_url
      MAIN_QUEUE_URL              = var.main_queue_url
      MAX_MESSAGES_PER_INVOCATION = tostring(var.max_messages_per_invocation)
    })
  }

  tags = var.tags
}
