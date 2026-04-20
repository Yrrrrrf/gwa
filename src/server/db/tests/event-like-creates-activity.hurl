# Event: on_item_liked fires an activity record of type 'item.liked'.
# Creating a like should asynchronously produce an activity entry.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
```
DELETE item:hurl_evt_like;
DELETE activity WHERE type = 'item.liked' AND target_item = item:hurl_evt_like;
```
HTTP 200

# Create a temp item
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE item:hurl_evt_like SET title='Hurl Like Event', status='active', tags=[];`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Like the item — should trigger on_item_liked event
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RELATE user:bob->likes->item:hurl_evt_like;`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Verify the activity was created (retry for eventual consistency)
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
[Options]
retry: 5
retry-interval: 200
`SELECT * FROM activity WHERE type = 'item.liked' AND target_item = item:hurl_evt_like;`
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
DELETE likes WHERE out = item:hurl_evt_like;
DELETE activity WHERE type = 'item.liked' AND target_item = item:hurl_evt_like;
DELETE item:hurl_evt_like;
```
HTTP 200
