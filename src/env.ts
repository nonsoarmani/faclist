export interface Env {
  DB: D1Database;
  /** Optional canonical origin override, e.g. "https://faclist.com". Falls back to the request origin. */
  SITE_URL?: string;
  /** Password for /admin (set it as a secret, see HOW-TO.md). Without it the admin area stays closed. */
  ADMIN_PASSWORD?: string;
  /** Optional instant notifications on Telegram. */
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  /** Optional email through Resend (resend.com): admin alerts, edit links, quote requests for claimed suppliers. */
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  ADMIN_EMAIL?: string;
  /** Optional hosted checkout link (Paystack, Flutterwave, Gumroad...) shown to verified owners who want the Featured plan. */
  FEATURED_CHECKOUT_URL?: string;
}
