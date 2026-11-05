import type { Env } from './env';

export interface Category {
  id: number;
  name: string;
  slug: string;
  meta_title_template: string;
  description_template: string;
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
}

export interface Company extends CompanyCard {
  address: string | null;
  country_code: string;
  lat: number | null;
  lng: number | null;
  website: string | null;
  created_at: string;
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
}

export const PAGE_SIZE = 24;

/* ---------- single-row lookups ---------- */

export const getCategory = (env: Env, slug: string) =>
  env.DB.prepare('SELECT * FROM categories WHERE slug = ?').bind(slug).first<Category>();

export const getLocation = (env: Env, slug: string) =>
  env.DB.prepare('SELECT * FROM locations WHERE slug = ?').bind(slug).first<Location>();

export const getCertification = (env: Env, slug: string) =>
  env.DB.prepare('SELECT * FROM certifications WHERE slug = ?').bind(slug).first<Certification>();

export async function getHomeCategories(env: Env) {
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

/** One D1 round-trip (batch) loads everything a listing page needs. Returns null when the page is out of range. */
export async function loadListing(env: Env, f: Filter, page: number): Promise<ListingData | null> {
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
              c.employee_count, c.revenue_tier, c.claimed_status, c.year_founded, c.company_type
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

/* ---------- supplier page ---------- */

export interface SupplierData {
  company: Company;
  categories: { slug: string; name: string }[];
  certs: { slug: string; code: string; name: string; authority: string | null }[];
  related: CompanyCard[];
}

export async function loadSupplier(env: Env, slug: string): Promise<SupplierData | null> {
  const company = await env.DB.prepare('SELECT * FROM companies WHERE slug = ?').bind(slug).first<Company>();
  if (!company) return null;

  const [cats, certs, rel] = await env.DB.batch([
    env.DB.prepare(
      `SELECT cat.slug, cat.name FROM company_categories cc JOIN categories cat ON cat.id = cc.category_id
        WHERE cc.company_id = ? ORDER BY cat.id`
    ).bind(company.id),
    env.DB.prepare(
      `SELECT ce.slug, ce.code, ce.name, ce.authority FROM company_certifications cx
         JOIN certifications ce ON ce.id = cx.certification_id
        WHERE cx.company_id = ? ORDER BY ce.code`
    ).bind(company.id),
    env.DB.prepare(
      `SELECT c.id, c.slug, c.name, c.description, c.city, c.state, c.state_slug, c.country, c.country_slug,
              c.employee_count, c.revenue_tier, c.claimed_status, c.year_founded, c.company_type
         FROM company_categories cc JOIN companies c ON c.id = cc.company_id
        WHERE cc.category_id = (SELECT MIN(category_id) FROM company_categories WHERE company_id = ?)
          AND c.id != ? AND c.country_slug = ?
        ORDER BY c.claimed_status DESC, c.employee_count DESC LIMIT 6`
    ).bind(company.id, company.id, company.country_slug),
  ]);

  return {
    company,
    categories: cats.results as unknown as SupplierData['categories'],
    certs: certs.results as unknown as SupplierData['certs'],
    related: rel.results as unknown as CompanyCard[],
  };
}

/* ---------- homepage ---------- */

export interface HomeData {
  total: number;
  categories: { slug: string; name: string; n: number }[];
  countries: { slug: string; name: string; n: number; cat_slug: string | null }[];
}

export async function getHomeData(env: Env): Promise<HomeData> {
  const [t, cats, ctry] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM companies'),
    env.DB.prepare(
      `SELECT cat.slug, cat.name, COUNT(cc.company_id) AS n
         FROM categories cat LEFT JOIN company_categories cc ON cc.category_id = cat.id
        GROUP BY cat.id ORDER BY n DESC, cat.name`
    ),
    env.DB.prepare(
      `SELECT c.country_slug AS slug, c.country AS name, COUNT(*) AS n,
              (SELECT cat.slug FROM company_categories cc2
                 JOIN categories cat ON cat.id = cc2.category_id
                 JOIN companies c2 ON c2.id = cc2.company_id
                WHERE c2.country_slug = c.country_slug
                GROUP BY cat.id ORDER BY COUNT(*) DESC LIMIT 1) AS cat_slug
         FROM companies c GROUP BY c.country_slug ORDER BY n DESC, name LIMIT 60`
    ),
  ]);
  return {
    total: (t.results[0] as { n: number }).n,
    categories: cats.results as unknown as HomeData['categories'],
    countries: ctry.results as unknown as HomeData['countries'],
  };
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
              c.employee_count, c.revenue_tier, c.claimed_status, c.year_founded, c.company_type
         FROM company_search s JOIN companies c ON c.id = s.rowid
        WHERE company_search MATCH ?
        ORDER BY bm25(company_search, 10.0, 2.0, 2.0, 2.0, 5.0, 1.0, 3.0), c.claimed_status DESC
        LIMIT ? OFFSET ?`
    ).bind(q, PAGE_SIZE, (page - 1) * PAGE_SIZE),
  ]);
  return { total: (c.results[0] as { n: number }).n, companies: r.results as unknown as CompanyCard[] };
}
