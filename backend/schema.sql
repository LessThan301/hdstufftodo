CREATE TABLE IF NOT EXISTS enquiries (
 id TEXT PRIMARY KEY,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 first_name TEXT NOT NULL,
 last_name TEXT NOT NULL,
 email TEXT NOT NULL,
 phone TEXT NOT NULL DEFAULT '',
 message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS enquiries_created ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_expiry ON enquiries(expires_at);
CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS limits_expiry ON request_limits(expires);
