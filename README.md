# Drawing Board

Live site: [gridsketching.com](https://gridsketching.com)

This repo contains the app, Lambda worker, and Terraform infrastructure for Drawing Board.

## Project Goal

This project was used to strengthen practical infrastructure and delivery skills alongside application development. The primary goals were to:

- build hands-on experience with Terraform for provisioning and managing AWS infrastructure
- implement a CI/CD workflow that plans, applies, and deploys production changes through GitHub Actions
- improve end-to-end ownership of application delivery, including infrastructure, deployment automation, and runtime configuration

## Structure

```text
app/
  docker-compose.yml      VPS compose file
  cert/                   DB CA cert mounted into app containers
  nginx/
    nginx.conf            Nginx config uploaded with the app
  server/                 Node/Express app

lambda/                   Lambda worker source and dependencies

terraform/
  main.tf                 Root Terraform config
  variables.tf            Shared inputs
  outputs.tf              Shared outputs
  dev.tfvars              Dev values
  prod.tfvars             Prod values generated in CI
  provision-dev.sh        Helper to provision dev resources with local state
  destroy-dev.sh          Helper to destroy dev resources with local state
  modules/
    lambda/               Lambda packaging, IAM, event source mapping
    sqs/                  SQS queue and DLQ

terraform-backend.hcl     S3 backend config for prod state
github-actions-iam-policy.json
```

## Production

Production infrastructure is managed by Terraform and deployed through GitHub Actions.

Current production flow:

1. GitHub Actions assumes the `github-actions-drawing-board` IAM role.
2. CI downloads the CA cert into `lambda/` and `app/server/`.
3. CI installs Lambda dependencies and packages the Lambda.
4. Terraform uses the S3 backend from `terraform-backend.hcl`.
5. Terraform plans and applies the `prod` workspace.
6. Terraform outputs:
   - `queue_url`
   - `app_runtime_aws_access_key_id`
   - `app_runtime_aws_secret_access_key`
7. CI uploads `app/` to the VPS and writes those values into the remote `.env`.
8. CI runs `docker compose up -d --build express1 express2 nginx`.

Important production state notes:

- `prod` Terraform state is stored in S3, not local state.
- The backend config file stays in the repo root.
- S3 bucket versioning should be enabled on the backend bucket.

## Dev

Dev resources are intentionally kept separate from the S3-backed `prod` state.

Use the helper scripts in `terraform/`:

```bash
cd terraform
bash provision-dev.sh
```

This provisions the `dev` resources using an isolated local-backend copy and saves the dev state backup under:

```text
terraform.tfstate.d.local-backup/dev/
```

To destroy dev resources:

```bash
cd terraform
bash destroy-dev.sh
```

This uses the saved local dev state and destroys only the dev resources.

## Terraform Usage

If you are working directly with production Terraform:

```bash
cd terraform
terraform init -backend-config=../terraform-backend.hcl
terraform workspace select prod || terraform workspace new prod
terraform plan -var-file=prod.tfvars
terraform apply -var-file=prod.tfvars
```

Useful output:

```bash
terraform output -raw queue_url
```

## VPS Layout

`PROJECT_PATH` should be the deployed app root on the VPS. After upload, it should contain:

```text
PROJECT_PATH/
  docker-compose.yml
  cert/
  nginx/
    nginx.conf
  server/
```

Current certificate layout assumptions:

- app DB CA cert is uploaded into:
  - `server/ca-certificate.crt`
- Cloudflare origin certs are expected outside `PROJECT_PATH`, at:
  - `/root/nginx/certs`

Because of that, `app/docker-compose.yml` mounts:

- `./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro`
- `../nginx/certs:/etc/nginx/certs:ro`

If your VPS layout changes, update the compose mount paths to match.

## App AWS Runtime Credentials

The app uses explicit AWS env vars in production:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `QUEUE_URL`

These are written by GitHub Actions from Terraform outputs after the `prod` apply succeeds.

## Notes

- `prod.tfvars` contains secrets when generated in CI and should not be committed.
- `.zip` artifacts are ignored in git.
- `github-actions-iam-policy.json` is the local reference copy for the GitHub Actions IAM role policy.
