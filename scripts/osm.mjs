#!/usr/bin/env node
// FacList OpenStreetMap collector: downloads real factories/workshops for one country and writes a CSV
// in the format the importer understands.
//
//   npm run osm -- NG "Nigeria"                       -> data/osm-ng.csv
//   npm run osm -- GB "United Kingdom" --require-website
//   npm run osm -- US "United States" --region "Texas" (big countries: do one state/region at a time)
//
// Options:  --require-website   keep only companies that have a website (best quality)
//           --allow-no-city     keep companies even when OpenStreetMap has no city for them
//           --region "Name"     limit to one state/province/region inside the country
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

/* ---------- 1. get data ---------- */
const rx = (v) => v.replace(/[\\^$.*+?()[\]{}|"]/g, '\\$&');
const areaQ = region
  ? `area["ISO3166-1"="${cc}"][admin_level=2]->.c;
rel["boundary"="administrative"]["name"~"^${rx(region)}$",i](area.c);
map_to_area->.a;`
  : `area["ISO3166-1"="${cc}"][admin_level=2]->.a;`;
// With --require-website we ask the server only for places that have a website: far less data, far fewer timeouts.
const webFilters = flag('require-website') ? ['["website"]', '["contact:website"]'] : [''];
const clauses = webFilters
  .flatMap((w) => [
    `nwr["man_made"="works"]["name"]${w}(area.a);`,
    `nwr["industrial"~"^(factory|machine_shop|metal_processing|foundry|engineering|manufacturing)$"]["name"]${w}(area.a);`,
    `nwr["craft"~"^(metal_construction|blacksmith|toolmaker)$"]["name"]${w}(area.a);`,
  ])
  .join('\n  ');
const query = `[out:json][timeout:180];
${areaQ}
(
  ${clauses}
);
out center tags;`;

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function download() {
  for (let round = 1; round <= 3; round++) {
    for (const url of MIRRORS) {
      try {
        console.log(`Asking ${new URL(url).host} for ${region ? region + ', ' : ''}${country} (try ${round} of 3, can take a few minutes)...`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': 'FacList-collector/1.0 (directory data import)', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }),
        });
        const text = await res.text();
        if (!res.ok) { console.log(`  server said ${res.status} (busy), trying the next one...`); continue; }
        return JSON.parse(text);
      } catch (e) { console.log(`  could not connect (${e.message}), trying the next one...`); }
    }
    if (round < 3) { console.log('\nAll servers are busy. Waiting 30 seconds, then trying again...\n'); await sleep(30000); }
  }
  console.error('\nThe free OpenStreetMap servers are too busy right now. Nothing is wrong with your computer or the files.\nTry again in 10-30 minutes, or pick a smaller area, for example a city: --region "Buffalo"');
  await sleep(500); // lets network connections close cleanly (avoids a harmless Windows crash message)
  process.exit(1);
}
const json = opt('from-file') ? JSON.parse(readFileSync(opt('from-file'), 'utf8')) : await download();
const elements = json.elements ?? [];
console.log(`Received ${elements.length} named places from OpenStreetMap.`);

/* ---------- 2. categorise ---------- */
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

/* ---------- 3. clean & write CSV ---------- */
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
function website(t) {
  let w = clean(t.website ?? t['contact:website'] ?? '').split(/[;,\s]/)[0];
  if (!w) return '';
  if (!/^https?:\/\//i.test(w)) w = 'https://' + w;
  try { const u = new URL(w); return u.hostname.includes('.') ? u.toString().replace(/\/$/, '') : ''; } catch { return ''; }
}
const rows = [];
const seen = new Set();
let dropped = { noName: 0, noCity: 0, noSite: 0, dupe: 0 };
for (const e of elements) {
  const t = e.tags ?? {};
  const name = clean(t.name);
  if (name.length < 3) { dropped.noName++; continue; }
  const city = clean(t['addr:city'] ?? t['addr:town'] ?? t['addr:village'] ?? t['addr:suburb'] ?? t['addr:place']);
  if (!city && !flag('allow-no-city')) { dropped.noCity++; continue; }
  const site = website(t);
  if (flag('require-website') && !site) { dropped.noSite++; continue; }
  const key = `${name.toLowerCase()}|${city.toLowerCase()}`;
  if (seen.has(key)) { dropped.dupe++; continue; }
  seen.add(key);
  const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
  rows.push({
    name,
    description: clean(t.description ?? t['description:en'] ?? ''),
    address: clean([t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')),
    city,
    state: clean(t['addr:state'] ?? t['addr:province'] ?? t['addr:region'] ?? region ?? ''),
    country, country_code: cc, website: site, employee_count: '', revenue_tier: '',
    lat: lat != null ? Number(lat).toFixed(5) : '', lng: lng != null ? Number(lng).toFixed(5) : '',
    categories: categorize(t).join(';'), certifications: '',
  });
}
const cols = ['name', 'description', 'address', 'city', 'state', 'country', 'country_code', 'website', 'employee_count', 'revenue_tier', 'lat', 'lng', 'categories', 'certifications'];
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
mkdirSync('data', { recursive: true });
writeFileSync(out, [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');

const withSite = rows.filter((r) => r.website).length;
console.log(`\nSaved ${rows.length} companies to ${out}  (${withSite} have a website)`);
console.log(`Left out: ${dropped.noCity} with no city, ${dropped.noName} with no usable name, ${dropped.noSite} with no website, ${dropped.dupe} duplicates.`);
console.log(`\nNext: check the file, then run\n  npm run import -- ${out} --dry\n  npm run import -- ${out}`);
