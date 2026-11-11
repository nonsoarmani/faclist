-- FacList D1 schema. Run: npm run db:init:local / db:init:remote
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  meta_title_template   TEXT NOT NULL,
  description_template  TEXT NOT NULL,
  section               TEXT NOT NULL DEFAULT 'manufacturing'   -- 'manufacturing' or 'trade' (Import & Export)
);

CREATE TABLE IF NOT EXISTS certifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,          -- 'ISO-9001'
  slug        TEXT NOT NULL UNIQUE,          -- 'iso-9001' (lowercase code, used in URLs)
  authority   TEXT,
  description TEXT
);

-- Resolves the [country-or-state] URL segment. Use unique slugs (e.g. 'georgia-us' vs 'georgia').
CREATE TABLE IF NOT EXISTS locations (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('country','state')),
  country_code  TEXT NOT NULL,
  country_name  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  state_slug      TEXT,
  country         TEXT NOT NULL,
  country_code    TEXT NOT NULL,
  country_slug    TEXT NOT NULL,
  lat             REAL,
  lng             REAL,
  website         TEXT,
  employee_count  INTEGER,
  revenue_tier    TEXT CHECK (revenue_tier IN ('micro','small','mid','large','enterprise')),
  claimed_status  INTEGER NOT NULL DEFAULT 0 CHECK (claimed_status IN (0,1)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  year_founded    INTEGER,
  company_type    TEXT,
  sales_range     TEXT,
  industries      TEXT,
  capabilities    TEXT,
  products        TEXT,
  data_source     TEXT,
  employee_range  TEXT,
  claimed_email   TEXT,
  edit_token_hash TEXT,
  contact_email   TEXT,
  contact_phone   TEXT
);

CREATE INDEX IF NOT EXISTS idx_companies_country ON companies (country_slug);
CREATE INDEX IF NOT EXISTS idx_companies_state   ON companies (state_slug);

CREATE TABLE IF NOT EXISTS company_categories (
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  company_id  INTEGER NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
  PRIMARY KEY (category_id, company_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_cc_company ON company_categories (company_id);

CREATE TABLE IF NOT EXISTS company_certifications (
  certification_id INTEGER NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  company_id       INTEGER NOT NULL REFERENCES companies(id)      ON DELETE CASCADE,
  PRIMARY KEY (certification_id, company_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_cx_company ON company_certifications (company_id);

-- Full-text search (powers /search). Kept in sync by the importer.
CREATE VIRTUAL TABLE IF NOT EXISTS company_search USING fts5(
  name, city, state, country, categories, description, details,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Pre-computed counts and facets, so a page view never has to scan thousands of rows (keeps D1 reads low).
-- Rebuilt by `npm run stats`; the importer runs it automatically.
CREATE TABLE IF NOT EXISTS listing_stats (
  key          TEXT PRIMARY KEY,            -- '<category_id>|<location slug or empty>|<certification id or 0>'
  category_id  INTEGER NOT NULL,
  loc_slug     TEXT NOT NULL,
  cert_id      INTEGER NOT NULL,
  country_slug TEXT NOT NULL,
  cat_slug     TEXT NOT NULL,
  cert_slug    TEXT,
  total        INTEGER NOT NULL,
  avg_emp      REAL,
  claimed      INTEGER NOT NULL,
  top_cities   TEXT NOT NULL,
  loc_facets   TEXT NOT NULL,
  cert_facets  TEXT NOT NULL,
  hash         TEXT NOT NULL
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_ls_country ON listing_stats (country_slug);

CREATE TABLE IF NOT EXISTS site_stats (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  hash  TEXT NOT NULL
) WITHOUT ROWID;

-- Claims, quote requests and featured placements.
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