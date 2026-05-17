# Drawing Board Monorepo

This repo is now a small monorepo centered on Terraform. The existing Drawing Board app lives in `app/`, and the AWS infrastructure is split into reusable Terraform modules driven from a single workspace-aware root.

## Structure

```text
app/                 Existing Node/Express app, nginx config, certs, compose file
lambda/              Lambda source used by Terraform
terraform/
  main.tf            Shared root module keyed off the selected workspace
  variables.tf       Shared inputs for all workspaces
  outputs.tf         Shared outputs for all workspaces
  dev.tfvars         Values for the dev environment
  prod.tfvars        Values for the prod environment
  modules/
    lambda/          Lambda function packaging, IAM, and optional SQS trigger
    sqs/             SQS queue with optional DLQ
```

## What Terraform Creates

- `modules/sqs`: creates an SQS queue and DLQ
- `modules/lambda`: packages and deploys an ES module Lambda from `lambda/index.js` and subscribes it to the queue
- `terraform` root: creates the queue and Lambda for both workspaces

## App Location

The original project files were moved here:

- `app/server`
- `app/nginx`
- `app/docker-compose.yml`
- `app/cert`

Run the existing app locally from `app/` the same way you did before.

## Terraform Usage

For local development queue + Lambda infrastructure:

```bash
cd terraform
terraform init
terraform workspace new dev || terraform workspace select dev
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

For production:

```bash
cd terraform
terraform init
terraform workspace new prod || terraform workspace select prod
terraform plan -var-file=prod.tfvars
terraform apply -var-file=prod.tfvars
```

After `terraform apply`, run your app with your existing AWS profile and the queue URL:

```bash
AWS_PROFILE=your-profile-name
AWS_REGION=us-west-2
QUEUE_URL=...
```

Or provide explicit credentials, which is the simpler option for Docker Compose:

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2
QUEUE_URL=...
```

Get the queue URL from Terraform output:

```bash
cd terraform
terraform workspace select dev
terraform output -raw queue_url
```

The dev Terraform stack does not create separate "SQS credentials". SQS uses standard AWS credentials for an IAM user or role with `sqs:SendMessage` permission on the queue.

## Notes

- Database values live in `terraform/dev.tfvars` and `terraform/prod.tfvars`.
- Workspaces still do not auto-pick a var file on their own; pass `-var-file=dev.tfvars` or `-var-file=prod.tfvars` explicitly.
