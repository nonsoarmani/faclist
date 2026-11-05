#!/usr/bin/env node
// FacList OpenStreetMap collector: downloads real factories/workshops for one country and writes a CSV
// in the format the importer understands.
//
//   npm run osm -- NG "Nigeria"                       -> data/osm-ng.csv
//   npm run osm -- GB "United Kingdom"                (big countries are downloaded region by region, automatically)
//   npm run osm -- US "United States" --region "Texas"
//
// Options:  --require-website   keep only companies that have a website (best quality)
//           --allow-no-city     keep companies even when OpenStreetMap has no city AND no region for them
//           --region "Name"     limit to one state/province/region/city inside the country
//           --from-file x.json  use a saved Overpass JSON response instead of downloading
//           --out path.csv      choose the output file
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const valueIdx = new Set(['--region', '--from-file', '--out'].map((f) => argv.indexOf(f) + 1).filter((i) => i > 0));
const pos = argv.filter((a, i) => !a.startsWith('--') && !valueIdx.has(i));
const [cc, country] = [pos[0]?.toUpperCase(), pos[1]];
if (!cc || !/^[A-Z]{2}$/.test(cc) || !country) {
  console.log('Usage: npm run osm -- <2-letter country code> "<Country name>" [--require-website] [--region "Name"]\nExample: npm run osm -- NG "Nigeria"');
  process.exit(1);
}
const region = opt('region');
const out = opt('out') ?? `data/osm-${cc.toLowerCase()}${region ? '-' + region.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ''}.csv`;
const DELAY = Number(process.env.OSM_DELAY_MS ?? 3000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BIG = new Set(['US', 'CN', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'RU', 'MX', 'ID', 'JP', 'IT', 'ES', 'TR', 'PL', 'ZA', 'AR', 'SA']);

/* ---------- query building ---------- */
const rx = (v) => v.replace(/[\\^$.*+?()[\]{}|"]/g, '\\$&');
const webFilters = flag('require-website') ? ['["website"]', '["contact:website"]'] : [''];
const clauses = webFilters
  .flatMap((w) => [
    `nwr["man_made"="works"]["name"]${w}(area.a);`,
    `nwr["industrial"~"^(factory|machine_shop|metal_processing|foundry|engineering|manufacturing)$"]["name"]${w}(area.a);`,
    `nwr["craft"~"^(metal_construction|blacksmith|toolmaker)$"]["name"]${w}(area.a);`,
  ])
  .join('\n  ');
const placesQuery = (areaClause) => `[out:json][timeout:180];\n${areaClause}\n(\n  ${clauses}\n);\nout center tags;`;
const AREA_COUNTRY = `area["ISO3166-1"="${cc}"][admin_level=2]->.a;`;
const AREA_REL = (id) => `rel(${id});map_to_area->.a;`;
const AREA_NAME = (name) => `area["ISO3166-1"="${cc}"][admin_level=2]->.c;
rel["boundary"="administrative"]["name"~"^${rx(name)}$",i](area.c);
map_to_area->.a;`;

/* ---------- talking to the free OpenStreetMap servers ---------- */
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
class TooBig extends Error {}
class Unreachable extends Error {}

async function overpass(query, label) {
  for (let round = 1; round <= 3; round++) {
    for (const url of MIRRORS) {
      try {
        console.log(`  ${label}: asking ${new URL(url).host} (try ${round} of 3)...`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': 'FacList-collector/1.0 (directory data import)', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }),
        });
        const text = await res.text();
        if (res.status === 429 || res.status >= 500) { console.log(`    server said ${res.status} (busy), trying the next one...`); continue; }
        if (!res.ok) { console.log(`    server said ${res.status}, trying the next one...`); continue; }
        const json = JSON.parse(text);
        // The servers answer "200 OK" even when a request was too big; the real message is hidden in "remark".
        if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark)) throw new TooBig(json.remark);
        return json;
      } catch (e) {
        if (e instanceof TooBig) throw e;
        console.log(`    could not connect (${e.message}), trying the next one...`);
      }
    }
    if (round < 3) { console.log('  All servers are busy. Waiting 30 seconds, then trying again...'); await sleep(Math.max(DELAY * 10, 0)); }
  }
  throw new Unreachable('servers busy');
}

/* ---------- collecting ---------- */
const found = new Map(); // key -> { el, state }
let seq = 0;
const failed = [];
function addElements(json, state) {
  for (const el of json.elements ?? []) {
    const key = el.id !== undefined ? `${el.type}/${el.id}` : `n${seq++}`;
    if (!found.has(key)) found.set(key, { el, state });
  }
}

async function fetchRegion(id, label, top, level) {
  try {
    const json = await overpass(placesQuery(AREA_REL(id)), label);
    addElements(json, top);
    console.log(`  ${label}: ${json.elements?.length ?? 0} places (running total ${found.size})`);
  } catch (e) {
    if (!(e instanceof TooBig)) { failed.push(label); console.log(`  ${label}: skipped (servers busy). Run the command again later to fill the gap.`); return; }
    console.log(`  ${label} is too big for one request, splitting it into smaller areas...`);
    for (let l = level + 1; l <= 8; l++) {
      await sleep(DELAY);
      const kids = await listRels(`rel(${id});map_to_area->.p;`, `(area.p)`, l).catch(() => []);
      if (kids.length) {
        for (const k of kids) { await sleep(DELAY); await fetchRegion(k.id, `${label} > ${k.name}`, top, l); writeCsv(); }
        return;
      }
    }
    failed.push(label);
    console.log(`  ${label}: could not be split further, skipped.`);
  }
}

async function listRels(prefix, filter, level) {
  const q = `[out:json][timeout:60];\n${prefix}\nrel["boundary"="administrative"]["admin_level"="${level}"]${filter};\nout tags;`;
  const json = await overpass(q, `listing level ${level} areas`);
  return (json.elements ?? []).filter((e) => e.tags?.name).map((e) => ({ id: e.id, name: e.tags['name:en'] ?? e.tags.name }));
}

async function downloadSplit() {
  console.log(`\n${country} is big, so it is downloaded region by region. This can take 10 to 60+ minutes. Keep this window open.\n`);
  const subs = await listRels(`area["ISO3166-1"="${cc}"][admin_level=2]->.c;`, '(area.c)', 4);
  if (!subs.length) throw new TooBig('no regions found');
  console.log(`Found ${subs.length} regions.\n`);
  for (const s of subs) { await fetchRegion(s.id, s.name, s.name, 4); writeCsv(); await sleep(DELAY); }
}

/* ---------- categorise ---------- */
const PRODUCT_RULES = [
  [/plastic|polymer|rubber/, 'Plastics & Rubber'],
  [/steel|iron|metal|alumin|wire|pipe|tube|cast|forg/, 'Metal Fabrication'],
  [/machin|equipment|engine|pump|tool|mechanic/, 'Machinery & Equipment'],
  [/electr|cable|battery|circuit|solar/, 'Electronics & Electrical'],
  [/furniture|wood|timber|saw/, 'Wood & Furniture'],
  [/food|beverage|bread|drink|water|flour|sugar|oil|dairy|beer|brew/, 'Food & Beverage'],
  [/textile|cloth|garment|fabric|shoe|leather|apparel/, 'Textiles & Apparel'],
  [/chemical|paint|fertili|soap|cosmetic|pharma|detergent/, 'Chemicals'],
  [/cement|concrete|brick|ceramic|glass|tile|stone/, 'Building Materials'],
  [/pack|paper|cardboard|print|bottle/, 'Packaging & Paper'],
  [/vehicle|car|automotive|motor|tyre|tire/, 'Automotive'],
];
function categorize(t) {
  const c = new Set();
  if (t.industrial === 'machine_shop') c.add('Machining');
  if (t.industrial === 'metal_processing' || t.craft === 'metal_construction') c.add('Metal Fabrication');
  if (t.industrial === 'foundry') c.add('Metal Casting');
  if (t.craft === 'blacksmith') c.add('Metal Forging');
  if (t.craft === 'toolmaker') c.add('Tool & Die');
  const prod = String(t.product ?? '').toLowerCase(); // only the product tag; names are too unreliable
  for (const [re, name] of PRODUCT_RULES) if (re.test(prod)) c.add(name);
  if (!c.size) c.add('General Manufacturing');
  return [...c].slice(0, 3);
}

/* ---------- clean & write CSV ---------- */
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const hasLatin = (s) => /[A-Za-z]/.test(s);
function website(t) {
  let w = clean(t.website ?? t['contact:website'] ?? '').split(/[;,\s]/)[0];
  if (!w) return '';
  if (!/^https?:\/\//i.test(w)) w = 'https://' + w;
  try { const u = new URL(w); return u.hostname.includes('.') ? u.toString().replace(/\/$/, '') : ''; } catch { return ''; }
}
const cols = ['name', 'description', 'address', 'city', 'state', 'country', 'country_code', 'website', 'employee_count', 'revenue_tier', 'lat', 'lng', 'categories', 'certifications', 'data_source'];
const csvEsc = (v) => `"${String(v).replace(/"/g, '""')}"`;
let stats = { rows: 0, withSite: 0, noCity: 0, noName: 0, noLatin: 0, noSite: 0, dupe: 0 };

function buildRows() {
  const rows = [];
  const seen = new Set();
  stats = { rows: 0, withSite: 0, noCity: 0, noName: 0, noLatin: 0, noSite: 0, dupe: 0 };
  for (const { el: e, state: regionState } of found.values()) {
    const t = e.tags ?? {};
    let name = clean(t.name);
    if (name.length < 2) { stats.noName++; continue; }
    if (!hasLatin(name)) { if (t['name:en'] && hasLatin(t['name:en'])) name = clean(t['name:en']); else { stats.noLatin++; continue; } }
    const city = clean(t['addr:city'] ?? t['addr:town'] ?? t['addr:village'] ?? t['addr:suburb'] ?? t['addr:district'] ?? t['addr:place']);
    const state = clean(t['addr:state'] ?? t['addr:province'] ?? t['addr:region'] ?? regionState ?? region ?? '');
    if (!city && !state && !flag('allow-no-city')) { stats.noCity++; continue; }
    const site = website(t);
    if (flag('require-website') && !site) { stats.noSite++; continue; }
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    const key = `${name.toLowerCase()}|${city.toLowerCase()}|${city || lat == null ? '' : Number(lat).toFixed(2) + Number(lng).toFixed(2)}`;
    if (seen.has(key)) { stats.dupe++; continue; }
    seen.add(key);
    rows.push({
      name,
      description: clean(t.description ?? t['description:en'] ?? ''),
      address: clean([t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')),
      city, state, country, country_code: cc, website: site, employee_count: '', revenue_tier: '',
      lat: lat != null ? Number(lat).toFixed(5) : '', lng: lng != null ? Number(lng).toFixed(5) : '',
      categories: categorize(t).join(';'), certifications: '', data_source: 'openstreetmap',
    });
  }
  stats.rows = rows.length;
  stats.withSite = rows.filter((r) => r.website).length;
  return rows;
}
function writeCsv() {
  const rows = buildRows();
  mkdirSync('data', { recursive: true });
  writeFileSync(out, [cols.join(','), ...rows.map((r) => cols.map((c) => csvEsc(r[c])).join(','))].join('\n') + '\n');
}

/* ---------- run ---------- */
try {
  if (opt('from-file')) {
    addElements(JSON.parse(readFileSync(opt('from-file'), 'utf8')), region);
  } else if (region) {
    console.log(`Downloading ${region}, ${country}...`);
    addElements(await overpass(placesQuery(AREA_NAME(region)), region), region);
  } else if (BIG.has(cc)) {
    await downloadSplit();
  } else {
    console.log(`Downloading ${country}...`);
    try { addElements(await overpass(placesQuery(AREA_COUNTRY), country), undefined); }
    catch (e) { if (e instanceof TooBig) await downloadSplit(); else throw e; }
  }
} catch (e) {
  if (e instanceof Unreachable || e instanceof TooBig) {
    console.error(e instanceof TooBig
      ? '\nThat area is too big for the free servers and could not be split up. Try a smaller area, for example a city: --region "Buffalo"'
      : '\nThe free OpenStreetMap servers are too busy right now. Nothing is wrong with your computer or the files.\nTry again in 10-30 minutes.');
    if (found.size) { writeCsv(); console.error(`(Saved the ${stats.rows} companies found so far to ${out}.)`); }
    await sleep(500); // lets network connections close cleanly (avoids a harmless Windows crash message)
    process.exit(1);
  }
  throw e;
}

writeCsv();
console.log(`\nReceived ${found.size} named places from OpenStreetMap.`);
console.log(`Saved ${stats.rows} companies to ${out}  (${stats.withSite} have a website)`);
console.log(`Left out: ${stats.noCity} with no city or region, ${stats.noName} with no usable name, ${stats.noLatin} with non-English-only names, ${stats.noSite} with no website, ${stats.dupe} duplicates.`);
if (failed.length) console.log(`\nSome regions were skipped because the servers were busy: ${failed.join(', ')}.\nRun the same command again later and the gaps will be filled (nothing gets duplicated).`);
if (stats.rows === 0) { console.error('\nNo companies were found, so there is nothing to load.'); await sleep(300); process.exit(1); }
console.log(`\nNext: check the file, then run\n  npm run import -- ${out} --dry\n  npm run import -- ${out}`);
