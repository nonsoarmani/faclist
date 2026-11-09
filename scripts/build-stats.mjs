#!/usr/bin/env node
// Rebuilds the pre-computed statistics (counts, facets, homepage numbers, sitemap list) in your database.
// The importer runs this automatically. Run it yourself with:  npm run stats
// Only rows that changed are written, so it is cheap on the free plan.
//   --local       use the local test database instead of the live one
//   --dry         only write db/stats.sql, change nothing
//   --from-json f test mode: read the source rows from a JSON file instead of the database
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { computeStats } from './stats-lib.mjs';

const argv = process.argv.slice(2);
const local = argv.includes('--local'), dry = argv.includes('--dry');
const fromJson = argv.includes('--from-json') ? argv[argv.indexOf('--from-json') + 1] : null;
const DB = 'faclist-db';
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function query(sql) {
  const res = spawnSync('npx', ['wrangler', 'd1', 'execute', DB, local ? '--local' : '--remote', '--json', '--command', `"${sql.replace(/\s+/g, ' ').trim()}"`],
    { encoding: 'utf8', shell: true, maxBuffer: 1024 * 1024 * 1024 });
  const out = res.stdout ?? '';
  const start = out.search(/^\s*\[/m);
  if (res.status !== 0 || start < 0) { console.error(`\nCould not read from the database.\n${(res.stderr || out).slice(-600)}`); process.exit(1); }
  return JSON.parse(out.slice(start))[0].results;
}

let src;
if (fromJson) src = JSON.parse(readFileSync(fromJson, 'utf8'));
else {
  console.log('Reading company data...');
  const tables = query("SELECT name FROM sqlite_master WHERE name IN ('listing_stats','site_stats')").map((r) => r.name);
  if (tables.length < 2) { console.error('\nThe statistics tables do not exist yet. Run once:  npm run db:migrate5:remote'); process.exit(1); }
  const locs = query('SELECT slug, name FROM locations');
  src = {
    categories: query('SELECT id, slug, name, section FROM categories'),
    certs: query('SELECT id, slug, code, name FROM certifications'),
    links: query('SELECT cc.category_id AS cat, c.id AS id, c.country_slug AS cs, c.state_slug AS ss, c.city AS city, c.employee_count AS emp, c.claimed_status AS cl FROM company_categories cc JOIN companies c ON c.id = cc.company_id'),
    certLinks: query('SELECT company_id AS id, certification_id AS cert FROM company_certifications'),
    locNames: Object.fromEntries(locs.map((l) => [l.slug, l.name])),
    countryCounts: query('SELECT country_slug AS slug, COUNT(*) AS n, MAX(created_at) AS last FROM companies GROUP BY country_slug ORDER BY country_slug'),
    existingListing: query('SELECT key, hash FROM listing_stats'),
    existingSite: query('SELECT key, hash FROM site_stats'),
  };
}

const { listing, site } = computeStats(src);
const oldL = new Map((src.existingListing ?? []).map((r) => [r.key, r.hash]));
const oldS = new Map((src.existingSite ?? []).map((r) => [r.key, r.hash]));
const sql = [];
let changed = 0;
for (const r of listing) {
  if (oldL.get(r.key) === r.hash) continue;
  changed++;
  sql.push(`INSERT OR REPLACE INTO listing_stats (key, category_id, loc_slug, cert_id, country_slug, cat_slug, cert_slug, total, avg_emp, claimed, top_cities, loc_facets, cert_facets, hash) VALUES (${[r.key, r.category_id, r.loc_slug, r.cert_id, r.country_slug, r.cat_slug, r.cert_slug, r.total, r.avg_emp, r.claimed, r.top_cities, r.loc_facets, r.cert_facets, r.hash].map(q).join(', ')});`);
}
const keep = new Set(listing.map((r) => r.key));
const gone = [...oldL.keys()].filter((k) => !keep.has(k));
for (let i = 0; i < gone.length; i += 100) sql.push(`DELETE FROM listing_stats WHERE key IN (${gone.slice(i, i + 100).map(q).join(',')});`);
for (const r of site) {
  if (oldS.get(r.key) === r.hash) continue;
  changed++;
  sql.push(`INSERT OR REPLACE INTO site_stats (key, value, hash) VALUES (${q(r.key)}, ${q(r.value)}, ${q(r.hash)});`);
}
console.log(`Computed ${listing.length} page statistics. ${changed} new or changed, ${gone.length} no longer needed.`);
if (!sql.length) { console.log('Statistics are already up to date.'); process.exit(0); }
writeFileSync('db/stats.sql', sql.join('\n') + '\n');
if (dry) { console.log('Dry run: wrote db/stats.sql, changed nothing.'); process.exit(0); }
const res = spawnSync('npx', ['wrangler', 'd1', 'execute', DB, local ? '--local' : '--remote', '--file', 'db/stats.sql', '--yes'], { stdio: 'inherit', shell: true });
if (res.status !== 0) { console.error('\nStopped with an error. It is safe to run  npm run stats  again.'); process.exit(1); }
console.log('\nStatistics updated.');
