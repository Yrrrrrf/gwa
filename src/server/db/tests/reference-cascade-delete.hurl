# Reference: REFERENCE ON DELETE CASCADE on session.user.
# When a user is deleted, all their sessions should be automatically removed.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE session:hurl_cascade; DELETE user:hurl_cascade;`
HTTP 200

# Create a temp user
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE user:hurl_cascade SET email='hurl_cascade@test.com', username='hurl_cascade', password_hash='x', role='user';`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Create a session referencing that user
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE session:hurl_cascade SET user=user:hurl_cascade, session_token='hurl_abc', expires_at=time::now()+1d;`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Delete the user — cascade should remove the session
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE user:hurl_cascade;`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Verify the session was cascade-deleted (retry for async cascade)
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
[Options]
retry: 5
retry-interval: 200
`SELECT * FROM session:hurl_cascade;`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"
# The cascade should have removed the session — result must be empty
jsonpath "$[0].result" count == 0
