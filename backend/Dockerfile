## [Stage 1]: Build uv as optimized bytecode. ##
FROM    alpine:3.22.1 AS build
WORKDIR /var/backend/src

ENV     HOME=/home/alpine
ENV     UV_CACHE_DIR=${HOME}/.local

# Setup dependencies, and user
RUN     apk add --no-cache curl ca-certificates build-base
RUN     curl -LsSf https://astral.sh/uv/install.sh | sh

# Copy src file content here for building uv
COPY    src .

# Install python 3.10, lock uv if not found, and sync uv.
RUN     PATH=${UV_CACHE_DIR}/bin:$PATH; \
uv python install 3.10; \
if [ ! -f uv.lock ]; then \
    uv lock; \
fi; \
rm -f .venv; \
uv sync --compile-bytecode --frozen

# Strip uv backend binary of unused symbols
RUN     find ${UV_CACHE_DIR}/bin -type f -name "*.o" -name "*.so" ! -name "*.*" -exec strip --strip-unneeded {} \;
RUN     find /var/backend/src/.venv -type f -name "*.o" -name "*.so" ! -name "*.*" -exec strip --strip-unneeded {} \;

## [Stage 2]: Strip unused dependencies to very barebone uvicorn. ##
FROM    alpine:3.22.1 AS runtime
WORKDIR /var/backend/src

# Copy over binaries
ENV     HOME=/home/alpine
ENV     UV_CACHE_DIR=${HOME}/.local
ENV     PATH=${UV_CACHE_DIR}/bin:$PATH

RUN     adduser -D alpine

COPY    --from=build --chown=alpine:alpine /var/backend/src/.venv /var/backend/venv/
COPY    --from=build --chown=alpine:alpine ${UV_CACHE_DIR} ${UV_CACHE_DIR}

COPY    --from=build /var/backend/src/uv.lock /var/backend/venv/uv.lock

ENTRYPOINT  ["sh", "/var/backend/tools/setup.sh"]
