# Schema: comment rating must be >= 1 AND <= 5.
# A rating of 6 should be rejected by the ASSERT on comment.rating.

GET {{base_url}}/health
HTTP 200

# Negative: rating=6 exceeds the allowed range
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RELATE user:alice->comment->item:hiking_boots CONTENT { rating: 6, body: 'Too good!' };`
HTTP 200
[Asserts]
# ASSERT $value >= 1 AND $value <= 5 rejects 6
jsonpath "$[*].status" contains "ERR"
