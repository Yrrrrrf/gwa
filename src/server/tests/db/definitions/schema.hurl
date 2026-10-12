POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
[BasicAuth]
{{db_user}}: {{db_password}}
```
CREATE item:schema_empty SET owner=account:fixture,title="";
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
CREATE item:schema_unknown SET owner=account:fixture,title="valid",unexpected=true;
```
HTTP 200
[Asserts]
jsonpath "$[0].status" == "ERR"
