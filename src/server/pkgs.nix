# Shared package groups — single source of truth for which tools each
# component needs. Sub-flakes import this via a `flake = false` path input
# and pick the groups they want; the root flake unions them all into a
# kitchen-sink dev shell.
#
# Add a tool here once, reference it from N flakes. Don't sprinkle
# `with pkgs; [ ... ]` blocks across sub-flakes for tools more than one
# component needs.

{ pkgs }:

{
  # Universal — every shell gets these.
  # `just` runs every sub-Justfile; `git` is needed for buf-breaking and
  # general repo hygiene.
  base = with pkgs; [
    just
    git
  ];

  # Container runtime — db owns the SurrealDB image; tests may spawn
  # ephemerals later.
  container = with pkgs; [
    podman
    podman-compose
  ];

  # Protobuf toolchain — engine consumes it via tonic-build, rpc via
  # buf generate, proto for lint/format/breaking checks.
  protobuf = with pkgs; [
    protobuf
    buf
  ];

  # Rust — engine only.
  rust = with pkgs; [
    cargo
    rustc
    rustfmt
    clippy
  ];

  # Go — rpc only.
  go = with pkgs; [
    go
  ];

  # Deno — tests only.
  deno = with pkgs; [
    deno
  ];

  # Network/observability — used by init-db.sh, health probes, fixtures,
  # and rpc preflight (grpcurl).
  net = with pkgs; [
    curl # init-db.sh, health probes
    xh # fixture scripts
    jq # JSON parsing in shell
    grpcurl # rpc health + tests
  ];
}
