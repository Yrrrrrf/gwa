FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y curl tzdata ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the precompiled surreal binary from the official image
COPY --from=surrealdb/surrealdb:v3 /surreal /bin/surreal

# Copy the precompiled nushell binary from the official image
COPY --from=ghcr.io/nushell/nushell:0.112.2-bookworm /usr/bin/nu /bin/nu

ENV LANG=C.UTF-8
ENV TZ=UTC

COPY scripts/ /scripts/
COPY init/    /init/

RUN chmod +x /scripts/entrypoint.nu /scripts/init-db.nu

EXPOSE 8000

ENTRYPOINT ["/bin/nu", "/scripts/entrypoint.nu"]
