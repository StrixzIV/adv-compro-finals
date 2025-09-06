#!/usr/bin/env sh

set -euo pipefail

# Symlink image build venv
if [ ! -e .venv ]; then
  ln -s /var/backend/venv .venv
fi

# Move lockfile into src
if [ ! -e uv.lock ]; then
  mv /var/backend/venv/uv.lock uv.lock
fi

# Execute entry as user
exec su -m alpine -c "sh /var/backend/tools/entry.sh $@"
