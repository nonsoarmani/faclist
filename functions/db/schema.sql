-- FacList D1 schema. Run: npm run db:init:local / db:init:remote
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  meta_title_template   TEXT NOT NULL,
  description_template  TEXT NOT NULL
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
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
