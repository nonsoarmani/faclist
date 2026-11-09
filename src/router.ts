import type { Env } from './env';
import states from './states.json';
import { getCategory, getCertification, getHomeCategories, getHomeData, getSectionData, getLocation, loadListing, loadSupplier, searchCompanies } from './db';
import { handleSitemap } from './sitemap';
import { renderHome, renderListing, renderSearch, renderSection, renderSupplier, layout } from './render';

// Old category addresses that were merged into another category (permanent redirects keep Google rankings).
const CATEGORY_REDIRECTS: Record<string, string> = { 'electronics-and-electrical': 'electrical-and-electronics' };

// /directory/<category>/mn  ->  /directory/<category>/minnesota   (US states and Canadian provinces)
const stateSlug = (name: string) => {
  const s = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s === 'georgia' ? 'georgia-us' : s;
};
const ABBR_REDIRECTS: Record<string, string> = Object.fromEntries(
  [...Object.entries(states.US), ...Object.entries(states.CA)].map(([abbr, name]) => [abbr.toLowerCase(), stateSlug(name)])
);

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CACHE = 'public, max-age=300, s-maxage=86400';

const html = (body: string, status = 200, extra: HeadersInit = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': status === 200 ? CACHE : 'public, max-age=60, s-maxage=3600', ...extra },
  });

function notFound(origin: string): Response {
  return html(
    layout({
      title: 'Page not found | FacList',
      description: 'The page you requested could not be found.',
      canonical: origin + '/',
      origin,
      noindex: true,
      schema: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Not found' },
      body: `<div class="wrap" style="padding:60px 20px"><h1>Page not found</h1><p><a href="/">Browse the FacList directory</a></p></div>`,
    }),
    404
  );
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origin = (env.SITE_URL ?? url.origin).replace(/\/$/, '');
  let path = url.pathname;

  if (path === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /search\nSitemap: ${origin}/sitemap-index.xml\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': CACHE },
    });
  }

  // one canonical URL per page: lowercase, no trailing slash
  const normalised = path.length > 1 ? path.replace(/\/+$/, '').toLowerCase() : path;
  if (normalised !== path) {
    return Response.redirect(origin + normalised + url.search, 301);
  }

  if (/^\/sitemap[a-z0-9-]*\.xml$/.test(path)) {
    try {
      return await handleSitemap(path, env, origin);
    } catch (err) {
      console.error('sitemap failure', path, err);
      return new Response('Sitemap error', { status: 500, headers: { 'cache-control': 'no-store' } });
    }
  }

  const seg = path.split('/').filter(Boolean);
  if (seg.some((s) => !SLUG.test(s))) return notFound(origin);

  try {
    if (seg.length === 0) return html(renderHome(origin, await getHomeData(env)));

    if (seg[0] === 'import-export' && seg.length === 1) {
      return html(renderSection(origin, await getSectionData(env, 'trade')));
    }

    if (seg[0] === 'search' && seg.length === 1) {
      const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
      const rawPage = Number(url.searchParams.get('page') ?? '1');
      const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
      const [results, cats] = await Promise.all([q ? searchCompanies(env, q, page) : null, getHomeCategories(env)]);
      return html(renderSearch(origin, q, results, page, cats));
    }

    if (seg[0] === 'supplier' && seg.length === 2) {
      const data = await loadSupplier(env, seg[1]);
      return data ? html(renderSupplier(origin, data)) : notFound(origin);
    }

    if (seg[0] === 'directory' && seg.length >= 2 && seg.length <= 4) {
      const [, catSlug, locSlug, certSlug] = seg;
      if (CATEGORY_REDIRECTS[catSlug]) {
        return Response.redirect(`${origin}/directory/${[CATEGORY_REDIRECTS[catSlug], ...seg.slice(2)].join('/')}${url.search}`, 301);
      }
      const [category, location, cert] = await Promise.all([
        getCategory(env, catSlug),
        locSlug ? getLocation(env, locSlug) : Promise.resolve(null),
        certSlug ? getCertification(env, certSlug) : Promise.resolve(null),
      ]);
      if (locSlug && !location && ABBR_REDIRECTS[locSlug]) {
        return Response.redirect(`${origin}/directory/${[catSlug, ABBR_REDIRECTS[locSlug], ...seg.slice(3)].join('/')}${url.search}`, 301);
      }
      if (!category || (locSlug && !location) || (certSlug && !cert)) return notFound(origin);

      const rawPage = Number(url.searchParams.get('page') ?? '1');
      const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

      const data = await loadListing(
        env,
        { categoryId: category.id, location: location ?? undefined, certId: cert?.id },
        page
      );
      // empty combinations 404 instead of serving thin pages
      if (!data) return notFound(origin);

      return html(renderListing({ origin, category, location: location ?? undefined, cert: cert ?? undefined, data, page }));
    }

    return notFound(origin);
  } catch (err) {
    console.error('render failure', path, err);
    return new Response(`<!doctype html><title>Please retry</title><p>The directory is busy for a moment. Please retry in a minute.</p>`, {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '120' },
    });
  }
}
