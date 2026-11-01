import { handleRequest } from '../src/router';
import type { Env } from '../src/env';

// Catch-all Pages Function. Static files in /public are served before this runs.
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const cache = (caches as unknown as { default: Cache }).default;
  const key = new Request(request.url, { method: 'GET' });

  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await handleRequest(request, env);
  if (res.status === 200) waitUntil(cache.put(key, res.clone()));
  return res;
};
