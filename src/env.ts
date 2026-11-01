export interface Env {
  DB: D1Database;
  /** Optional canonical origin override, e.g. "https://faclist.com". Falls back to the request origin. */
  SITE_URL?: string;
}
