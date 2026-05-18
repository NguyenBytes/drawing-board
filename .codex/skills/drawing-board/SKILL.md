---
name: drawing-board
description: Use when working on the Drawing Board repo, especially for the Express app, nginx/docker-compose deployment layout, Lambda worker, Terraform infrastructure, or the production GitHub Actions deploy flow.
---

# Drawing Board

Use this skill when editing or operating on this repository.

## Repo Layout

```text
app/
  docker-compose.yml
  cert/
  nginx/
    nginx.conf
  server/

lambda/

terraform/
  main.tf
  variables.tf
  outputs.tf
  dev.tfvars
  prod.tfvars
  provision-dev.sh
  destroy-dev.sh
  modules/
    lambda/
    sqs/

terraform-backend.hcl
github-actions-iam-policy.json
```

## Architecture

- Frontend: static assets served from `app/server/src/`
- Backend: Node/Express in `app/server/`
- Queue producer: `app/server/sqs.js`
- Worker: Lambda in `lambda/index.js`
- Infra: Terraform-managed SQS + Lambda + IAM
- Runtime: two Express containers behind nginx via Docker Compose

## Production Notes

- Production Terraform state uses the S3 backend configured by `terraform-backend.hcl`.
- Production deploy runs through `.github/workflows/deploy.yml`.
- The workflow:
  1. downloads the CA cert into `lambda/` and `app/server/`
  2. packages Lambda from the repo `lambda/` directory
  3. applies Terraform in the `prod` workspace
  4. captures Terraform outputs for `QUEUE_URL`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`
  5. uploads `app/` to the VPS and writes those values into `.env`

## Certificate Layout

- DB CA cert is expected at `app/server/ca-certificate.crt` during deploy/runtime.
- nginx config is uploaded from `app/nginx/nginx.conf`.
- Current VPS assumption:
  - `PROJECT_PATH` is the deployed app root
  - Cloudflare origin certs live outside it at `../nginx/certs` relative to `app/docker-compose.yml`

## Dev Notes

- Dev infrastructure should not use the S3-backed prod state.
- Use:
  - `terraform/provision-dev.sh`
  - `terraform/destroy-dev.sh`
- These scripts use an isolated local-backend copy and save dev state under `terraform.tfstate.d.local-backup/dev/`.

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

- Express app: `app/server/`
- nginx config: `app/nginx/nginx.conf`
- queue client: `app/server/sqs.js`
- DB connection: `app/server/db.js`
- deploy workflow: `.github/workflows/deploy.yml`
- Terraform root: `terraform/main.tf`
