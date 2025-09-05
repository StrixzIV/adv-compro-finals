## [Stage 1]: Build uv as optimized bytecode. ##
FROM    alpine:3.22.1 AS build
WORKDIR /var/backend/src

ENV     HOME=/home/alpine
ENV     UV_CACHE_DIR=${HOME}/.local

# Setup dependencies, and user
RUN     apk add --no-cache curl ca-certificates build-base
RUN     curl -LsSf https://astral.sh/uv/install.sh | sh

ENV     PATH=${UV_CACHE_DIR}/bin:$PATH
RUN     uv python install 3.10

# Build UV inside of /var/backend/src (because relative path)
COPY    src .

# Lock the deps if not found.
RUN     if [ ! -f uv.lock ]; then uv lock; fi

# Install the deps from lock.
RUN     rm -f .venv
RUN     uv sync --compile-bytecode --frozen

# Strip uv backend binary of unused symbols
RUN     find ${UV_CACHE_DIR}/bin -type f -exec strip --strip-unneeded {} \;
RUN     find /var/backend/src/.venv -type f -exec strip --strip-unneeded {} \;

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
