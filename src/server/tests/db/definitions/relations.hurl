POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
[BasicAuth]
{{db_user}}: {{db_password}}
```
CREATE item:relation_test SET owner=account:fixture,title="Relation test"; SELECT * FROM owns WHERE out=item:relation_test;
```
HTTP 200
[Asserts]
jsonpath "$[0].status" == "OK"
jsonpath "$[1].result" count == 1

POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
[BasicAuth]
{{db_user}}: {{db_password}}
```
RELATE account:fixture->owns->item:relation_test;
```
HTTP 200
[Asserts]
jsonpath "$[0].status" == "ERR"

POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
[BasicAuth]
{{db_user}}: {{db_password}}
```
DELETE account:fixture;
```
HTTP 200
[Asserts]
jsonpath "$[0].status" == "ERR"
