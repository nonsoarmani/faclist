#!/usr/bin/env node
// Turns a Gigasheet / LinkedIn-style company export into a clean FacList CSV.
//   npm run prep -- "data/Free List of Electrical....csv" --category "Electrical & Electronic Manufacturing"
//   npm run prep -- "data/import-export.csv" --category "Import & Export" --type Distributor
// Then load it with:  npm run import -- data/prepared.csv
// Options: --out file.csv   --type "Manufacturer|Distributor|Service Company|Custom Manufacturer"
//          --allow-no-website   --allow-no-location   --no-noise-filter
//          --limit 7000   --skip 14000   (take the next batch: skip the first 14,000 good companies, keep the next 7,000)
//          --pick 3500   choose the best 3,500 (most complete, most relevant, spread over the biggest countries and regions)
//          --profile electrical | --prefer-words "cable,circuit"   names containing these words rank higher
//          --top-countries 8   --top-regions 12   (how widely --pick spreads)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n) => argv.includes(`--${n}`);
const valIdx = new Set(['--category', '--type', '--out', '--limit', '--skip', '--pick', '--profile', '--prefer-words', '--top-countries', '--top-regions'].map((f) => argv.indexOf(f) + 1).filter((i) => i > 0));
const input = argv.find((a, i) => !a.startsWith('--') && !valIdx.has(i));
const category = opt('category');
if (!input || !category) {
  console.log('Usage: npm run prep -- "<file.csv>" --category "Category name" [--type Distributor] [--limit 5000]');
  console.log('(If your download is a .zip, right-click it, choose Extract All, and use the .csv inside.)');
  process.exit(1);
}
const out = opt('out') ?? 'data/prepared.csv';
const limit = opt('limit') ? Number(opt('limit')) : Infinity;
const skip = opt('skip') ? Number(opt('skip')) : 0;
const pickN = opt('pick') ? Number(opt('pick')) : 0;
const topCountries = Number(opt('top-countries') ?? 8), topRegions = Number(opt('top-regions') ?? 12);
const PROFILES = {
  electrical: 'electr,electron,circuit,cable,wire,wiring,pcb,semiconductor,sensor,battery,power,lighting,light,led,solar,motor,transformer,switch,automation,instrument,control,energy',
};
const words = (opt('prefer-words') ?? PROFILES[opt('profile') ?? ''] ?? '').split(',').map((w) => w.trim()).filter(Boolean);
const PREFER = words.length ? new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i') : null;
const SIZE_SCORE = { '1-10': 0, '11-50': 1, '51-200': 2, '201-500': 3 };

/* ---------- csv ---------- */
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], f = '', q = false;
  const end = () => { row.push(f); f = ''; if (row.some((c) => c.trim() !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; end(); }
    else f += ch;
  }
  if (f !== '' || row.length) end();
  return rows;
}

/* ---------- text cleaning ---------- */
const KEEP_UP = new Set(['llc', 'llp', 'lp', 'plc', 'pcb', 'led', 'usa', 'uk', 'uae', 'ag', 'bv', 'nv', 'ab', 'oy', 'sa', 'sl', 'srl', 'spa', 'sas', 'sarl', 'kg', 'ooo', 'cnc', 'hvac', 'iot', 'ict', 'oem', 'odm', 'ems', 'ups', 'rf', 'ac', 'dc', 'ev', 'ai', 'it', 'mfg', 'ii', 'iii', 'iv', 'ap', 'as']);
const FIXED = { gmbh: 'GmbH', pvt: 'Pvt', ltd: 'Ltd', inc: 'Inc', co: 'Co', corp: 'Corp', pte: 'Pte', pty: 'Pty', sdn: 'Sdn', bhd: 'Bhd', ltda: 'Ltda', mbh: 'mbH', ohg: 'OHG', cv: 'CV' };
const SMALL = new Set(['and', 'of', 'the', 'for', 'de', 'da', 'do', 'di', 'du', 'la', 'le', 'el', 'van', 'von', 'der', 'den', 'y', 'e', 'et', 'a', 'in', 'on', 'at', 'to', 'z', 'o']);
const cap = (w) => w.replace(/(^|[-/(&'’])(\p{L})/gu, (m, p, l) => p + l.toLocaleUpperCase());
function titleCase(s, isName = false) {
  s = s.replace(/\s+/g, ' ').trim();
  if (s !== s.toLowerCase()) return s; // already has capitals, leave it alone
  return s.split(' ').map((w, i) => {
    const bare = w.replace(/[^\p{L}.]/gu, '');
    if (/^([a-z]\.){2,}[a-z]?\.?$/.test(bare)) return w.toUpperCase();          // s.p.a.  s.l.
    if (isName && KEEP_UP.has(bare)) return w.toUpperCase();
    if (isName && FIXED[bare]) return w.replace(bare, FIXED[bare]);
    if (i > 0 && SMALL.has(bare)) return w;
    return cap(w);
  }).join(' ');
}
const hasLatin = (s) => /[A-Za-z]/.test(s);

/* ---------- countries ---------- */
const dn = new Intl.DisplayNames(['en'], { type: 'region' });
const CODE = new Map();
for (const a of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') for (const b of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  try { const n = dn.of(a + b); if (n && n !== a + b) CODE.set(n.toLowerCase(), a + b); } catch {}
}
Object.entries({ 'russia': 'RU', 'south korea': 'KR', 'north korea': 'KP', 'czech republic': 'CZ', 'turkey': 'TR', 'vietnam': 'VN', 'taiwan': 'TW', 'iran': 'IR', 'syria': 'SY', 'laos': 'LA', 'moldova': 'MD', 'bolivia': 'BO', 'venezuela': 'VE', 'tanzania': 'TZ', 'ivory coast': 'CI', "côte d'ivoire": 'CI', 'macedonia': 'MK', 'myanmar': 'MM', 'palestine': 'PS', 'brunei': 'BN', 'cape verde': 'CV', 'hong kong': 'HK', 'macau': 'MO', 'united states': 'US', 'united kingdom': 'GB', 'uk': 'GB', 'usa': 'US', 'uae': 'AE', 'the netherlands': 'NL', 'netherlands': 'NL', 'swaziland': 'SZ', 'east timor': 'TL', 'bosnia and herzegovina': 'BA', 'democratic republic of the congo': 'CD', 'republic of the congo': 'CG', 'palestinian territories': 'PS' }).forEach(([k, v]) => CODE.set(k, v));

/* ---------- filters ---------- */
const BAD_SITE = /facebook\.|linkedin\.|instagram\.|alibaba\.|indiamart|wixsite|blogspot|wordpress\.com|weebly|business\.site|myshopify|godaddysites|twitter\.|youtube\.|made-in-china|globalsources|tiktok\.|amazon\.|ebay\.|etsy\./i;
const NOISE = /restaurant|hotel|\bcafe\b|church|\bschool\b|university|college|hospital|clinic|dental|salon|broadcast|real estate|realty|insurance|attorney|law firm|staffing|recruit|fitness|bakery|pizza|ministr|cinema|photograph/i;
function website(w) {
  w = (w ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  if (!w || !w.includes('.') || /\s/.test(w) || BAD_SITE.test(w)) return '';
  return 'https://' + w;
}

/* ---------- run ---------- */
const rows = parseCsv(readFileSync(input, 'utf8'));
const head = rows[0].map((h) => h.trim().toLowerCase());
for (const need of ['name', 'country']) if (!head.includes(need)) { console.error(`This does not look like the expected export (missing "${need}" column). Columns found: ${head.join(', ')}`); process.exit(1); }
const get = (r, k) => (r[head.indexOf(k)] ?? '').trim();

const drop = { noName: 0, noLatin: 0, noCountry: 0, noSite: 0, noLoc: 0, noise: 0, dupe: 0 };
const seen = new Set();
const cols = ['name', 'description', 'address', 'city', 'state', 'country', 'country_code', 'website', 'employee_count', 'revenue_tier', 'lat', 'lng', 'categories', 'certifications', 'year_founded', 'company_type', 'employee_range', 'data_source'];
const cands = [];
const thisYear = new Date().getFullYear();
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const rawName = get(r, 'name');
  if (rawName.length < 2) { drop.noName++; continue; }
  if (!hasLatin(rawName)) { drop.noLatin++; continue; }
  const countryRaw = get(r, 'country').toLowerCase();
  if (!countryRaw) { drop.noCountry++; continue; }
  const site = website(get(r, 'website'));
  if (!site && !flag('allow-no-website')) { drop.noSite++; continue; }
  const city = titleCase(get(r, 'locality')), state = titleCase(get(r, 'region'));
  if (!city && !state && !flag('allow-no-location')) { drop.noLoc++; continue; }
  if (!flag('no-noise-filter') && NOISE.test(rawName)) { drop.noise++; continue; }
  const key = site || `${rawName}|${countryRaw}|${city}`;
  if (seen.has(key)) { drop.dupe++; continue; }
  seen.add(key);
  const yr = parseInt(get(r, 'founded'), 10);
  cands.push({
    _score: (yr >= 1800 && yr <= thisYear ? 3 : 0) + (city ? 2 : 0) + (SIZE_SCORE[get(r, 'size')] ?? 3) + (PREFER && PREFER.test(rawName) ? 4 : 0),
    _region: state || city,
    name: titleCase(rawName, true), description: '', address: '', city, state,
    country: titleCase(countryRaw), country_code: CODE.get(countryRaw) ?? '',
    website: site, employee_count: '', revenue_tier: '', lat: '', lng: '',
    categories: category, certifications: '',
    year_founded: yr >= 1800 && yr <= thisYear ? yr : '',
    company_type: opt('type') ?? '', employee_range: get(r, 'size'), data_source: 'gigasheet',
  });
}
function pickBest(list, n) {
  const group = (arr, key) => { const m = new Map(); for (const x of arr) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
  const best = (a, b) => b._score - a._score || a.name.localeCompare(b.name);
  const countries = [...group(list, (x) => x.country)].sort((a, b) => b[1].length - a[1].length).slice(0, topCountries);
  const total = countries.reduce((t, [, v]) => t + v.length, 0);
  const quotas = countries.map(([c, v]) => ({ c, v, q: Math.floor((n * v.length) / total) }));
  let left = n - quotas.reduce((t, x) => t + x.q, 0);
  for (let i = 0; left > 0; i = (i + 1) % quotas.length, left--) quotas[i].q++;
  const out = [];
  for (const { v, q } of quotas) {
    const regions = [...group(v, (x) => x._region)].sort((a, b) => b[1].length - a[1].length).slice(0, topRegions).map(([r]) => r);
    const dense = v.filter((x) => regions.includes(x._region)).sort(best);
    const take = dense.slice(0, q);
    if (take.length < q) { const rest = v.filter((x) => !take.includes(x)).sort(best); take.push(...rest.slice(0, q - take.length)); }
    out.push(...take);
  }
  return out;
}
const outRows = pickN ? pickBest(cands, pickN) : cands.slice(skip, skip + limit);
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
mkdirSync('data', { recursive: true });
writeFileSync(out, [cols.join(','), ...outRows.map((o) => cols.map((c) => esc(o[c])).join(','))].join('\n') + '\n');

const countries = new Map(); outRows.forEach((o) => countries.set(o.country, (countries.get(o.country) ?? 0) + 1));
console.log(`\nRead ${rows.length - 1} rows -> kept ${outRows.length} companies, saved to ${out}`);
console.log(`Left out: ${drop.noSite} no real website, ${drop.noCountry} no country, ${drop.noLoc} no city or region, ${drop.noise} off-topic names, ${drop.noLatin} non-English names, ${drop.dupe} duplicates, ${drop.noName} bad names.`);
console.log(`Top countries: ${[...countries].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, n]) => `${c} ${n}`).join(', ')}`);
console.log(`With a founding year: ${outRows.filter((o) => o.year_founded).length}. Unknown country codes: ${outRows.filter((o) => !o.country_code).length}.`);
console.log(`\nNext: open ${out} and skim a few rows, then run\n  npm run import -- ${out} --dry\n  npm run import -- ${out}`);
