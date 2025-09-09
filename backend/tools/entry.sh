#!/usr/bin/env sh

set -euo pipefail

# Run uvicorn and detach process
if [ -n "$DEV" ]; then
  uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
else
  uv run uvicorn main:app --host 0.0.0.0 --port 8000 &
fi

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
