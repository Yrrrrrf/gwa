{ pkgs }:

{
  # Shared shell hooks (like terminal colors).
  shell = {
    colorVars = ''
      PURPLE=$(tput setaf 5)
      CYAN=$(tput setaf 6)
      RESET=$(tput sgr0)
    '';
  };

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

  web = with pkgs; [
    deno
    bun
    # vp
  ];

  net = with pkgs; [
    hurl
    grpcurl # rpc health + tests
    xh
  ];
}
