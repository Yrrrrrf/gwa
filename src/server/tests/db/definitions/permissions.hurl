POST {{db_url}}/signup
Accept: application/json
{"NS":"{{namespace}}","DB":"{{database}}","AC":"account","email":"permissions-a@example.test","pass":"test-password-a"}
HTTP 200
[Captures]
a: jsonpath "$.token"
[Asserts]
jsonpath "$.token" isString

POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
Authorization: Bearer {{a}}
```
CREATE item:owned_a SET owner=$auth.id,title="Owner A"; SELECT * FROM account; RETURN fn::item_count();
```
HTTP 200
[Asserts]
jsonpath "$[0].status" == "OK"
jsonpath "$[1].result" count == 1
jsonpath "$[1].result[0].pass" not exists
jsonpath "$[2].result" == 1

POST {{db_url}}/signup
Accept: application/json
{"NS":"{{namespace}}","DB":"{{database}}","AC":"account","email":"permissions-b@example.test","pass":"test-password-b"}
HTTP 200
[Captures]
b: jsonpath "$.token"
[Asserts]
jsonpath "$.token" isString

POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
Authorization: Bearer {{b}}
```
SELECT * FROM item:owned_a; CREATE item:owned_b SET owner=$auth.id,title="Owner B"; RETURN fn::item_count();
```
HTTP 200
[Asserts]
jsonpath "$[0].result" count == 0
jsonpath "$[1].status" == "OK"
jsonpath "$[2].result" == 1

POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
Authorization: Bearer {{a}}
```
UPDATE item:owned_b SET title="Unauthorized"; SELECT * FROM owns; RETURN fn::item_count();
```
HTTP 200
[Asserts]
jsonpath "$[0].result" count == 0
jsonpath "$[1].result" count == 1
jsonpath "$[2].result" == 1

POST {{db_url}}/signin
Accept: application/json
{"NS":"{{namespace}}","DB":"{{database}}","AC":"account","email":"permissions-a@example.test","pass":"test-password-a"}
HTTP 200
[Asserts]
jsonpath "$.token" isString
