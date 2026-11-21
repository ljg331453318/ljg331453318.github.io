CREATE TABLE IF NOT EXISTS dao_submissions (
 id TEXT PRIMARY KEY, profile TEXT NOT NULL, payload TEXT NOT NULL,
 status TEXT NOT NULL, consent INTEGER NOT NULL DEFAULT 0,
 submitted_at INTEGER, decided_at INTEGER, features TEXT,
 created INTEGER NOT NULL, updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS dao_submissions_owner ON dao_submissions(profile,created);
CREATE INDEX IF NOT EXISTS dao_submissions_learning ON dao_submissions(consent,status,submitted_at);
