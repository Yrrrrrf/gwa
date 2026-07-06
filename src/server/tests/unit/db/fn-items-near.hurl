# Function: fn::items_near performs geospatial radius search.
# We create a geo-tagged item and search near its coordinates.

GET {{base_url}}/health
HTTP 200

# Preamble cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE item:hurl_geo;`
HTTP 200

# Create an item with known coordinates (NYC area)
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`CREATE item:hurl_geo SET title='Hurl Geo Item', status='active', coordinates=(-74.0060, 40.7128), tags=[];`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"

# Search within 10km of the same point — should find our item
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`RETURN fn::items_near((-74.0060, 40.7128), 10);`
HTTP 200
[Asserts]
jsonpath "$[*].status" not contains "ERR"
# The item we just created is at the exact search point — must be in results
jsonpath "$[0].result" count >= 1

# Cleanup
POST {{base_url}}/sql
Surreal-NS: {{ns}}
Surreal-DB: {{db}}
Accept: application/json
Content-Type: text/plain
`DELETE item:hurl_geo;`
HTTP 200
