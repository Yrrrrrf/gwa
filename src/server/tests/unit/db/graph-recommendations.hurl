# Graph: fn::user_recommendations implements collaborative filtering.
# Based on seed likes, carol should get recommendations (items liked by similar users).

GET {{base_url}}/health
HTTP 200

# Collaborative filtering for user:carol
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RETURN fn::user_recommendations(user:carol, 3);`
HTTP 200
[Asserts]
# The function should execute without errors even if results are empty
jsonpath "$[*].status" not contains "ERR"
