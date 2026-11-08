#!/usr/bin/env node
// One-time clean-up of your LIVE database. Safe to run more than once.
//   1. US state / Canadian province abbreviations (mn, mi, ma ...) become full names (minnesota ...), so there is one page per place
//   2. the duplicate category "Electronics & Electrical" is merged into "Electrical & Electronics"
// Usage:  npm run fix:dupes          (changes the live database)
//         npm run fix:dupes -- --dry (only writes db/fix-duplicates.sql so you can read it)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const STATES = JSON.parse(readFileSync(new URL('../src/states.json', import.meta.url), 'utf8'));
const dry = process.argv.includes('--dry');
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

const sql = [];
const countries = { US: ['united-states', 'United States'], CA: ['canada', 'Canada'] };
const newSlugs = [];
for (const [cc, map] of Object.entries(STATES)) {
  const [cslug, cname] = countries[cc];
  for (const [abbr, name] of Object.entries(map)) {
    const old = abbr.toLowerCase();
    const slug = name === 'Georgia' ? 'georgia-us' : slugify(name);
    newSlugs.push(q(slug));
    sql.push(`-- ${cc}: ${abbr} -> ${name}`);
    sql.push(`UPDATE companies SET state = ${q(name)}, state_slug = ${q(slug)} WHERE country_slug = ${q(cslug)} AND state_slug = ${q(old)};`);
    if (slug !== 'georgia-us') {} else sql.push(`UPDATE companies SET state_slug = 'georgia-us' WHERE country_slug = 'united-states' AND state_slug = 'georgia';`);
    sql.push(`INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT ${q(slug)}, ${q(name)}, 'state', ${q(cc)}, ${q(cname)} WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = ${q(slug)});`);
    sql.push(`DELETE FROM locations WHERE slug = ${q(old)} AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = ${q(old)});`);
  }
}
sql.push(`DELETE FROM locations WHERE slug = 'georgia' AND type = 'state' AND country_code = 'US' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'georgia');`);
// keep the search index in step with the renamed states
sql.push(`UPDATE company_search SET state = (SELECT c.state FROM companies c WHERE c.id = company_search.rowid)
 WHERE rowid IN (SELECT id FROM companies WHERE state_slug IN (${newSlugs.join(',')}))
   AND state <> (SELECT c.state FROM companies c WHERE c.id = company_search.rowid);`);

// merge the duplicate electrical category
const OLD = `(SELECT id FROM categories WHERE slug = 'electronics-and-electrical')`;
const NEW = `(SELECT id FROM categories WHERE slug = 'electrical-and-electronics')`;
sql.push(`-- merge electronics-and-electrical into electrical-and-electronics`);
sql.push(`INSERT OR IGNORE INTO company_categories (category_id, company_id) SELECT ${NEW}, company_id FROM company_categories WHERE category_id = ${OLD} AND ${NEW} IS NOT NULL;`);
sql.push(`DELETE FROM company_categories WHERE category_id = ${OLD} AND ${NEW} IS NOT NULL;`);
sql.push(`DELETE FROM categories WHERE slug = 'electronics-and-electrical' AND ${NEW} IS NOT NULL;`);

writeFileSync('db/fix-duplicates.sql', sql.join('\n') + '\n');
console.log(`Wrote db/fix-duplicates.sql (${sql.length} statements).`);
if (dry) process.exit(0);

const run = (args) => spawnSync('npx', ['wrangler', 'd1', 'execute', 'faclist-db', '--remote', ...args], { stdio: 'inherit', shell: true }).status === 0;
if (!run(['--file', 'db/fix-duplicates.sql', '--yes'])) { console.error('\nStopped with an error. It is safe to run the same command again.'); process.exit(1); }
console.log('\nChecking the result. The first list should be EMPTY, the second should show no "electronics-and-electrical":\n');
run(['--command', "SELECT slug FROM locations WHERE type = 'state' AND length(slug) = 2"]);
run(['--command', "SELECT slug, section FROM categories ORDER BY slug"]);
console.log('\nDone. Old addresses now redirect to the new ones automatically.');
