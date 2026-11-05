-- Run ONCE on an existing database: adds richer profile fields and the search index.
ALTER TABLE companies ADD COLUMN year_founded INTEGER;
ALTER TABLE companies ADD COLUMN company_type TEXT;
ALTER TABLE companies ADD COLUMN sales_range TEXT;
ALTER TABLE companies ADD COLUMN industries TEXT;
ALTER TABLE companies ADD COLUMN capabilities TEXT;
ALTER TABLE companies ADD COLUMN products TEXT;
ALTER TABLE companies ADD COLUMN data_source TEXT;

CREATE VIRTUAL TABLE IF NOT EXISTS company_search USING fts5(
  name, city, state, country, categories, description, details,
  tokenize = 'unicode61 remove_diacritics 2'
);

INSERT INTO company_search (rowid, name, city, state, country, categories, description, details)
SELECT c.id, c.name, COALESCE(c.city,''), COALESCE(c.state,''), c.country,
       COALESCE((SELECT group_concat(cat.name, ' ') FROM company_categories cc JOIN categories cat ON cat.id = cc.category_id WHERE cc.company_id = c.id), ''),
       COALESCE(c.description,''),
       TRIM(COALESCE(c.capabilities,'') || ' ' || COALESCE(c.industries,'') || ' ' || COALESCE(c.products,''))
  FROM companies c
 WHERE c.id NOT IN (SELECT rowid FROM company_search);
