# Event: on_comment_created fires an activity record of type 'comment.created'.
# Creating a comment should asynchronously produce an activity entry.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
```
DELETE item:hurl_evt_comment;
DELETE activity WHERE type = 'comment.created' AND target_item = item:hurl_evt_comment;
```
HTTP 200

# Create a temp item for the comment
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE item:hurl_evt_comment SET title='Hurl Comment Event', status='active', tags=[];`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Add a comment — this should trigger the on_comment_created event
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RELATE user:alice->comment->item:hurl_evt_comment SET rating=5, body='Hurl test comment';`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Verify the activity record was created (retry for eventual consistency)
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
[Options]
retry: 5
retry-interval: 200
`SELECT * FROM activity WHERE type = 'comment.created' AND target_item = item:hurl_evt_comment;`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"
# The event fires asynchronously — retry until the activity appears
jsonpath "$[0].result" count >= 1

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
```
DELETE comment WHERE out = item:hurl_evt_comment;
DELETE activity WHERE type = 'comment.created' AND target_item = item:hurl_evt_comment;
DELETE item:hurl_evt_comment;
```
HTTP 200
