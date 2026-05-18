#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_TF_DIR="/tmp/drawing-board-dev-destroy"
TMP_LAMBDA_DIR="/tmp/lambda"
STATE_BACKUP_DIR="$REPO_ROOT/terraform.tfstate.d.local-backup/dev"

if [[ ! -f "$STATE_BACKUP_DIR/terraform.tfstate" ]]; then
  echo "No saved dev state found at $STATE_BACKUP_DIR/terraform.tfstate" >&2
  exit 1
fi

rm -rf "$TMP_TF_DIR" "$TMP_LAMBDA_DIR"
mkdir -p "$TMP_TF_DIR/terraform.tfstate.d/dev"

rsync -a --exclude '.terraform' "$SCRIPT_DIR/" "$TMP_TF_DIR/"
cp -R "$REPO_ROOT/lambda" "$TMP_LAMBDA_DIR"

# Use local backend for dev so prod remains isolated in S3.
sed -i '/backend "s3" {}/d' "$TMP_TF_DIR/main.tf"

cp "$STATE_BACKUP_DIR/terraform.tfstate" "$TMP_TF_DIR/terraform.tfstate.d/dev/terraform.tfstate"
if [[ -f "$STATE_BACKUP_DIR/terraform.tfstate.backup" ]]; then
  cp "$STATE_BACKUP_DIR/terraform.tfstate.backup" "$TMP_TF_DIR/terraform.tfstate.d/dev/terraform.tfstate.backup"
fi

cd "$TMP_TF_DIR"

terraform init
terraform workspace select dev
terraform destroy -auto-approve -var-file=dev.tfvars

rm -rf "$STATE_BACKUP_DIR"

echo "Dev resources destroyed."
echo "Removed saved local dev state: $STATE_BACKUP_DIR"
