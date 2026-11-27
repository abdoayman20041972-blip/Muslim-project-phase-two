#!/usr/bin/env bash
# Runs ESLint with the repo's eslint.config.mjs from a separate install folder.
# The project uses TypeScript 7, which typescript-eslint does not support yet, so ESLint gets its own
# TypeScript 5 here and never touches the project's node_modules or package-lock.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINT_DIR="${LINT_DIR:-/tmp/muslim-lint}"
mkdir -p "$LINT_DIR"
cp "$ROOT/eslint.config.mjs" "$LINT_DIR/eslint.config.mjs"
if [ ! -x "$LINT_DIR/node_modules/.bin/eslint" ]; then
  (cd "$LINT_DIR" && npm init -y >/dev/null && npm install --no-audit --no-fund \
    eslint@9.39.1 @eslint/js@9.39.1 typescript@5.9.3 typescript-eslint@8.46.4 eslint-plugin-react-hooks@5.2.0 globals@16.5.0)
fi
cd "$ROOT"
"$LINT_DIR/node_modules/.bin/eslint" -c "$LINT_DIR/eslint.config.mjs" --max-warnings "${LINT_MAX_WARNINGS:-100000}" src __tests__ scripts
