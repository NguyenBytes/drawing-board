#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_TF_DIR="/tmp/drawing-board-dev"
TMP_LAMBDA_DIR="/tmp/lambda"
STATE_BACKUP_DIR="$REPO_ROOT/terraform.tfstate.d.local-backup/dev"

rm -rf "$TMP_TF_DIR" "$TMP_LAMBDA_DIR"
mkdir -p "$TMP_TF_DIR" "$STATE_BACKUP_DIR"

rsync -a --exclude '.terraform' "$SCRIPT_DIR/" "$TMP_TF_DIR/"
cp -R "$REPO_ROOT/lambda" "$TMP_LAMBDA_DIR"

# Use local backend for dev so prod remains isolated in S3.
sed -i '/backend "s3" {}/d' "$TMP_TF_DIR/main.tf"

cd "$TMP_TF_DIR"

terraform init
terraform workspace select dev || terraform workspace new dev
terraform apply -auto-approve -var-file=dev.tfvars

mkdir -p "$STATE_BACKUP_DIR"
cp "$TMP_TF_DIR/terraform.tfstate.d/dev/terraform.tfstate" "$STATE_BACKUP_DIR/terraform.tfstate"
if [[ -f "$TMP_TF_DIR/terraform.tfstate.d/dev/terraform.tfstate.backup" ]]; then
  cp "$TMP_TF_DIR/terraform.tfstate.d/dev/terraform.tfstate.backup" "$STATE_BACKUP_DIR/terraform.tfstate.backup"
fi

echo "Dev resources provisioned."
echo "Saved local dev state: $STATE_BACKUP_DIR"
