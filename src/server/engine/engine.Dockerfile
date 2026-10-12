ARG DB_IMAGE
ARG RUST_VERSION
FROM ${DB_IMAGE} AS tools
FROM rust:${RUST_VERSION}-slim-bookworm AS build
WORKDIR /app
COPY config/contracts /app/config/contracts
COPY engine /app/engine
RUN cd engine && cargo build --locked --release && mkdir -p /artifacts && chmod 0770 /artifacts
FROM gcr.io/distroless/cc-debian12:nonroot
COPY --from=build /app/engine/target/release/gwa-server /bin/gwa-server
COPY --from=tools /bin/nu /bin/nu
COPY --from=build --chown=65532:65532 /artifacts /artifacts
USER 65532:65532
ENTRYPOINT ["/bin/gwa-server"]
