{
  description = "GWA · Server — tests (Deno + grpcurl)";

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
          name = "gwa-tests";

          packages = groups.base ++ groups.deno ++ groups.net; # grpcurl, curl, jq, xh

          shellHook = ''
            ${groups.shell.colorVars}
            DENO_V=$(deno --version | head -n1 | awk '{print $2}')
            echo "🦕 ''${PURPLE}tests shell ''${RESET}— deno ''${CYAN}v''${DENO_V}''${RESET} + grpcurl"
          '';
        };
      }
    );
}
