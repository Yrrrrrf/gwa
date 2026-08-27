// fs.ts — Filesystem and path utilities re-exported via JSR
export { basename, dirname, join, relative } from "jsr:@std/path@1.0.8";
export { existsSync, walkSync } from "jsr:@std/fs@1.0.14";
