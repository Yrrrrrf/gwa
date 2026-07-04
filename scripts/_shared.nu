# scripts/_shared.nu — cross-script helpers
# import from a justfile recipe or sibling script with:
#   use scripts/_shared.nu *

# one place owns the color scheme, so recipes never touch `ansi` directly

def "log info" [msg: string]: nothing -> nothing {
  print $"(ansi cyan_bold)»(ansi reset) ($msg)"
}

def "log ok" [msg: string]: nothing -> nothing {
  print $"(ansi green_bold)✓(ansi reset) ($msg)"
}

def "log warn" [msg: string]: nothing -> nothing {
  print $"(ansi yellow_bold)!(ansi reset) ($msg)"
}

def "log err" [msg: string]: nothing -> nothing {
  print $"(ansi red_bold)✗(ansi reset) ($msg)"
}

# closure-as-data: wrap any block and report how long it took
#   run_timed "lint" { cargo clippy --all-targets --all-features }
def run_timed [label: string, action: closure]: nothing -> nothing {
  let start = date now
  do $action
  log ok $"($label) done in ((date now) - $start)"
}
