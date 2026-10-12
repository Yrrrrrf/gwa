POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
[BasicAuth]
{{db_user}}: {{db_password}}
```
CREATE account:invalid_email SET email="bad",pass="test";
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
CREATE account:duplicate_email SET email="fixture@example.test",pass="test";
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
RELATE account:missing->owns->item:missing;
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
CREATE item:typed_owner SET owner=17,title="Type test";
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
UPDATE item:fixture SET created_at=time::now()-1h;
```
HTTP 200
[Asserts]
jsonpath "$[0].status" == "ERR"
