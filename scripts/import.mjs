#!/usr/bin/env node
// FacList bulk importer: CSV spreadsheet -> D1 database.
// Usage:  npm run import -- data/companies.csv            (loads into your LIVE database)
//         npm run import -- data/companies.csv --local     (loads into your local test database)
//         npm run import -- data/companies.csv --dry       (only checks the file, loads nothing)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const local = args.includes('--local');
const dry = args.includes('--dry');
const CHUNK = 250;
const DB_NAME = 'faclist-db';

if (!file) {
  console.log('Usage: npm run import -- data/companies.csv [--local] [--dry]');
  process.exit(1);
}

/* ---------- CSV parsing (handles quotes, commas inside quotes, Excel BOM) ---------- */
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], f = '', q = false;
  const endRow = () => { row.push(f); f = ''; if (row.some((c) => c.trim() !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else f += ch;
  }
  if (f !== '' || row.length) endRow();
  return rows;
}

/* ---------- helpers ---------- */
const slugify = (s) =>
  String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const q = (v) => (v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/\0/g, '').replace(/'/g, "''")}'`);
const num = (v, int) => {
  const n = int ? parseInt(String(v).replace(/[^\d-]/g, ''), 10) : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const split = (v) => String(v ?? '').split(/[;|]/).map((x) => x.trim()).filter(Boolean);
const TIERS = new Set(['micro', 'small', 'mid', 'large', 'enterprise']);
const AUTH = {
  'ISO-9001': 'International Organization for Standardization',
  'ISO-14001': 'International Organization for Standardization',
  'ISO-13485': 'International Organization for Standardization',
  'ISO-45001': 'International Organization for Standardization',
  'AS9100': 'International Aerospace Quality Group',
  'IATF-16949': 'International Automotive Task Force',
};

/* ---------- read file ---------- */
const rows = parseCsv(readFileSync(file, 'utf8'));
if (rows.length < 2) { console.error('The file has no data rows.'); process.exit(1); }
const header = rows[0].map((h) => h.trim().toLowerCase());
const col = (r, name) => (r[header.indexOf(name)] ?? '').trim();
for (const need of ['name', 'country']) {
  if (!header.includes(need)) { console.error(`Missing required column "${need}". Columns found: ${header.join(', ')}`); process.exit(1); }
}

/* ---------- build records ---------- */
const skipped = [];
const records = [];
const usedSlugs = new Set();
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const name = col(r, 'name'), country = col(r, 'country');
  if (!name || !country) { skipped.push(`row ${i + 1}: missing name or country`); continue; }
  const city = col(r, 'city'), state = col(r, 'state');
  let slug = slugify(`${name} ${city}`) || slugify(name);
  if (!slug) { skipped.push(`row ${i + 1}: name has no usable letters`); continue; }
  let n = 2; const base = slug;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);
  const tierRaw = col(r, 'revenue_tier');
  const tier = tierRaw.toLowerCase();
  const yr = num(col(r, 'year_founded'), true);
  const typeRaw = col(r, 'company_type').toLowerCase();
  const TYPE = typeRaw.includes('custom') ? 'Custom Manufacturer' : typeRaw.includes('manufactur') ? 'Manufacturer' : typeRaw.includes('distrib') ? 'Distributor' : typeRaw.includes('service') ? 'Service Company' : typeRaw ? 'Other' : null;
  const items = (v) => split(v).slice(0, 12).map((x) => x.slice(0, 60)).join(';') || null;
  records.push({
    year_founded: yr && yr >= 1600 && yr <= new Date().getFullYear() ? yr : null,
    company_type: TYPE,
    // a revenue label such as "$25M+" is kept as text when it is not one of our fixed size bands
    sales_range: (col(r, 'sales_range') || (TIERS.has(tier) ? '' : tierRaw)).slice(0, 40) || null,
    industries: items(col(r, 'industries')),
    capabilities: items(col(r, 'capabilities')),
    products: items(col(r, 'products')),
    data_source: col(r, 'data_source').slice(0, 40) || 'import',
    slug, name, city, state, country,
    description: col(r, 'description'), address: col(r, 'address'),
    country_code: col(r, 'country_code').toUpperCase() || country,
    website: col(r, 'website'),
    employees: num(col(r, 'employee_count'), true),
    tier: TIERS.has(tier) ? tier : null,
    lat: num(col(r, 'lat')), lng: num(col(r, 'lng')),
    cats: split(col(r, 'categories')),
    certs: split(col(r, 'certifications')).map((c) => c.toUpperCase().replace(/\s+/g, '-')),
  });
}

/* ---------- locations (country first, then states, avoiding slug clashes) ---------- */
const used = new Map(); // slug -> owner
const locations = new Map(); // slug -> row
const countrySlug = new Map();
for (const r of records) {
  const cs = slugify(r.country);
  countrySlug.set(r.country, cs);
  used.set(cs, `country:${cs}`);
  locations.set(cs, { slug: cs, name: r.country, type: 'country', cc: r.country_code, cname: r.country });
}
for (const r of records) {
  r.country_slug = countrySlug.get(r.country);
  if (!r.state) { r.state_slug = null; continue; }
  const owner = `state:${r.country_slug}`;
  let s = slugify(r.state);
  if (used.has(s) && used.get(s) !== owner) s = `${s}-${slugify(r.country_code) || r.country_slug}`;
  used.set(s, owner);
  r.state_slug = s;
  locations.set(s, { slug: s, name: r.state, type: 'state', cc: r.country_code, cname: r.country });
}

/* ---------- categories & certifications ---------- */
const cats = new Map();
const certs = new Map();
for (const r of records) {
  r.cats = [...new Set(r.cats.map((c) => { const s = slugify(c); if (s) cats.set(s, c); return s; }).filter(Boolean))];
  r.certs = [...new Set(r.certs.filter(Boolean))];
  r.certs.forEach((c) => certs.set(c, c));
}

/* ---------- write SQL files ---------- */
const outDir = 'db/import';
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const files = [];

const ref = [];
for (const [slug, name] of cats)
  ref.push(`INSERT OR IGNORE INTO categories (name, slug, meta_title_template, description_template) VALUES (${q(name)}, ${q(slug)}, '{{category}} Suppliers{{place}}{{certified}} ({{count}} Listed) | FacList', 'Compare {{count}} {{category_lower}} {{noun}}{{place}}{{certified}}. Browse capabilities, certifications and company size, then request a quote.');`);
for (const code of certs.keys())
  ref.push(`INSERT OR IGNORE INTO certifications (name, code, slug, authority) VALUES (${q(code.replace(/-/g, ' '))}, ${q(code)}, ${q(code.toLowerCase())}, ${q(AUTH[code] ?? null)});`);
for (const l of locations.values())
  ref.push(`INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) VALUES (${q(l.slug)}, ${q(l.name)}, ${q(l.type)}, ${q(l.cc)}, ${q(l.cname)});`);
writeFileSync(`${outDir}/000-reference.sql`, ref.join('\n') + '\n');
files.push(`${outDir}/000-reference.sql`);

for (let i = 0; i < records.length; i += CHUNK) {
  const part = records.slice(i, i + CHUNK);
  const sql = [];
  for (const r of part)
    sql.push(`INSERT OR IGNORE INTO companies (slug, name, description, address, city, state, state_slug, country, country_code, country_slug, lat, lng, website, employee_count, revenue_tier, claimed_status, year_founded, company_type, sales_range, industries, capabilities, products, data_source) VALUES (${q(r.slug)}, ${q(r.name)}, ${q(r.description)}, ${q(r.address)}, ${q(r.city)}, ${q(r.state)}, ${q(r.state_slug)}, ${q(r.country)}, ${q(r.country_code)}, ${q(r.country_slug)}, ${r.lat ?? 'NULL'}, ${r.lng ?? 'NULL'}, ${q(r.website)}, ${r.employees ?? 'NULL'}, ${q(r.tier)}, 0, ${r.year_founded ?? 'NULL'}, ${q(r.company_type)}, ${q(r.sales_range)}, ${q(r.industries)}, ${q(r.capabilities)}, ${q(r.products)}, ${q(r.data_source)});`);
  for (const r of part) {
    for (const c of r.cats)
      sql.push(`INSERT OR IGNORE INTO company_categories (category_id, company_id) SELECT cat.id, co.id FROM categories cat, companies co WHERE cat.slug = ${q(c)} AND co.slug = ${q(r.slug)};`);
    for (const c of r.certs)
      sql.push(`INSERT OR IGNORE INTO company_certifications (certification_id, company_id) SELECT ce.id, co.id FROM certifications ce, companies co WHERE ce.slug = ${q(c.toLowerCase())} AND co.slug = ${q(r.slug)};`);
  }
  const f = `${outDir}/${String(files.length).padStart(3, '0')}-companies.sql`;
  writeFileSync(f, sql.join('\n') + '\n');
  files.push(f);
}

const searchSql = `INSERT INTO company_search (rowid, name, city, state, country, categories, description, details)
SELECT c.id, c.name, COALESCE(c.city,''), COALESCE(c.state,''), c.country,
       COALESCE((SELECT group_concat(cat.name, ' ') FROM company_categories cc JOIN categories cat ON cat.id = cc.category_id WHERE cc.company_id = c.id), ''),
       COALESCE(c.description,''),
       TRIM(COALESCE(c.capabilities,'') || ' ' || COALESCE(c.industries,'') || ' ' || COALESCE(c.products,''))
  FROM companies c
 WHERE c.id NOT IN (SELECT rowid FROM company_search);
`;
const searchFile = `${outDir}/${String(files.length).padStart(3, '0')}-search-index.sql`;
writeFileSync(searchFile, searchSql);
files.push(searchFile);

console.log(`\nRead ${rows.length - 1} rows -> ${records.length} companies ready, ${skipped.length} skipped.`);
console.log(`Categories: ${cats.size} | Certifications: ${certs.size} | Locations: ${locations.size}`);
if (skipped.length) { console.log('Skipped rows (first 10):'); skipped.slice(0, 10).forEach((s) => console.log('  - ' + s)); }
if (dry) { console.log('\nDry run: nothing was loaded. Looks good if the numbers above are what you expect.'); process.exit(0); }

/* ---------- load into D1 ---------- */
console.log(`\nLoading ${files.length} file(s) into ${local ? 'your LOCAL test' : 'your LIVE'} database...`);
for (const f of files) {
  const res = spawnSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, local ? '--local' : '--remote', '--file', f, '--yes'], { stdio: 'inherit', shell: true });
  if (res.status !== 0) { console.error(`\nStopped at ${f}. Fix the problem and run the same command again. It is safe to repeat, nothing is duplicated.`); process.exit(1); }
}
console.log('\nDone! Pages for the new companies are live now. The homepage and listing pages may take up to a day to refresh because of caching.');
