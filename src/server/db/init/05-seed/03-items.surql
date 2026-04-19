-- =============================================================================
-- Template — Seed: Items
-- =============================================================================

CREATE item:hiking_boots SET 
    title       = 'Hiking Boots', 
    description = 'Durable boots for all terrains', 
    status      = 'active', 
    tags        = [tag:travel, tag:sports], 
    coordinates = { type: 'Point', coordinates: [-99.1332, 19.4326] },
    created_at  = time::now(),
    updated_at  = time::now();

CREATE item:keyboard SET 
    title       = 'Mechanical Keyboard', 
    description = 'Clicky keys for fast typing', 
    status      = 'active', 
    tags        = [tag:tech, tag:gaming],
    created_at  = time::now(),
    updated_at  = time::now();

CREATE item:tacos SET 
    title       = 'Street Tacos', 
    description = 'Best tacos in town', 
    status      = 'active', 
    tags        = [tag:food],
    created_at  = time::now(),
    updated_at  = time::now();

CREATE item:concert_tickets SET 
    title       = 'Jazz Concert', 
    description = 'Friday night jazz', 
    status      = 'active', 
    tags        = [tag:music],
    created_at  = time::now(),
    updated_at  = time::now();

CREATE item:tent SET 
    title       = 'Camping Tent', 
    description = 'Sleep under the stars', 
    status      = 'active', 
    tags        = [tag:travel, tag:sports], 
    coordinates = { type: 'Point', coordinates: [-99.1340, 19.4330] },
    created_at  = time::now(),
    updated_at  = time::now();

CREATE item:laptop SET 
    title       = 'Pro Laptop', 
    description = 'High performance workstation', 
    status      = 'active', 
    tags        = [tag:tech],
    created_at  = time::now(),
    updated_at  = time::now();
