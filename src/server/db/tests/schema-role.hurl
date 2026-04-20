# Schema: role field must be one of ['admin', 'owner', 'user'].
# A role outside the allowed list should be rejected by the ASSERT.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE user:hurl_role_bad;`
HTTP 200

# Negative: invalid role 'hacker' rejected
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE user:hurl_role_bad SET email='role@hurl.com', username='hurl_role', password_hash='x', role='hacker';`
HTTP 200
[Asserts]
# The ASSERT $value IN ['admin','owner','user'] rejects 'hacker'
jsonpath "$[*].status" contains "ERR"

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE user:hurl_role_bad;`
HTTP 200
