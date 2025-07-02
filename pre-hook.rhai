// gwa/pre-hook.rhai (Corrected and Final Version)

// Get the values provided by the user or from defaults.
let author = variable::get("author_name");
let project = variable::get("project_name");

// --- FIX: Use standard Rhai functions for string manipulation ---
// 1. Convert author name to lowercase.
let author_lower = author.to_lowercase();
// 2. Replace all whitespace sequences with a single hyphen.
//    Rhai's 'replace' function does not support regex, so we do it simply.
//    This will handle most common names like "Test User" -> "test-user".
let author_slug = author_lower.replace(" ", "-");

// Construct the final package name string using standard '+' concatenation.
let package_name = "@" + author_slug + "/" + project;

// Create a NEW, simple placeholder with the final computed value.
// The 'deno.json' file will use this simple placeholder.
variable::set("deno_package_name", package_name);

// Optional: Print to the console for debugging during generation.
print("INFO: Generated deno package name: " + package_name);