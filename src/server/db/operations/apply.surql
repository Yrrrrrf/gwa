BEGIN TRANSACTION;
__BODY__
CREATE migration CONTENT { version: __VERSION__, checksum: __CHECKSUM__, applied_at: time::now() };
COMMIT TRANSACTION;
