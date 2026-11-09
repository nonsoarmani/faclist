-- Run ONCE on an existing database: adds the pre-computed statistics tables.

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
