{
  description = "GWA · Server — rpc (Go gRPC sidecar)";

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
          name = "gwa-rpc";

          packages = groups.base ++ groups.go ++ groups.protobuf ++ [ pkgs.grpcurl ]; # also in groups.net but tests own that

          shellHook = ''
            ${groups.shell.colorVars}
            GO_V=$(go version | awk '{print $3}' | sed 's/go//')
            echo "🐹 ''${PURPLE}rpc shell ''${RESET}— go ''${CYAN}v''${GO_V}''${RESET} + buf + grpcurl"
          '';
        };
      }
    );
}
