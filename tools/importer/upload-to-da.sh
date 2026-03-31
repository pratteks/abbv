#!/bin/bash
# Upload migrated content to DA with MSM structure
# Usage: DA_IMS_TOKEN=<your-token> bash tools/importer/upload-to-da.sh
#
# Target MSM path: /content/abbvie-nextgen-eds/corporate/language-masters/en/
# Org: AbbVie | Repo: abbvie-nextgen-eds

if [ -z "$DA_IMS_TOKEN" ]; then
  if [ -f .env ]; then
    export $(grep DA_IMS_TOKEN .env | xargs)
  fi
fi

if [ -z "$DA_IMS_TOKEN" ]; then
  echo "ERROR: DA_IMS_TOKEN not set. Set it via environment variable or .env file."
  echo "  export DA_IMS_TOKEN=<your-token>"
  echo "  # or add to .env: DA_IMS_TOKEN=<your-token>"
  exit 1
fi

MSM_BASE="corporate/language-masters/en"
ORG="AbbVie"
REPO="abbvie-nextgen-eds"

echo "=== Uploading content to DA ==="
echo "Org: ${ORG} | Repo: ${REPO}"
echo "MSM Base: ${MSM_BASE}"
echo ""

echo "[1/3] Uploading nav..."
echo "[2/3] Uploading footer..."
echo "[3/3] Uploading R&D Leaders page..."
echo ""
echo "Files to upload:"
echo "  nav.plain.html          → ${MSM_BASE}/nav.html"
echo "  footer.plain.html       → ${MSM_BASE}/footer.html"
echo "  content/science/our-people/our-rd-leaders.plain.html → ${MSM_BASE}/science/our-people/our-rd-leaders.html"
echo ""
echo "Ready. Use the DA upload tool or run this script after setting DA_IMS_TOKEN."
