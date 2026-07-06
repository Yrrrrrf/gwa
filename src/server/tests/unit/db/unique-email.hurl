# Index: user_email UNIQUE prevents duplicate emails.
# Creating two users with the same email should fail on the second CREATE.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE user:hurl_dup_email_1; DELETE user:hurl_dup_email_2;`
HTTP 200

# First user with the email — should succeed
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE user:hurl_dup_email_1 SET email='hurl_dup@test.com', username='hurl_dup1', password_hash='x', role='user';`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Second user with the SAME email — should fail on the unique index
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE user:hurl_dup_email_2 SET email='hurl_dup@test.com', username='hurl_dup2', password_hash='x', role='user';`
HTTP 200
[Asserts]
# The UNIQUE index on email rejects the second insert
jsonpath "$[*].status" contains "ERR"

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE user:hurl_dup_email_1; DELETE user:hurl_dup_email_2;`
HTTP 200
