[doc('Run server CI pipeline (check + test)')]
[group('ci')]
ci: check test

[doc('Placeholder — nothing to purge/reinstall here yet')]
[group('ci')]
prepare:
    @print "prepare: not implemented on server side yet"