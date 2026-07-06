# Schema: item status must be one of ['draft', 'active', 'archived'].
# A status outside the allowed list should be rejected.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE item:hurl_status_bad;`
HTTP 200

# Negative: invalid status 'deleted' rejected
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE item:hurl_status_bad SET title='Bad Status', status='deleted', tags=[];`
HTTP 200
[Asserts]
# The ASSERT $value IN ['draft','active','archived'] rejects 'deleted'
jsonpath "$[*].status" contains "ERR"

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE item:hurl_status_bad;`
HTTP 200
