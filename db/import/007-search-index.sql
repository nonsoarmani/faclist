INSERT INTO company_search (rowid, name, city, state, country, categories, description, details)
SELECT c.id, c.name, COALESCE(c.city,''), COALESCE(c.state,''), c.country,
       COALESCE((SELECT group_concat(cat.name, ' ') FROM company_categories cc JOIN categories cat ON cat.id = cc.category_id WHERE cc.company_id = c.id), ''),
       COALESCE(c.description,''),
       TRIM(COALESCE(c.capabilities,'') || ' ' || COALESCE(c.industries,'') || ' ' || COALESCE(c.products,''))
  FROM companies c
 WHERE c.id NOT IN (SELECT rowid FROM company_search);
