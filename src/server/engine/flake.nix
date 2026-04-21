{
  description = "GWA · Server — engine (Rust gateway + workspace)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    shared = {
      url = "path:..";
      flake = false;
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      shared,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        groups = import "${shared}/pkgs.nix" { inherit pkgs; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "gwa-engine";

          packages = groups.base ++ groups.rust ++ groups.protobuf; # required by tonic-prost-build at build.rs time

          shellHook = ''
            ${groups.shell.colorVars}
            RUSTC_V=$(rustc --version | awk '{print $2}')
            echo "🦀 ''${PURPLE}engine shell ''${RESET}— rustc ''${CYAN}v''${RUSTC_V}''${RESET} + protobuf"
          '';
        };
      }
    );
}
