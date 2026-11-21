CREATE TABLE IF NOT EXISTS dao_profiles (
 id TEXT PRIMARY KEY, secret TEXT NOT NULL, progress TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 0,
 last_chat INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dao_presence (
 session TEXT PRIMARY KEY, profile TEXT NOT NULL, room TEXT NOT NULL, name TEXT NOT NULL,
 x REAL NOT NULL, z REAL NOT NULL, area TEXT NOT NULL, updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS dao_presence_room ON dao_presence(room, updated);
CREATE TABLE IF NOT EXISTS dao_messages (
 id TEXT PRIMARY KEY, profile TEXT NOT NULL, room TEXT NOT NULL, name TEXT NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS dao_messages_room ON dao_messages(room, created);
