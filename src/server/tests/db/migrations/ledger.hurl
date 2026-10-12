POST {{db_url}}/sql
Accept: application/json
Content-Type: text/plain
surreal-ns: {{namespace}}
surreal-db: {{database}}
[BasicAuth]
{{db_user}}: {{db_password}}
```
SELECT version,checksum FROM migration ORDER BY version; INFO FOR TABLE item; SELECT * FROM migration_lock;
```
HTTP 200
[Asserts]
jsonpath "$[0].result" count == 2
jsonpath "$[0].result[0].version" == "0001-baseline"
jsonpath "$[1].result.fields.note" contains "none | string"
jsonpath "$[2].result" count == 0
