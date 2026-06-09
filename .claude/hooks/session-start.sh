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

# Pull latest if a PAT is provided via env var GIT_PAT
if [ -n "${GIT_PAT:-}" ]; then
  git remote set-url origin "https://AsifAlJawad:${GIT_PAT}@github.com/AsifAlJawad/-harbour-barbers.git"
  git fetch origin main
  git reset --hard origin/main
  # Remove credentials from remote URL after use
  git remote set-url origin "https://github.com/AsifAlJawad/-harbour-barbers.git"
  echo "✓ Synced to latest commit: $(git log --oneline -1)"
else
  echo "⚠ GIT_PAT not set — skipping git pull. Set it in your environment to auto-sync."
fi
