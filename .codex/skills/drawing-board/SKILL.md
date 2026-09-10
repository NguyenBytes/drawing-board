---
name: drawing-board
description: Use when working on the Drawing Board repo, especially for the Express app, database/DLQ/archive Lambdas, Terraform infrastructure, CloudWatch monitoring, S3 log archival, or the production GitHub Actions deploy flow.
---

# Drawing Board

Use this skill when editing or operating on this repository.

## Repo Layout

```text
app/
  docker-compose.yml
  nginx/nginx.conf
  server/
    db.js
    index.js
    sqs.js

database-lambda/
  index.js
  package.json

dlq-retry-lambda/
  index.js
  package.json

archive-lambda/
  index.js
  package.json

terraform/
  main.tf          # queue, app runtime IAM identity, database/DLQ/archive Lambda modules
  archive.tf       # S3 archive bucket, archive Lambda access, EventBridge schedule
  monitoring.tf    # database Lambda log retention, alarm, SNS notification
  variables.tf
  outputs.tf
  dev.tfvars
  terraform-backend.hcl
  modules/
    lambda/
    dlq_retry_lambda/
    sqs/

.github/workflows/deploy.yml
github-actions-iam-policy.json
```

## Architecture

- The Express server queues drawing-coordinate work through `app/server/sqs.js`.
- The database worker at `database-lambda/index.js` consumes the SQS queue with batch size `1`, writes coordinates to MySQL, reports partial SQS failures, and emits Embedded Metric Format records under `DrawingBoard/DatabaseLambda`.
- Failed SQS messages go to the DLQ. `dlq-retry-lambda/index.js` moves DLQ messages back to the main queue when invoked.
- `monitoring.tf` alarms when the database Lambda emits at least five `RecordsFailed` values in one minute. The alarm publishes to SNS and invokes the DLQ retry Lambda.
- `archive-lambda/index.js` reads database Lambda CloudWatch log events aged 15–30 days, writes NDJSON to `/tmp`, and uploads it to the `drawingboard-prod-archive` S3 bucket.
- EventBridge invokes the archive Lambda every 15 days. The database Lambda log group has 30-day CloudWatch Logs retention.
- Terraform provisions the SQS queues, Lambda functions and roles, monitoring/SNS resources, EventBridge rule, archive bucket, and least-privilege app runtime IAM identity.

## Production Notes

- Production uses the S3 backend in `terraform/terraform-backend.hcl`; `terraform/main.tf` does not use a local backend.
- Production deploy runs through `.github/workflows/deploy.yml`.
- The workflow:
  1. assumes `github-actions-drawing-board` through OIDC
  2. downloads the CA certificate for the database Lambda and Express server
  3. installs dependencies for the database, DLQ retry, and archive Lambdas
  4. runs Terraform init, validate, plan, and apply with generated production variables
  5. reads the app runtime queue credentials from Terraform outputs
  6. uploads the application to the VPS and rebuilds the Express/nginx services
- The shared `modules/lambda` module packages the directory containing `source_file`; dependencies must be installed in each Lambda directory before Terraform packages it.
- The archive Lambda receives `SOURCE_LOG_GROUP_NAME`, `ARCHIVE_BUCKET`, and `ARCHIVE_PREFIX` from Terraform.
- The existing database Lambda log group is adopted with an `import` block in `terraform/monitoring.tf`. Do not remove it until the resource is in Terraform state.
- `github-actions-iam-policy.json` is the source for deployment-role permissions, but does not update the live role itself. Apply policy changes to `github-actions-drawing-board` before deploying IAM-dependent Terraform changes.

## Certificate Layout

- The DB CA cert is downloaded to `database-lambda/ca-certificate.crt` for Lambda packaging and to `app/server/ca-certificate.crt` for the Express service.
- nginx config is `app/nginx/nginx.conf`.
- Current VPS assumption:
  - `PROJECT_PATH` is the deployed app root
  - Cloudflare origin certs live outside it at `../nginx/certs` relative to `app/docker-compose.yml`

## Development Notes

- `dev.tfvars` exists, but the configured backend is production. Do not use it as an isolated dev deployment without first configuring separate state.

## App Environment

Server runtime expects:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `QUEUE_URL`
- `host`
- `username`
- `password`
- `database`
- `port`
- `sslmode`

## Important Paths

- Express server: `app/server/`
- Database queue worker: `database-lambda/index.js`
- DLQ retry worker: `dlq-retry-lambda/index.js`
- CloudWatch log archiver: `archive-lambda/index.js`
- Core Terraform: `terraform/main.tf`
- Archive infrastructure: `terraform/archive.tf`
- Monitoring and log retention: `terraform/monitoring.tf`
- Production workflow: `.github/workflows/deploy.yml`
- Deployment-role policy source: `github-actions-iam-policy.json`
