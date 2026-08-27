# _shared.just — shared configuration and self-referencing entrypoint

PROJECT := "gwa-cli"
CLI_DIR := parent_directory(source_directory())
CLI := "deno run -A " + CLI_DIR / "src/cli.ts"
