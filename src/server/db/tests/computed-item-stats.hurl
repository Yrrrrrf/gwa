# Event: on_comment_created updates item.rating and item.comment_count.
# After adding comments, the item's computed stats should reflect the averages.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
```
DELETE comment WHERE out = item:hurl_computed;
DELETE item:hurl_computed;
```
HTTP 200

# Create a fresh item — rating/comment_count default to 0
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE item:hurl_computed SET title='Computed Stats Test', status='active', tags=[];`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Verify initial state: rating=0, comment_count=0
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`SELECT rating, comment_count FROM item:hurl_computed;`
HTTP 200
[Asserts]
jsonpath "$[0].result[0].rating" == 0
jsonpath "$[0].result[0].comment_count" == 0

# Add first comment with rating=5
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RELATE user:alice->comment->item:hurl_computed SET rating=5, body='Five stars';`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Verify after first comment: comment_count=1, rating=5 (retry for event)
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
[Options]
retry: 5
retry-interval: 200
`SELECT rating, comment_count FROM item:hurl_computed;`
HTTP 200
[Asserts]
jsonpath "$[0].result[0].comment_count" == 1
jsonpath "$[0].result[0].rating" == 5.0

# Add second comment with rating=1
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RELATE user:bob->comment->item:hurl_computed SET rating=1, body='One star';`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Verify after second comment: comment_count=2, rating=3.0 (mean of 5+1)
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
[Options]
retry: 5
retry-interval: 200
`SELECT rating, comment_count FROM item:hurl_computed;`
HTTP 200
[Asserts]
jsonpath "$[0].result[0].comment_count" == 2
jsonpath "$[0].result[0].rating" == 3.0

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
```
DELETE comment WHERE out = item:hurl_computed;
DELETE item:hurl_computed;
```
HTTP 200
