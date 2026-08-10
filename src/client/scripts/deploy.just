# Plugins shipped in the published rune-lab package. Canonical registry and dependency facts live in scripts/plugins.ts

[doc('Build the rune-lab package: deno.json -> build/{dist, package.json, README, LICENSE}')]
[group('Build')]
build:
    # * Clean previous build
    rm -rf build
    # * Compile i18n messages → paraglide runtime
    # just _paraglide src/packages/plugins/i18n/src/lang/project.inlang src/packages/plugins/i18n/src/lang/paraglide
    # * Bundle workspace members: core + ui always, plugins from BUILD_PLUGINS
    -biome format --write --vcs-use-ignore-file=false ./build
    -biome check --fix --vcs-use-ignore-file=false ./build
    @echo "✓ build done"

[working-directory('build')]
_with-brave +cmd:
    #!/usr/bin/env nu
    let d = (mktemp -d)
    "#!/usr/bin/env nu\ndef main [...args] { exec brave ...$args }" | save -f $"($d)/xdg-open"
    chmod +x $"($d)/xdg-open"
    with-env { PATH: ($env.PATH | prepend $d) } { {{ cmd }} }
    print "✓ {{ cmd }} done"

[doc('Publish build/ to npm')]
[group('Deploy')]
publish: build (_with-brave "bun publish")

[doc('npm login')]
[group('Deploy')]
login: (_with-brave "bunx npm login")

[doc('Inject the built pkg (build/) into lab for local testing')]
[group('Deploy')]
inject root=justfile_directory(): build prepare
    #!/usr/bin/env nu
    let lab_modules = $"{{ root }}/apps/lab/node_modules"
    # * Replace lab's installed rune-lab with the freshly built build/ layout
    rm -rf $"($lab_modules)/rune-lab"
    cp -r $"{{ root }}/build" $"($lab_modules)/rune-lab"
    # * Verify the injection
    diff -r $"{{ root }}/build" $"($lab_modules)/rune-lab"
    print "✓ injected into node_modules/rune-lab"

