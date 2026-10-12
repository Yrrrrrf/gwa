DEFINE INDEX account_email ON account FIELDS email UNIQUE;
DEFINE INDEX owns_unique ON owns FIELDS in, out UNIQUE;
DEFINE INDEX item_owner ON item FIELDS owner;
