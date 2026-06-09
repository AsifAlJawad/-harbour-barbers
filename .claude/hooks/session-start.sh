#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install Node dependencies
npm install

# --- Git sync: ensure we always start from the latest code on GitHub ---

# Re-init if container wiped the .git directory
if [ ! -d ".git" ]; then
  git init
  git remote add origin https://github.com/AsifAlJawad/-harbour-barbers.git
fi

git config user.email noreply@anthropic.com
git config user.name Claude

# Use env var if set, otherwise fall back to embedded token.
# Rotate this token if the repo ever becomes public.
_PAT="${GIT_PAT:-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}"

git remote set-url origin "https://AsifAlJawad:${_PAT}@github.com/AsifAlJawad/-harbour-barbers.git"
git fetch origin main
git reset --hard origin/main
git remote set-url origin "https://github.com/AsifAlJawad/-harbour-barbers.git"
echo "✓ Synced to latest commit: $(git log --oneline -1)"
