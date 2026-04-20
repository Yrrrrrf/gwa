# Function: fn::search_items performs case-insensitive text search.
# Seed data contains 'Hiking Boots' — searching for 'hiking' should return it.

GET {{base_url}}/health
HTTP 200

# Search for 'hiking' — seed item:hiking_boots has title 'Hiking Boots'
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RETURN fn::search_items('hiking', 5);`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"
# Seed data guarantees at least one match on 'Hiking Boots'
jsonpath "$[0].result" count >= 1
