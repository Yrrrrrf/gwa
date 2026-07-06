# Index: tag_slug UNIQUE prevents duplicate slugs.
# Creating two tags with the same slug should fail on the second CREATE.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE tag:hurl_dup_slug_1; DELETE tag:hurl_dup_slug_2;`
HTTP 200

# First tag — should succeed
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE tag:hurl_dup_slug_1 SET name='Hurl Tag 1', slug='hurl_dup_slug';`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Second tag with SAME slug — unique index violation
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE tag:hurl_dup_slug_2 SET name='Hurl Tag 2', slug='hurl_dup_slug';`
HTTP 200
[Asserts]
# The UNIQUE index on tag.slug rejects the duplicate
jsonpath "$[*].status" contains "ERR"

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE tag:hurl_dup_slug_1; DELETE tag:hurl_dup_slug_2;`
HTTP 200
