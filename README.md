# Drawing Board

Live site: [gridsketching.com](https://gridsketching.com)

This repo contains the app, Lambda worker, and Terraform infrastructure for Drawing Board.

## Project Goal

In the era of AI, I have to keep raising my skillset instead of treating application code as the whole job. This project was a way to push deeper into infrastructure, deployment, and operational thinking so I can build and ship more complete systems.

The primary goals were to:

- build hands-on experience with Terraform for provisioning and managing AWS infrastructure
- implement a CI/CD workflow that plans, applies, and deploys production changes through GitHub Actions
- improve end-to-end ownership of application delivery, including infrastructure, deployment automation, and runtime configuration

## What I Learned

AI sped up development like crazy on this project. It was able to teach me how Terraform is used in practice, and helped me compare where it fits relative to other tools and patterns I have looked at, including Kafka and Kubernetes.

I also learned to appreciate AWS IAM roles and the way AWS services can be tightly connected. A lot of the setup is just roles and permissions pointing to the right resources, with very little exposed publicly. Multi-cloud solutions can be strong too, but there are definite tradeoffs in complexity, integration depth, and operational overhead.

## Structure

```text
.github/
  workflows/
    deploy.yml

app/
  docker-compose.yml
  cert/
  nginx/
  server/

lambda/

terraform/
  modules/
  provision-dev.sh
  destroy-dev.sh
  main.tf
  outputs.tf
  variables.tf

terraform-backend.hcl
github-actions-iam-policy.json
```

## CI/CD

Production delivery runs through [`.github/workflows/deploy.yml`](/home/tom/Desktop/drawing-board/.github/workflows/deploy.yml). The workflow is triggered on pushes to `master` when files under `app/`, `lambda/`, `terraform/`, `terraform-backend.hcl`, or the workflow file itself change.

The pipeline currently acts as both infrastructure delivery and application deployment:

1. GitHub Actions checks out the repo and configures Terraform and Node.js.
2. It assumes the `github-actions-drawing-board` IAM role by using GitHub OIDC through `aws-actions/configure-aws-credentials`.
3. It downloads the database CA certificate from S3 into both `lambda/` and `app/server/`.
4. It installs Lambda dependencies and packages the worker zip from `lambda/`.
5. It generates `terraform/prod.tfvars` from GitHub Actions secrets at runtime.
6. It runs `terraform init`, `terraform validate`, selects or creates the `prod` workspace, and creates a saved plan.
7. It applies that saved Terraform plan to update AWS infrastructure.
8. After apply, it reads Terraform outputs for:
   - `queue_url`
   - `app_runtime_aws_access_key_id`
   - `app_runtime_aws_secret_access_key`
9. It installs server dependencies for the Express app.
10. It connects to the VPS, prepares the target directory, uploads `app/`, writes the remote `.env`, and rebuilds `express1`, `express2`, and `nginx` with Docker Compose.

This is closer to a deployment pipeline than a broad validation pipeline. It does not currently run a separate test suite, lint job, or manual approval gate before apply.

## Terraform State

Production Terraform uses the S3 backend defined in [`terraform-backend.hcl`](/home/tom/Desktop/drawing-board/terraform-backend.hcl):

```hcl
bucket               = "github-actions-drawing-board"
region               = "us-west-2"
workspace_key_prefix = "terraform-state"
use_lockfile         = true
```

That means the `prod` workspace state is remote, not local. The repo stores only backend configuration, while Terraform reads and writes production state in S3 during `terraform init`, `plan`, and `apply`.

Important production state notes:

- `terraform/main.tf` declares `backend "s3" {}` and the concrete backend values are passed in from `terraform-backend.hcl` during `terraform init`.
- The workflow always selects the `prod` workspace before planning and applying, so production state stays isolated from other workspaces.
- `use_lockfile = true` enables S3 lockfile-based state locking for applies.
- S3 bucket versioning should be enabled so previous state versions can be recovered if needed.

## Dev

Dev resources are intentionally kept separate from the S3-backed `prod` state.

Use the helper scripts in `terraform/`:

```bash
cd terraform
bash provision-dev.sh
```

This provisions the `dev` resources using an isolated local-backend copy.

To destroy dev resources:

```bash
cd terraform
bash destroy-dev.sh
```

This uses local dev state and destroys only the dev resources.

The separation here is deliberate:

- `terraform/provision-dev.sh` copies the Terraform root into a temporary directory.
- It removes the `backend "s3" {}` block from that temporary copy before running `terraform init`.
- It then provisions the `dev` workspace with a local backend.
- `terraform/destroy-dev.sh` uses local dev state to destroy only the `dev` workspace resources.

So the setup is:

- `prod` state: remote in S3, used by GitHub Actions and any direct production Terraform work.
- `dev` state: local only, intentionally kept out of the S3 backend so it cannot interfere with production.

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

## Deployment Layout

The deploy workflow uploads the `app/` directory and rebuilds the runtime with Docker Compose. The compose file expects:

- `app/nginx/nginx.conf` to be mounted into the nginx container.
- `app/cert/` to be mounted into the Express containers.
- TLS certificates for nginx to be available from a sibling `nginx/certs` path relative to `app/docker-compose.yml`.

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

## Next Steps

- Add blue-green deployments using DigitalOcean and Cloudflare CLIs.
