
-- Claims, quote requests and featured placements.
ALTER TABLE companies ADD COLUMN claimed_email TEXT;
ALTER TABLE companies ADD COLUMN edit_token_hash TEXT;
ALTER TABLE companies ADD COLUMN contact_email TEXT;
ALTER TABLE companies ADD COLUMN contact_phone TEXT;
CREATE INDEX IF NOT EXISTS idx_companies_edit_token ON companies (edit_token_hash) WHERE edit_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS claims (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id         INTEGER NOT NULL,
  name               TEXT NOT NULL,
  title              TEXT,
  email              TEXT NOT NULL,
  phone              TEXT,
  message            TEXT,
  email_check        TEXT NOT NULL DEFAULT 'unknown',   -- 'match' | 'free-email' | 'mismatch' | 'no-website'
  status             TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  ip_hash            TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status, created_at);
CREATE INDEX IF NOT EXISTS idx_claims_company ON claims (company_id);
CREATE INDEX IF NOT EXISTS idx_claims_ip ON claims (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS leads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id     INTEGER,                      -- NULL for a category-level request
  category_slug  TEXT,
  location_slug  TEXT,
  buyer_name     TEXT NOT NULL,
  buyer_email    TEXT NOT NULL,
  buyer_company  TEXT,
  buyer_phone    TEXT,
  buyer_country  TEXT,
  message        TEXT NOT NULL,
  quantity       TEXT,
  timeline       TEXT,
  status         TEXT NOT NULL DEFAULT 'new',  -- 'new' | 'forwarded' | 'closed'
  ip_hash        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads (company_id);
CREATE INDEX IF NOT EXISTS idx_leads_ip ON leads (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS featured (
  company_id INTEGER PRIMARY KEY,
  until      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
