-- Run ONCE on an existing database: adds the Import & Export section.
-- Every existing category stays in the manufacturing section.
ALTER TABLE categories ADD COLUMN section TEXT NOT NULL DEFAULT 'manufacturing';
