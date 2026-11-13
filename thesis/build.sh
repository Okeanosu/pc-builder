#!/usr/bin/env bash
# Rebuilds the thesis PDF: diagrams (SVG/Mermaid -> vector PDF) then LaTeX via Tectonic.
# Needs: python3 (3.13 from Homebrew), node with @playwright/test from the repo root, tectonic.
set -euo pipefail
cd "$(dirname "$0")"
REPO="$(cd .. && pwd)"
PY="${PYTHON:-python3}"
"$PY" diagrams/usecase.py diagrams/src
"$PY" diagrams/sequence.py diagrams/src
"$PY" diagrams/layers.py diagrams/src
NODE_PATH="$REPO/node_modules" node diagrams/render.cjs diagrams/src figures
tectonic -X compile main.tex
echo "built $(pwd)/main.pdf"
