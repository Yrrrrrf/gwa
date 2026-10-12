ARG DB_VERSION
FROM alpine:3.22 AS tools
ARG NU_VERSION
RUN apk add --no-cache curl tar && \
    case "$(uname -m)" in x86_64) arch=x86_64 ;; aarch64) arch=aarch64 ;; *) exit 1 ;; esac && \
    curl -fsSL "https://github.com/nushell/nushell/releases/download/${NU_VERSION}/nu-${NU_VERSION}-${arch}-unknown-linux-musl.tar.gz" | tar -xz -C /tmp && \
    find /tmp -type f -name nu -exec cp {} /bin/nu \; && mkdir /data && chmod 0770 /data
FROM surrealdb/surrealdb:v${DB_VERSION}
COPY --from=tools /bin/nu /bin/nu
COPY --from=tools --chown=65532:65532 /data /data
USER 65532:65532
ENTRYPOINT ["/surreal"]
