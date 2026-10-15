{ pkgs, nixpkgs, system, defaultShell }:
rec {

        desktop = pkgs.mkShell {
          name = "gwa-client-desktop";
          inputsFrom = [ defaultShell ];
          packages = [ pkgs.rustup ];
          nativeBuildInputs = [ pkgs.pkg-config ];
          buildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux (
            with pkgs; [
              gtk3
              glib
              dbus
              webkitgtk_4_1
              libsoup_3
              openssl
              librsvg
              glib-networking
              gsettings-desktop-schemas
            ]
          );
          shellHook = pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
            export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:''${XDG_DATA_DIRS:-}"
            export GIO_EXTRA_MODULES="${pkgs.glib-networking}/lib/gio/modules''${GIO_EXTRA_MODULES:+:$GIO_EXTRA_MODULES}"
          '';
        };

        android =
          let
            androidPkgs = import nixpkgs {
              inherit system;
              config = {
                allowUnfree = true;
                android_sdk.accept_license = true;
              };
            };
            buildToolsVersion = "37.0.0";
            androidComposition = androidPkgs.androidenv.composeAndroidPackages {
              # Tauri's Android library compiles against 36; the app uses 37.
              platformVersions = [ "36" "37.0" ];
              # AGP 9.3.1 defaults to 36.0.0; retain 37.0.0 for the AAPT2 override.
              buildToolsVersions = [ "36.0.0" buildToolsVersion ];
              cmdLineToolsVersion = "22.0";
              platformToolsVersion = "37.0.1";
              includeNDK = true;
              ndkVersions = [ "29.0.14206865" ];
              toolsVersion = null;
              includeCmake = false;
              includeEmulator = false;
              includeSystemImages = false;
            };
            # Tauri CLI 2.12.1 uses compileSdk 37; nixpkgs names its base SDK 37.0.
            androidSdk = androidPkgs.symlinkJoin {
              name = "gwa-android-sdk";
              paths = [ androidComposition.androidsdk ];
              postBuild = ''
                ln -s android-37.0 "$out/libexec/android-sdk/platforms/android-37"
              '';
            };
            sdkRoot = "${androidSdk}/libexec/android-sdk";
          in
          pkgs.mkShell {
            name = "gwa-client-android";
            # The default native build produces both the desktop app and APK.
            inputsFrom = [ desktop ];
            packages = [
              androidSdk
              androidPkgs.jdk21
              pkgs.rustup
            ];
            JAVA_HOME = "${androidPkgs.jdk21}";
            ANDROID_HOME = sdkRoot;
            NDK_HOME = "${sdkRoot}/ndk/29.0.14206865";
            ANDROID_NDK_ROOT = "${sdkRoot}/ndk/29.0.14206865";
            GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${sdkRoot}/build-tools/${buildToolsVersion}/aapt2";
          };
}
