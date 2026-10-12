DEFINE FUNCTION fn::item_count() -> int { RETURN array::len(SELECT id FROM item); } PERMISSIONS WHERE $auth.id != NONE;
