-- =============================================================================
-- Template — Table Definitions
-- Pipeline order: tables → fields → indexes → functions → events → seed
-- =============================================================================


-- Core domain
DEFINE TABLE user     SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE session  SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE item     SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE tag      SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE activity SCHEMAFULL PERMISSIONS FULL;

-- Relations (Graph)
DEFINE TABLE comment SCHEMAFULL TYPE RELATION IN user OUT item PERMISSIONS FULL;
DEFINE TABLE likes   SCHEMAFULL TYPE RELATION IN user OUT item PERMISSIONS FULL;
