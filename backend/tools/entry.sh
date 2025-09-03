#!/usr/bin/env sh

set -euo pipefail

# Symlink image built venv
if [ ! -e .venv ]; then
    ln -s /var/backend/venv .venv
fi

# Run uvicorn and detach process
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

# Passthrough hault signals to uvicorn
child=$!

term() {
  kill -TERM "$child" 2>/dev/null || true
}

int() {
  kill -INT "$child" 2>/dev/null || true
}

trap term TERM
trap int INT

wait "$child"