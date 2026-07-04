{
  description = "gwa template — reproducible project env";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {nixpkgs, ...}: let
    supportedSystems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forEachSupportedSystem = f:
      nixpkgs.lib.genAttrs supportedSystems (system:
        f {
          pkgs = import nixpkgs {inherit system;};
        });
  in {
    # `nix develop` (or direnv, via .envrc) loads this environment.
    # Root shell = the very basics shared by the whole template.
    # Each subproject (client / engine / rpc / cli) grows its own
    # flake later, so nobody loads a big env for just one part.
    devShells = forEachSupportedSystem ({pkgs}: {
      default = pkgs.mkShell {
        # tools that run on the host; pkg-config's setup hook is what
        # assembles PKG_CONFIG_PATH from buildInputs below
        nativeBuildInputs = with pkgs; [
          pkg-config
          just
          nushell
          protobuf
        ];
        # libraries the build links against
        buildInputs = with pkgs; [
          openssl
        ];
      };
    });

    # `nix run .` executes the app below (devShells is for `nix develop`,
    # apps is for `nix run`). Disabled until the template has a canonical
    # entry point — likely a nu-shebang wrapper around the engine binary.
    # apps = forEachSupportedSystem ({pkgs}: {
    #   default = {
    #     type = "app";
    #     program = "${pkgs.writeScriptBin "gwa" ''
    #       #!${pkgs.nushell}/bin/nu
    #       cargo run --manifest-path src/server/engine/Cargo.toml
    #     ''}/bin/gwa";
    #   };
    # });
  };
}
