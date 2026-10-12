DEFINE TABLE account SCHEMAFULL PERMISSIONS FOR select WHERE id = $auth.id FOR create, update, delete NONE;
DEFINE TABLE item SCHEMAFULL PERMISSIONS FOR select, create, update, delete WHERE owner = $auth.id;
DEFINE TABLE owns TYPE RELATION IN account OUT item ENFORCED SCHEMAFULL PERMISSIONS FOR select WHERE in = $auth.id FOR create, update, delete NONE;
