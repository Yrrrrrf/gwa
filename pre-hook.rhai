// gwa/pre-hook.rhai (Ultra-Minimalist, Pure ASCII Math Version)

// Get the values provided by the user.
let author = variable::get("author_name");
let project = variable::get("project_name");

// --- Manually create a URL-safe slug for the author's name ---
let author_slug = "";
let last_char_was_hyphen = false;

// ASCII values for 'A', 'Z', 'a', 'z', '0', '9'
const A = 65; const Z = 90;
const a = 97; const z = 122;
const zero = 48; const nine = 57;
const space = 32;

for (ch, i) in author {
    let ascii_val = ch.to_int();
    let lower_ascii = if ascii_val >= A && ascii_val <= Z {
        ascii_val + 32
    } else {
        ascii_val
    };

    if (lower_ascii >= a && lower_ascii <= z) || (lower_ascii >= zero && lower_ascii <= nine) {
        // Here's the key difference: we cannot rely on `to_char()`.
        // We have to build up the string from existing characters.
        // So, we iterate through the original 'author' string again to find the char.
        // This is inefficient but guaranteed to work without external functions.
        for (original_ch, j) in author {
            if i == j {
                author_slug += original_ch.to_lowercase();
                break;
            }
        }
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