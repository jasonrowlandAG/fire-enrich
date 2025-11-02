#!/usr/bin/env sh
set -e

HOOKS_DIR=".git/hooks"
if [ ! -d "$HOOKS_DIR" ]; then
  echo "This repository does not appear to be a git repo or .git/hooks missing." >&2
  exit 1
fi

echo "Installing git hooks to $HOOKS_DIR"
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "Installed pre-commit hook. It will run scripts/check-secrets.js on each commit."
