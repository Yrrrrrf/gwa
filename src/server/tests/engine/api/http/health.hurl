GET {{http_url}}/health
HTTP 200
[Asserts]
jsonpath "$.alive" == true

GET {{http_url}}/ready
HTTP 200
[Asserts]
jsonpath "$.ready" == true

GET {{http_url}}/api
HTTP 401
[Asserts]
jsonpath "$.code" == "unauthorized"

PUT {{http_url}}/health
HTTP 405
