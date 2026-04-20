# Function: fn::popular_items ranks items by engagement score (rating * comment_count).
# Seed data has items with comments, so at least one result is expected.

GET {{base_url}}/health
HTTP 200

# Retrieve top 3 popular items
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RETURN fn::popular_items(3);`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"
# Seed data has items with comments/ratings, so there should be popular items
jsonpath "$[0].result" count >= 1
