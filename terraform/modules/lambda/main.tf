locals {
  build_dir = "${path.module}/build/${var.function_name}"
}

resource "terraform_data" "package_dir" {
  triggers_replace = concat(
    [
      filemd5(var.source_file),
    ],
    [for file_path in var.extra_file_paths : filemd5(file_path)],
  )

  provisioner "local-exec" {
    command = <<-EOT
      mkdir -p "${local.build_dir}"
      cp "${var.source_file}" "${local.build_dir}/index.js"
      if [ -n "${var.package_json_path}" ]; then
        cp "${var.package_json_path}" "${local.build_dir}/package.json"
      fi
      if [ -n "${var.package_lock_path}" ]; then
        cp "${var.package_lock_path}" "${local.build_dir}/package-lock.json"
      fi
      if [ -n "${var.dependencies_path}" ]; then
        rm -rf "${local.build_dir}/node_modules"
        cp -R "${var.dependencies_path}" "${local.build_dir}/node_modules"
      fi
%{for file_path in var.extra_file_paths~}
      cp "${file_path}" "${local.build_dir}/$(basename "${file_path}")"
%{endfor~}
    EOT
  }
}

data "archive_file" "package" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = "${path.module}/${var.function_name}.zip"

  depends_on = [terraform_data.package_dir]
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
  count = var.enable_sqs_trigger ? 1 : 0

  statement {
    actions = [
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage"
    ]
    resources = [var.queue_arn]
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
  count  = var.enable_sqs_trigger ? 1 : 0
  name   = "${var.function_name}-queue-access"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.queue_access[0].json
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
    variables = var.environment_variables
  }

  tags = var.tags
}

resource "aws_lambda_event_source_mapping" "sqs" {
  count            = var.enable_sqs_trigger ? 1 : 0
  event_source_arn = var.queue_arn
  function_name    = aws_lambda_function.this.arn
  batch_size       = var.batch_size
  enabled          = true
}
