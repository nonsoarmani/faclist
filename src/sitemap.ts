import type { Env } from './env';

/** Listing pages with fewer companies than this are left out of the sitemap (they still work, they just aren't pushed to Google). */
const MIN_LISTING = 2;
const SUPPLIERS_PER_FILE = 10000;
const MAX_URLS = 50000;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const day = (s?: string | null) => (s ? s.slice(0, 10) : undefined);

const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=3600' },
  });

const urlset = (items: { loc: string; lastmod?: string }[]) =>
  xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items
      .slice(0, MAX_URLS)
      .map((i) => `<url><loc>${esc(i.loc)}</loc>${i.lastmod ? `<lastmod>${i.lastmod}</lastmod>` : ''}</url>`)
      .join('')}</urlset>`
  );

const index = (items: { loc: string; lastmod?: string }[]) =>
  xml(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items
      .map((i) => `<sitemap><loc>${esc(i.loc)}</loc>${i.lastmod ? `<lastmod>${i.lastmod}</lastmod>` : ''}</sitemap>`)
      .join('')}</sitemapindex>`
  );

const missing = () => new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });

/**
 * Sitemaps are built live from the database, so adding a country updates them automatically.
 *   /sitemap-index.xml                         -> list of all sitemaps (this is the one you submit to Google)
 *   /sitemap-pages.xml                         -> homepage + category pages
 *   /sitemap-<country>.xml                     -> that country's category / region / certification pages
 *   /sitemap-<country>-suppliers-<n>.xml       -> that country's company profiles, 10,000 per file
 */
export async function handleSitemap(path: string, env: Env, origin: string): Promise<Response> {
  if (path === '/sitemap-index.xml' || path === '/sitemap.xml') {
    const r = await env.DB.prepare(
      `SELECT country_slug AS slug, COUNT(*) AS n, MAX(created_at) AS last FROM companies GROUP BY country_slug ORDER BY country_slug`
    ).all<{ slug: string; n: number; last: string }>();
    const items: { loc: string; lastmod?: string }[] = [{ loc: `${origin}/sitemap-pages.xml` }];
    for (const c of r.results) {
      items.push({ loc: `${origin}/sitemap-${c.slug}.xml`, lastmod: day(c.last) });
      for (let p = 1; p <= Math.ceil(c.n / SUPPLIERS_PER_FILE); p++) {
        items.push({ loc: `${origin}/sitemap-${c.slug}-suppliers-${p}.xml`, lastmod: day(c.last) });
      }
    }
    return index(items);
  }

  if (path === '/sitemap-pages.xml') {
    const r = await env.DB.prepare(
      `SELECT cat.slug FROM categories cat WHERE EXISTS (SELECT 1 FROM company_categories cc WHERE cc.category_id = cat.id) ORDER BY cat.slug`
    ).all<{ slug: string }>();
    return urlset([{ loc: `${origin}/` }, ...r.results.map((c) => ({ loc: `${origin}/directory/${c.slug}` }))]);
  }

  const sup = path.match(/^\/sitemap-([a-z0-9-]+)-suppliers-(\d+)\.xml$/);
  if (sup) {
    const page = Number(sup[2]);
    if (page < 1) return missing();
    const r = await env.DB.prepare(
      `SELECT slug, created_at FROM companies WHERE country_slug = ? ORDER BY id LIMIT ? OFFSET ?`
    )
      .bind(sup[1], SUPPLIERS_PER_FILE, (page - 1) * SUPPLIERS_PER_FILE)
      .all<{ slug: string; created_at: string }>();
    if (!r.results.length) return missing();
    return urlset(r.results.map((c) => ({ loc: `${origin}/supplier/${c.slug}`, lastmod: day(c.created_at) })));
  }

  const country = path.match(/^\/sitemap-([a-z0-9-]+)\.xml$/);
  if (country) {
    const cs = country[1];
    const base = `FROM company_categories cc JOIN companies c ON c.id = cc.company_id JOIN categories cat ON cat.id = cc.category_id`;
    const certJoin = `JOIN company_certifications cx ON cx.company_id = c.id JOIN certifications ce ON ce.id = cx.certification_id`;
    const [a, b, c2, d] = await env.DB.batch([
      env.DB.prepare(`SELECT cat.slug AS cat, c.country_slug AS loc ${base} WHERE c.country_slug = ? GROUP BY cat.id HAVING COUNT(*) >= ?`).bind(cs, MIN_LISTING),
      env.DB.prepare(`SELECT cat.slug AS cat, c.state_slug AS loc ${base} WHERE c.country_slug = ? AND c.state_slug IS NOT NULL GROUP BY cat.id, c.state_slug HAVING COUNT(*) >= ?`).bind(cs, MIN_LISTING),
      env.DB.prepare(`SELECT cat.slug AS cat, c.country_slug AS loc, ce.slug AS cert ${base} ${certJoin} WHERE c.country_slug = ? GROUP BY cat.id, ce.id HAVING COUNT(*) >= ?`).bind(cs, MIN_LISTING),
      env.DB.prepare(`SELECT cat.slug AS cat, c.state_slug AS loc, ce.slug AS cert ${base} ${certJoin} WHERE c.country_slug = ? AND c.state_slug IS NOT NULL GROUP BY cat.id, c.state_slug, ce.id HAVING COUNT(*) >= ?`).bind(cs, MIN_LISTING),
    ]);
    const rows = [...a.results, ...b.results, ...c2.results, ...d.results] as unknown as { cat: string; loc: string; cert?: string }[];
    if (!rows.length) {
      // a real country with only tiny groups still gets a valid (possibly short) file; an unknown country is a 404
      const exists = await env.DB.prepare('SELECT 1 AS x FROM companies WHERE country_slug = ? LIMIT 1').bind(cs).first();
      if (!exists) return missing();
    }
    return urlset(rows.map((r) => ({ loc: `${origin}/directory/${r.cat}/${r.loc}${r.cert ? `/${r.cert}` : ''}` })));
  }

  return missing();
}
