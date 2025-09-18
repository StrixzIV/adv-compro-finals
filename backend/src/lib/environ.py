import os
from types import SimpleNamespace

env = SimpleNamespace(**os.environ)

# Defaults
defaults = {
    "HOST_URL":         "http://localhost:3000",
    "FASTAPI_URL":      "http://localhost:8000",
    "POSTGRES_HOST":    "db",
}

for key, default in defaults.items():
    setattr(env, key, getattr(env, key, default))

# Single use envs
def env_single_use (key):
    tmp_env = getattr(env, key)
    if tmp_env == None:
        raise Error(f"Env error: {key} is not defined or is already in use!")
    os.environ.pop(key, None)
    delattr(env, key)
    return tmp_env
