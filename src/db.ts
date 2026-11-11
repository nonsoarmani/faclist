import type { Env } from './env';

export interface Category {
  id: number;
  name: string;
  slug: string;
  meta_title_template: string;
  description_template: string;
  section: 'manufacturing' | 'trade';
}

export interface Certification {
  id: number;
  name: string;
  code: string;
  slug: string;
  authority: string | null;
  description: string | null;
}

export interface Location {
  slug: string;
  name: string;
  type: 'country' | 'state';
  country_code: string;
  country_name: string;
}

export interface CompanyCard {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  state_slug: string | null;
  country: string;
  country_slug: string;
  employee_count: number | null;
  revenue_tier: string | null;
  claimed_status: number;
  year_founded: number | null;
  company_type: string | null;
  employee_range: string | null;
}

export interface Company extends CompanyCard {
  address: string | null;
  country_code: string;
  lat: number | null;
  lng: number | null;
  website: string | null;
  created_at: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  sales_range: string | null;
  industries: string | null;
  capabilities: string | null;
  products: string | null;
  data_source: string | null;
}

export interface Facet {
  slug: string;
  name: string;
  n: number;
}

export interface CertFacet {
  slug: string;
  code: string;
  name: string;
  n: number;
}

export interface Filter {
  categoryId: number;
  location?: Location;
  certId?: number;
}

export interface ListingData {
  total: number;
  avgEmployees: number | null;
  claimed: number;
  companies: CompanyCard[];
  topCities: string[];
  locationFacets: Facet[];
  certFacets: CertFacet[];
  featured?: CompanyCard[];
}

export const PAGE_SIZE = 24;

/* ---------- single-row lookups ---------- */

export const getCategory = (env: Env, slug: string) =>
  env.DB.prepare('SELECT * FROM categories WHERE slug = ?').bind(slug).first<Category>();

export const getLocation = (env: Env, slug: string) =>
  env.DB.prepare('SELECT * FROM locations WHERE slug = ?').bind(slug).first<Location>();

export const getCertification = (env: Env, slug: string) =>
  env.DB.prepare('SELECT * FROM certifications WHERE slug = ?').bind(slug).first<Certification>();

async function readSiteStat<T>(env: Env, key: string): Promise<T | null> {
  try {
    const r = await env.DB.prepare('SELECT value FROM site_stats WHERE key = ?').bind(key).first<{ value: string }>();
    return r ? (JSON.parse(r.value) as T) : null;
  } catch (e) {
    if (/no such table/i.test(String((e as Error)?.message))) return null; // not created yet
    throw e; // a real problem (for example the daily limit): let the page answer 503
  }
}

export async function getHomeCategories(env: Env) {
  const [m, t] = await Promise.all([readSiteStat<SectionData>(env, 'section:manufacturing'), readSiteStat<SectionData>(env, 'section:trade')]);
  if (m && t) return [...m.categories, ...t.categories].sort((a, b) => b.n - a.n);
  return []; // statistics not built yet: the search page simply shows no category links
}

async function getHomeCategoriesLive(env: Env) {
  const r = await env.DB.prepare(
    `SELECT cat.slug, cat.name, COUNT(cc.company_id) AS n
       FROM categories cat LEFT JOIN company_categories cc ON cc.category_id = cat.id
      GROUP BY cat.id ORDER BY n DESC, cat.name`
  ).all<{ slug: string; name: string; n: number }>();
  return r.results;
}

/* ---------- listing pages ---------- */

function buildFilter(f: Filter) {
  let from = 'company_categories cc JOIN companies c ON c.id = cc.company_id';
  const params: unknown[] = [];
  if (f.certId !== undefined) {
    from += ' JOIN company_certifications cx ON cx.company_id = c.id AND cx.certification_id = ?';
    params.push(f.certId);
  }
  let where = 'cc.category_id = ?';
  params.push(f.categoryId);
  if (f.location) {
    // column name comes from a closed enum, never from user input
    where += ` AND c.${f.location.type === 'state' ? 'state_slug' : 'country_slug'} = ?`;
    params.push(f.location.slug);
  }
  return { from, where, params };
}

/** The original, expensive way: scans every matching company. Only used until `npm run stats` has been run once. */
async function loadListingLive(env: Env, f: Filter, page: number): Promise<ListingData | null> {
  const base = buildFilter(f);
  const noCert = buildFilter({ ...f, certId: undefined });
  const none = () => env.DB.prepare('SELECT 1 AS x WHERE 0');

  const locFacetSql = !f.location
    ? `SELECT c.country_slug AS slug, c.country AS name, COUNT(*) AS n FROM ${base.from}
        WHERE ${base.where} GROUP BY c.country_slug ORDER BY n DESC, name LIMIT 30`
    : f.location.type === 'country'
      ? `SELECT c.state_slug AS slug, c.state AS name, COUNT(*) AS n FROM ${base.from}
          WHERE ${base.where} AND c.state_slug IS NOT NULL GROUP BY c.state_slug ORDER BY n DESC, name LIMIT 30`
      : null;

  const stmts = [
    env.DB.prepare(
      `SELECT COUNT(*) AS n, AVG(c.employee_count) AS avg_emp, COALESCE(SUM(c.claimed_status), 0) AS claimed
         FROM ${base.from} WHERE ${base.where}`
    ).bind(...base.params),
    env.DB.prepare(
      `SELECT c.id, c.slug, c.name, c.description, c.city, c.state, c.state_slug, c.country, c.country_slug,
              c.employee_count, c.revenue_tier, c.claimed_status, c.year_founded, c.company_type, c.employee_range
         FROM ${base.from} WHERE ${base.where}
        ORDER BY c.claimed_status DESC, c.employee_count DESC, c.id
        LIMIT ? OFFSET ?`
    ).bind(...base.params, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    env.DB.prepare(
      `SELECT c.city AS name FROM ${base.from}
        WHERE ${base.where} AND c.city IS NOT NULL
        GROUP BY c.city ORDER BY COUNT(*) DESC, c.city LIMIT 5`
    ).bind(...base.params),
    locFacetSql ? env.DB.prepare(locFacetSql).bind(...base.params) : none(),
    f.location
      ? env.DB.prepare(
          `SELECT ce.slug, ce.code, ce.name, COUNT(*) AS n
             FROM ${noCert.from}
             JOIN company_certifications cx ON cx.company_id = c.id
             JOIN certifications ce ON ce.id = cx.certification_id
            WHERE ${noCert.where}
            GROUP BY ce.id ORDER BY n DESC, ce.code LIMIT 8`
        ).bind(...noCert.params)
      : none(),
  ];

  const [s, l, t, lf, cf] = await env.DB.batch(stmts);
  const stats = (s.results[0] ?? { n: 0, avg_emp: null, claimed: 0 }) as {
    n: number;
    avg_emp: number | null;
    claimed: number;
  };
  if (stats.n === 0 || (page - 1) * PAGE_SIZE >= stats.n) return null;

  return {
    total: stats.n,
    avgEmployees: stats.avg_emp,
    claimed: stats.claimed,
    companies: l.results as unknown as CompanyCard[],
    topCities: (t.results as unknown as { name: string }[]).map((r) => r.name),
    locationFacets: lf.results as unknown as Facet[],
    certFacets: cf.results as unknown as CertFacet[],
  };
}

const CARD_COLS = `c.id, c.slug, c.name, c.description, c.city, c.state, c.state_slug, c.country, c.country_slug,
              c.employee_count, c.revenue_tier, c.claimed_status, c.year_founded, c.company_type, c.employee_range`;

/**
 * The cheap way: counts and facets come from one pre-computed row, and the page of companies is read in index order,
 * so a page view touches roughly 24 rows instead of every company in the category.
 */
export async function loadListing(env: Env, f: Filter, page: number): Promise<ListingData | null> {
  const key = `${f.categoryId}|${f.location?.slug ?? ''}|${f.certId ?? 0}`;
  const stat = await env.DB.prepare(
    'SELECT total, avg_emp, claimed, top_cities, loc_facets, cert_facets FROM listing_stats WHERE key = ?'
  ).bind(key).first<{ total: number; avg_emp: number | null; claimed: number; top_cities: string; loc_facets: string; cert_facets: string }>();
  if (!stat) {
    const built = await env.DB.prepare('SELECT 1 AS x FROM listing_stats LIMIT 1').first();
    if (built) return null; // statistics exist but have no row for this combination = no companies = 404
    // Safe mode: the old method scans thousands of rows per page and burns the free daily read limit,
    // so until the statistics are built the page answers "busy, retry later" (503) instead.
    throw new Error('Statistics are not built yet. Run: npm run db:migrate5:remote  and then  npm run stats');
  }
  if ((page - 1) * PAGE_SIZE >= stat.total) return null;

  const loc = f.location;
  const col = loc ? (loc.type === 'state' ? 'c.state_slug' : 'c.country_slug') : null;
  let sql: string;
  let params: unknown[];
  if (f.certId !== undefined) {
    // certification pages are small: start from the certification, already in company order
    sql = `SELECT ${CARD_COLS} FROM company_certifications cx
             CROSS JOIN company_categories cc ON cc.company_id = cx.company_id AND cc.category_id = ?
             CROSS JOIN companies c ON c.id = cx.company_id
            WHERE cx.certification_id = ?${col ? ` AND ${col} = ?` : ''}
            ORDER BY cx.company_id LIMIT ? OFFSET ?`;
    params = [f.categoryId, f.certId, ...(loc ? [loc.slug] : [])];
  } else if (loc?.type === 'state') {
    // a state is a small slice: start from the state index
    sql = `SELECT ${CARD_COLS} FROM companies c
             CROSS JOIN company_categories cc ON cc.company_id = c.id AND cc.category_id = ?
            WHERE c.state_slug = ? ORDER BY c.id LIMIT ? OFFSET ?`;
    params = [f.categoryId, loc.slug];
  } else {
    // whole category or a country: start from the category's company list, already in company order
    sql = `SELECT ${CARD_COLS} FROM company_categories cc
             CROSS JOIN companies c ON c.id = cc.company_id
            WHERE cc.category_id = ?${loc ? ' AND c.country_slug = ?' : ''}
            ORDER BY cc.company_id LIMIT ? OFFSET ?`;
    params = [f.categoryId, ...(loc ? [loc.slug] : [])];
  }
  const rows = await env.DB.prepare(sql).bind(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE).all<CompanyCard>();
  let featured: CompanyCard[] = [];
  if (page === 1) {
    // paid placements: a tiny table, so this reads only the handful of featured companies
    const fcol = loc ? (loc.type === 'state' ? 'c.state_slug' : 'c.country_slug') : null;
    featured = await env.DB.prepare(
      `SELECT ${CARD_COLS} FROM featured f CROSS JOIN companies c ON c.id = f.company_id
         CROSS JOIN company_categories cc ON cc.company_id = c.id AND cc.category_id = ?
        WHERE f.until > datetime('now')${fcol ? ` AND ${fcol} = ?` : ''} ORDER BY f.until DESC LIMIT 3`
    ).bind(f.categoryId, ...(loc ? [loc.slug] : [])).all<CompanyCard>().then((r) => r.results).catch(() => []);
  }
  return {
    featured,
    total: stat.total,
    avgEmployees: stat.avg_emp,
    claimed: stat.claimed,
    companies: rows.results,
    topCities: JSON.parse(stat.top_cities),
    locationFacets: JSON.parse(stat.loc_facets),
    certFacets: JSON.parse(stat.cert_facets),
  };
}

/* ---------- supplier page ---------- */

export interface SupplierData {
  company: Company;
  categories: { slug: string; name: string; section: string }[];
  certs: { slug: string; code: string; name: string; authority: string | null }[];
  related: CompanyCard[];
  featured?: boolean;
}

export async function loadSupplier(env: Env, slug: string): Promise<SupplierData | null> {
  const company = await env.DB.prepare('SELECT * FROM companies WHERE slug = ?').bind(slug).first<Company>();
  if (!company) return null;

  const placeCol = company.state_slug ? 'c.state_slug' : 'c.country_slug';
  const placeVal = company.state_slug ?? company.country_slug;
  const [cats, certs, rel] = await env.DB.batch([
    env.DB.prepare(
      `SELECT cat.slug, cat.name, cat.section FROM company_categories cc JOIN categories cat ON cat.id = cc.category_id
        WHERE cc.company_id = ? ORDER BY cat.id`
    ).bind(company.id),
    env.DB.prepare(
      `SELECT ce.slug, ce.code, ce.name, ce.authority FROM company_certifications cx
         JOIN certifications ce ON ce.id = cx.certification_id
        WHERE cx.company_id = ? ORDER BY ce.code`
    ).bind(company.id),
    // neighbours in the same category and place: the next companies by id (no sorting, so it reads only a handful of rows)
    env.DB.prepare(
      `SELECT ${CARD_COLS} FROM companies c
         CROSS JOIN company_categories cc ON cc.company_id = c.id
          AND cc.category_id = (SELECT MIN(category_id) FROM company_categories WHERE company_id = ?)
        WHERE ${placeCol} = ? AND c.id > ? ORDER BY c.id LIMIT 6`
    ).bind(company.id, placeVal, company.id),
  ]);

  let related = rel.results as unknown as CompanyCard[];
  if (related.length < 6) {
    // near the end of the list: wrap round and take the companies just before this one
    const more = await env.DB.prepare(
      `SELECT ${CARD_COLS} FROM companies c
         CROSS JOIN company_categories cc ON cc.company_id = c.id
          AND cc.category_id = (SELECT MIN(category_id) FROM company_categories WHERE company_id = ?)
        WHERE ${placeCol} = ? AND c.id < ? ORDER BY c.id DESC LIMIT ?`
    ).bind(company.id, placeVal, company.id, 6 - related.length).all<CompanyCard>();
    related = [...related, ...more.results];
  }

  const feat = await env.DB.prepare("SELECT 1 AS x FROM featured WHERE company_id = ? AND until > datetime('now')").bind(company.id).first().catch(() => null);
  return {
    featured: !!feat,
    company,
    categories: cats.results as unknown as SupplierData['categories'],
    certs: certs.results as unknown as SupplierData['certs'],
    related,
  };
}

/* ---------- homepage and sections ---------- */

export type SectionName = 'manufacturing' | 'trade';

export interface SectionData {
  total: number;
  categories: { slug: string; name: string; n: number }[];
  countries: { slug: string; name: string; n: number; cat_slug: string | null }[];
}

export interface HomeData extends SectionData {
  trade: { total: number; categories: { slug: string; name: string; n: number }[] };
}

/** Categories, company count and (optionally) countries for one section of the site. */
export async function getSectionData(env: Env, section: SectionName, withCountries = true): Promise<SectionData> {
  const stored = await readSiteStat<SectionData>(env, `section:${section}`);
  if (stored) return withCountries ? stored : { ...stored, countries: [] };
  throw new Error('Statistics are not built yet. Run: npm run db:migrate5:remote  and then  npm run stats'); // safe mode, see loadListing
}

async function getSectionDataLive(env: Env, section: SectionName, withCountries = true): Promise<SectionData> {
  const stmts = [
    env.DB.prepare(
      `SELECT COUNT(DISTINCT cc.company_id) AS n FROM company_categories cc JOIN categories k ON k.id = cc.category_id WHERE k.section = ?`
    ).bind(section),
    env.DB.prepare(
      `SELECT cat.slug, cat.name, COUNT(cc.company_id) AS n
         FROM categories cat LEFT JOIN company_categories cc ON cc.category_id = cat.id
        WHERE cat.section = ? GROUP BY cat.id ORDER BY n DESC, cat.name`
    ).bind(section),
    withCountries
      ? env.DB.prepare(
          `SELECT c.country_slug AS slug, c.country AS name, COUNT(*) AS n,
                  (SELECT cat.slug FROM company_categories cc2
                     JOIN categories cat ON cat.id = cc2.category_id
                     JOIN companies c2 ON c2.id = cc2.company_id
                    WHERE c2.country_slug = c.country_slug AND cat.section = ?
                    GROUP BY cat.id ORDER BY COUNT(*) DESC LIMIT 1) AS cat_slug
             FROM companies c
            WHERE EXISTS (SELECT 1 FROM company_categories cc JOIN categories k ON k.id = cc.category_id
                           WHERE cc.company_id = c.id AND k.section = ?)
            GROUP BY c.country_slug ORDER BY n DESC, name LIMIT 60`
        ).bind(section, section)
      : env.DB.prepare('SELECT 1 AS x WHERE 0'),
  ];
  const [t, cats, ctry] = await env.DB.batch(stmts);
  return {
    total: (t.results[0] as { n: number }).n,
    categories: cats.results as unknown as SectionData['categories'],
    countries: withCountries ? (ctry.results as unknown as SectionData['countries']) : [],
  };
}

export async function getHomeData(env: Env): Promise<HomeData> {
  const [m, t] = await Promise.all([getSectionData(env, 'manufacturing'), getSectionData(env, 'trade', false)]);
  return { ...m, trade: { total: t.total, categories: t.categories } };
}

/* ---------- search ---------- */

const STOP = new Set(['in', 'for', 'the', 'and', 'of', 'a', 'to', 'near', 'at', 'on', 'with']);

/** Turns what a visitor typed into a safe FTS5 query: every word must match (as a prefix). */
export function ftsQuery(raw: string): string | null {
  const words = (raw.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => !STOP.has(w)).slice(0, 8);
  return words.length ? words.map((w) => `"${w}"*`).join(' ') : null;
}

export async function searchCompanies(env: Env, raw: string, page: number): Promise<{ total: number; companies: CompanyCard[] }> {
  const q = ftsQuery(raw);
  if (!q) return { total: 0, companies: [] };
  const [c, r] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM company_search WHERE company_search MATCH ?').bind(q),
    env.DB.prepare(
      `SELECT c.id, c.slug, c.name, c.description, c.city, c.state, c.state_slug, c.country, c.country_slug,
              c.employee_count, c.revenue_tier, c.claimed_status, c.year_founded, c.company_type, c.employee_range
         FROM company_search s JOIN companies c ON c.id = s.rowid
        WHERE company_search MATCH ?
        ORDER BY bm25(company_search, 10.0, 2.0, 2.0, 2.0, 5.0, 1.0, 3.0), c.claimed_status DESC
        LIMIT ? OFFSET ?`
    ).bind(q, PAGE_SIZE, (page - 1) * PAGE_SIZE),
  ]);
  return { total: (c.results[0] as { n: number }).n, companies: r.results as unknown as CompanyCard[] };
}
