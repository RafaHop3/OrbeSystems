#!/usr/bin/env bash
##############################################################################
# deploy.sh — Build Lambda package and apply Terraform
# Usage: bash terraform/deploy.sh
##############################################################################
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"
PACKAGE_DIR="$BACKEND_DIR/package"
ZIP_FILE="$SCRIPT_DIR/lambda.zip"

echo "==> [1/4] Installing dependencies into package/"
rm -rf "$PACKAGE_DIR"
pip install -r "$BACKEND_DIR/requirements.txt" -t "$PACKAGE_DIR" --quiet

echo "==> [2/4] Copying application code"
rsync -a --exclude='package' --exclude='.venv' --exclude='__pycache__' \
  --exclude='*.pyc' --exclude='data' --exclude='*.db' \
  "$BACKEND_DIR/" "$PACKAGE_DIR/"

echo "==> [3/4] Creating lambda.zip"
cd "$PACKAGE_DIR"
zip -r "$ZIP_FILE" . -x "*.pyc" -x "*/__pycache__/*" > /dev/null
echo "    lambda.zip size: $(du -sh "$ZIP_FILE" | cut -f1)"

echo "==> [4/4] Running terraform apply"
cd "$SCRIPT_DIR"
terraform init -upgrade
terraform apply "$@"

echo ""
echo "✅ Deploy complete!"
echo "   API URL: $(terraform output -raw api_gateway_url)"
