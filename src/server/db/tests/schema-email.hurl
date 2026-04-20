# Schema: email field must pass string::is_email assertion.
# A non-email value should be rejected by the ASSERT on the user.email field.
# Also verifies a valid user can be created (positive half).

GET {{base_url}}/health
HTTP 200

# Preamble cleanup — remove leftover test data from a crashed prior run
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE user:hurl_email_bad; DELETE user:hurl_email_good;`
HTTP 200

# Negative: email without @ should be rejected
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE user:hurl_email_bad SET email='not-an-email', username='hurl_bad', password_hash='x', role='user';`
HTTP 200
[Asserts]
# The ASSERT on user.email rejects any string that fails string::is_email
jsonpath "$[*].status" contains "ERR"

# Positive: valid email succeeds
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE user:hurl_email_good SET email='hurl_valid@test.com', username='hurl_good', password_hash='x', role='user';`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE user:hurl_email_bad; DELETE user:hurl_email_good;`
HTTP 200
