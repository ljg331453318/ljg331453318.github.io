CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0)
);

INSERT OR IGNORE INTO page_views (id, view_count) VALUES ('homepage', 0);
