#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm install
npm run build
npm run package:linux -w @jibo-studio/desktop
echo "Linux packages written to apps/desktop/release/"
