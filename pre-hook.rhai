// gwa/pre-hook.rhai (Robust and Compatible Version)

// Get the values provided by the user.
let author = variable::get("author_name");
let project = variable::get("project_name");

// --- Manually create a URL-safe slug for the author's name ---
let author_slug = "";
let last_char_was_hyphen = false;

for (ch, i) in author {
    // Convert character to lowercase manually
    let lower_ch = if ch >= 'A' && ch <= 'Z' {
        // This is a simplified ASCII lowercase conversion
        (ch.to_int() + 32).to_char()
    } else {
        ch
    };

    // Replace spaces and invalid characters with a hyphen,
    // and avoid consecutive hyphens.
    if (lower_ch >= 'a' && lower_ch <= 'z') || (lower_ch >= '0' && lower_ch <= '9') {
        author_slug += lower_ch;
        last_char_was_hyphen = false;
    } else if !last_char_was_hyphen {
        author_slug += "-";
        last_char_was_hyphen = true;
    }
}

// Construct the final package name string using standard '+' concatenation.
let package_name = "@" + author_slug + "/" + project;

// Set the new, simple placeholder.
variable::set("deno_package_name", package_name);

// Optional: Print to the console for debugging during generation.
print("INFO: Generated deno package name: " + package_name);