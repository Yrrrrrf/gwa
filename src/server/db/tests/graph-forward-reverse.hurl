# Graph: forward and reverse traversals across the likes relation.
# Seed data has user:bob liking several items and item:hiking_boots liked by several users.

GET {{base_url}}/health
HTTP 200

# Forward traversal: items that user:bob likes
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`SELECT ->likes->item AS liked FROM user:bob;`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"
# Seed gives bob likes on hiking_boots, keyboard, tacos, concert_tickets
jsonpath "$[0].result[0].liked" count >= 1

# Reverse traversal: users who liked item:hiking_boots
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`SELECT <-likes<-user AS liked_by FROM item:hiking_boots;`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"
# Seed gives hiking_boots likes from carol, dave, bob, alice
jsonpath "$[0].result[0].liked_by" count >= 1
