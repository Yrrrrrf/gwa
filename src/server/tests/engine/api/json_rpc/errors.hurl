POST {{http_url}}/rpc
Authorization: Bearer {{api_token}}
{"jsonrpc":"2.0","id":1,"method":"unknown.operation"}
HTTP 200
[Asserts]
jsonpath "$.error.code" == -32601
jsonpath "$.id" == 1
