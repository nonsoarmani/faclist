import type { Env } from './env';
import { getCategory, getCertification, getHomeData, getLocation, loadListing, loadSupplier } from './db';
import { renderHome, renderListing, renderSupplier, layout } from './render';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CACHE = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';

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
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap-index.xml\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': CACHE },
    });
  }

  // one canonical URL per page: lowercase, no trailing slash
  const normalised = path.length > 1 ? path.replace(/\/+$/, '').toLowerCase() : path;
  if (normalised !== path) {
    return Response.redirect(origin + normalised + url.search, 301);
  }

  const seg = path.split('/').filter(Boolean);
  if (seg.some((s) => !SLUG.test(s))) return notFound(origin);

  try {
    if (seg.length === 0) return html(renderHome(origin, await getHomeData(env)));

    if (seg[0] === 'supplier' && seg.length === 2) {
      const data = await loadSupplier(env, seg[1]);
      return data ? html(renderSupplier(origin, data)) : notFound(origin);
    }

    if (seg[0] === 'directory' && seg.length >= 2 && seg.length <= 4) {
      const [, catSlug, locSlug, certSlug] = seg;
      const [category, location, cert] = await Promise.all([
        getCategory(env, catSlug),
        locSlug ? getLocation(env, locSlug) : Promise.resolve(null),
        certSlug ? getCertification(env, certSlug) : Promise.resolve(null),
      ]);
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
    return new Response(`<!doctype html><title>Error</title><p>Something went wrong. Please retry.</p>`, {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
}
