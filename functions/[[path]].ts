import { handleRequest } from '../src/router';
import type { Env } from '../src/env';

// Catch-all Pages Function. Static files in /public are served before this runs.
//
// Two copies of every good page are kept at the edge:
//   - a fresh copy (1 hour), so new data appears by itself
//   - a backup copy (7 days), used ONLY when the database is busy or unavailable (for example while you are
//     running an import), so visitors and Google keep getting a normal page instead of an error.
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const path = new URL(request.url).pathname;
  // forms and the admin area: never cached, may be POSTed
  if (/^\/(claim|quote|manage|admin)(\/|$)/.test(path)) return handleRequest(request, env);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const cache = (caches as unknown as { default: Cache }).default;
  const CACHE_VERSION = '3'; // only changes if we ever need to wipe the cache instantly
  const u = new URL(request.url);
  const key = new Request(`${u.origin}/__v${CACHE_VERSION}${u.pathname}${u.search}`, { method: 'GET' });
  const backupKey = new Request(`${u.origin}/__backup${CACHE_VERSION}${u.pathname}${u.search}`, { method: 'GET' });

  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await handleRequest(request, env);

  if (res.status === 200) {
    waitUntil(cache.put(key, res.clone()));
    const headers = new Headers(res.headers);
    headers.set('cache-control', 'public, max-age=604800');
    waitUntil(cache.put(backupKey, new Response(res.clone().body, { status: 200, headers })));
    return res;
  }

  if (res.status >= 500) {
    const backup = await cache.match(backupKey);
    if (backup) {
      const headers = new Headers(backup.headers);
      headers.set('cache-control', 'public, max-age=60');
      headers.set('x-served-from', 'backup');
      return new Response(backup.body, { status: 200, headers });
    }
  }
  return res;
};
