import { handleRequest } from '../src/router';
import type { Env } from '../src/env';

// Catch-all Pages Function. Static files in /public are served before this runs.
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const cache = (caches as unknown as { default: Cache }).default;
  // Bump CACHE_VERSION after any design/copy change so edge caches serve fresh pages immediately.
  const CACHE_VERSION = '3';
  const u = new URL(request.url);
  const key = new Request(`${u.origin}/__v${CACHE_VERSION}${u.pathname}${u.search}`, { method: 'GET' });

  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await handleRequest(request, env);
  if (res.status === 200) waitUntil(cache.put(key, res.clone()));
  return res;
};
