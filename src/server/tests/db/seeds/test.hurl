POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
[BasicAuth]
{{db_user}}: {{db_password}}
```
SELECT title FROM item:fixture; SELECT * FROM account:development;
```
HTTP 200
[Asserts]
jsonpath "$[0].result[0].title" == "Test example"
jsonpath "$[1].result" count == 0
