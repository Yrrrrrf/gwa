USE NS app; USE DB main;
-- =============================================================================
-- Template — Seed: Comments
-- =============================================================================

RELATE user:carol->comment->item:hiking_boots SET rating=5, body='Best boots ever!';
RELATE user:dave->comment->item:hiking_boots SET rating=4, body='A bit heavy but solid.';
RELATE user:carol->comment->item:keyboard SET rating=5, body='Love the blue switches.';
RELATE user:dave->comment->item:keyboard SET rating=5, body='Typing speed increased 20%.';
RELATE user:carol->comment->item:tacos SET rating=4, body='Spicy but delicious.';
RELATE user:dave->comment->item:tacos SET rating=5, body='Authentic taste.';
RELATE user:carol->comment->item:concert_tickets SET rating=5, body='Incredible performance.';
RELATE user:dave->comment->item:concert_tickets SET rating=4, body='Crowded but fun.';
RELATE user:carol->comment->item:tent SET rating=3, body='Hard to set up.';
RELATE user:dave->comment->item:tent SET rating=5, body='Spacious and dry.';
