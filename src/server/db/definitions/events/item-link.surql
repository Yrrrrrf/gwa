DEFINE EVENT item_link ON item WHEN $event = "CREATE" THEN {
 LET $owner = $after.owner;
 LET $item = $after.id;
 RELATE $owner->owns->$item;
};
