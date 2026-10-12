DEFINE FIELD email ON account TYPE string ASSERT string::is_email($value);
DEFINE FIELD pass ON account TYPE string PERMISSIONS FOR select NONE;
DEFINE FIELD created_at ON account TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD owner ON item TYPE record<account> REFERENCE ON DELETE REJECT;
DEFINE FIELD title ON item TYPE string ASSERT string::len(string::trim($value)) > 0;
DEFINE FIELD created_at ON item TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD updated_at ON item TYPE datetime VALUE time::now();
DEFINE FIELD linked_at ON owns TYPE datetime DEFAULT time::now() READONLY;
