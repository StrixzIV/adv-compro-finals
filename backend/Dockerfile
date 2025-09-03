# Stage 1 build uv as optimized bytecode.
FROM    alpine:3.22.1 AS build
WORKDIR /var/backend/src

ENV     HOME=/home/alpine
ENV     UV_CACHE_DIR=${HOME}/.local
ENV     PATH=${UV_CACHE_DIR}/bin:$PATH

# Setup dependencies, and user
RUN     apk add --no-cache curl ca-certificates build-base
RUN     curl -LsSf https://astral.sh/uv/install.sh | sh

RUN     uv python install 3.10

# Build UV inside of /var/backend/src (because relative path)
COPY    src .
RUN     rm -f .venv
RUN     uv sync --compile-bytecode --locked

# Stage 2 strip unused dependencies to very barebone uvicorn.
FROM    alpine:3.22.1 AS runtime
WORKDIR /var/backend/src

ENV     UV_CACHE_DIR=/home/alpine/.local
ENV     PATH=${UV_CACHE_DIR}/bin:$PATH

RUN     adduser -D alpine

COPY    --from=build --chown=alpine:alpine /var/backend/src/.venv /var/backend/venv/
COPY    --from=build --chown=alpine:alpine ${UV_CACHE_DIR} ${UV_CACHE_DIR}

USER    alpine

ENTRYPOINT  ["/var/backend/tools/entry.sh"]
