[doc('Build all services')]
[group('Deploy')]
build:
    just -f src/client/client.just build
    just -f src/server/server.just build
    @echo "✓ Server built successfully"


# todo: Add more deployment targets (Tauri)
# todo: Add more deployment targets (Tauri)
# todo: Add more deployment targets (Tauri)
# * Deploy (Tauri)

# [doc('Build the Tauri app for production')]
# [group('Deploy')]
# deploy:
#     # todo: Add the Tauri build command
#     @echo "✓ Tauri app built for production"

# * Deploy (Google Cloud)

# todo: Add more deployment targets (Google Cloud)
# todo: Add more deployment targets (Google Cloud)
# todo: Add more deployment targets (Google Cloud)
# [doc('Run on remote machine via SSH')]
# [group('Deploy')]
# run-remote:
#     # todo: Add a remote setup
#     @echo "Deploying remotely..."
#     @echo "Error: Remote deployment script not yet configured."
#     exit 1
