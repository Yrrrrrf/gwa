# dev.just — development, watch mode, and workspace lifecycle

[doc('Run CLI in watch mode')]
[group('dev')]
dev *flags:
    {{ CLI }} dev {{ flags }}

[doc('Prepare CLI dependencies')]
[group('dev')]
prepare:
    {{ CLI }} prepare

[doc('Prune CLI caches')]
[group('dev')]
prune:
    {{ CLI }} prune
