# Stage 1 build uv as optimized bytecode.
FROM    alpine:3.22.1 AS build
WORKDIR /var/backend/src

# The magic is here.
ENV     UV_CACHE_DIR=/home/alpine/.local
ENV     UV_PYTHON_INSTALL_DIR=/usr/share/uv/python

# Setup dependencies, and user
RUN     apk add --no-cache uv

# Build UV inside of /var/backend/src (because relative path)
COPY    src .
RUN     rm -f .venv
RUN     uv sync --compile-bytecode --locked

# Stage 2 strip unused dependencies to very barebone uvicorn.
FROM    alpine:3.22.1 AS runtime
WORKDIR /var/backend/src

ENV     UV_CACHE_DIR=/home/alpine/.local
ENV     UV_PYTHON_INSTALL_DIR=/usr/share/uv/python

RUN     adduser -D alpine

COPY    --from=build /usr/share/uv /usr/share/uv
COPY    --from=build --chown=alpine:alpine /var/backend/src/.venv /var/backend/venv/
COPY    --from=build --chown=alpine:alpine ${UV_CACHE_DIR} ${UV_CACHE_DIR}

USER    alpine

ENTRYPOINT  ["/var/backend/tools/entry.sh"]
