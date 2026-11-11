import type { Env } from './env';
import { esc, layout } from './render';
import { sha256, randomToken } from './crypto';
import { notify, sendMail } from './notify';
import { PLANS } from './config';

export interface Ctx { request: Request; env: Env; origin: string; url: URL }

/* ---------- small helpers ---------- */

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanMulti = (v: unknown, max: number) => String(v ?? '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;
const PHONE = /^[+0-9 ()\-.]{6,25}$/;
const FREE_MAIL = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com', 'live.com', 'mail.com', 'gmx.com', 'yandex.com', 'zoho.com']);

export const page = (origin: string, title: string, body: string, status = 200): Response =>
  new Response(
    layout({
      title: `${title} | FacList`,
      description: title,
      canonical: origin + '/',
      origin,
      noindex: true,
      body: `<div class="wrap" style="max-width:780px;padding-top:28px;padding-bottom:20px">${body}</div>`,
      schema: { '@context': 'https://schema.org', '@type': 'WebPage', name: title },
    }),
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
  );

const missing = (origin: string) => page(origin, 'Page not found', '<h1>Page not found</h1><p><a href="/">Back to FacList</a></p>', 404);

const hostOf = (w: string | null | undefined) => {
  try { return new URL(String(w)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};

export async function ipHash(request: Request): Promise<string> {
  return (await sha256(`${request.headers.get('cf-connecting-ip') ?? 'unknown'}|faclist`)).slice(0, 32);
}

async function tooMany(env: Env, table: 'claims' | 'leads', h: string): Promise<boolean> {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')`).bind(h).first<{ n: number }>();
  return (r?.n ?? 0) >= 5;
}

function botCheck(form: FormData): 'honeypot' | 'fast' | null {
  if (clean(form.get('url2'), 50)) return 'honeypot';
  const age = Date.now() - Number(form.get('ts'));
  return !Number.isFinite(age) || age < 2500 || age > 6 * 3600 * 1000 ? 'fast' : null;
}

const linkCount = (s: string) => (s.match(/https?:\/\//gi) ?? []).length;

const trap = () => `<input type="hidden" name="ts" value="${Date.now()}"><div class="hp" aria-hidden="true"><label>Leave this empty <input name="url2" tabindex="-1" autocomplete="off"></label></div>`;
const errs = (e: string[]) => (e.length ? `<div class="alert">${e.map((x) => `<div>${esc(x)}</div>`).join('')}</div>` : '');
const where = (c: { city: string | null; state: string | null; country: string }) => [...new Set([c.city, c.state, c.country].filter(Boolean))].join(', ');

interface CompanyRow { id: number; slug: string; name: string; city: string | null; state: string | null; country: string; website: string | null; claimed_status: number; claimed_email: string | null }
const getCompany = (env: Env, slug: string) =>
  env.DB.prepare('SELECT id, slug, name, city, state, country, website, claimed_status, claimed_email FROM companies WHERE slug = ?').bind(slug).first<CompanyRow>();

/* ---------- 1. claim a profile ---------- */

function emailCheck(email: string, website: string | null): string {
  const dom = email.split('@')[1].toLowerCase();
  if (FREE_MAIL.has(dom)) return 'free-email';
  const host = hostOf(website);
  if (!host) return 'no-website';
  return dom === host || dom.endsWith('.' + host) || host.endsWith('.' + dom) ? 'match' : 'mismatch';
}

export async function claimPage(ctx: Ctx, slug: string): Promise<Response> {
  const { request, env, origin } = ctx;
  const c = await getCompany(env, slug);
  if (!c) return missing(origin);
  const back = `<p><a href="/supplier/${esc(c.slug)}">&larr; Back to ${esc(c.name)}</a></p>`;
  if (c.claimed_status) return page(origin, 'Already claimed', `<h1>${esc(c.name)} is already claimed</h1><p>This profile has been verified by its owner. If you think this is a mistake, reply to the email you received when it was verified, or contact us through the admin address on our site.</p>${back}`);

  let values: Record<string, string> = {};
  let errors: string[] = [];
  if (request.method === 'POST') {
    const form = await request.formData();
    const bot = botCheck(form);
    if (bot === 'honeypot') return thanksClaim(origin, c.name); // pretend success, store nothing
    values = { name: clean(form.get('name'), 100), title: clean(form.get('title'), 100), email: clean(form.get('email'), 150).toLowerCase(), phone: clean(form.get('phone'), 30), message: cleanMulti(form.get('message'), 600) };
    if (bot === 'fast') errors.push('Please wait a couple of seconds and press submit again.');
    if (values.name.length < 2) errors.push('Please enter your name.');
    if (!EMAIL.test(values.email)) errors.push('Please enter a valid work email address.');
    if (values.phone && !PHONE.test(values.phone)) errors.push('Please enter a valid phone number, or leave it empty.');
    if (form.get('agree') !== '1') errors.push('Please confirm that you are authorised to represent this company.');
    if (linkCount(values.message) > 2) errors.push('Please remove some links from your message.');
    if (!errors.length) {
      const h = await ipHash(request);
      if (await tooMany(env, 'claims', h)) return page(origin, 'Too many requests', '<h1>Too many requests</h1><p>Please try again in an hour.</p>', 429);
      const dup = await env.DB.prepare("SELECT id FROM claims WHERE company_id = ? AND lower(email) = ? AND status = 'pending'").bind(c.id, values.email).first();
      if (!dup) {
        const check = emailCheck(values.email, c.website);
        await env.DB.prepare('INSERT INTO claims (company_id, name, title, email, phone, message, email_check, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(c.id, values.name, values.title || null, values.email, values.phone || null, values.message || null, check, h).run();
        await notify(env, `New claim: ${c.name}`, `${values.name}${values.title ? ` (${values.title})` : ''}\n${values.email}  [email check: ${check}]\n${c.name}, ${where(c)}\n\nReview: ${origin}/admin/claims`);
      }
      return thanksClaim(origin, c.name);
    }
  }

  return page(origin, `Claim ${c.name}`, `<h1>Claim ${esc(c.name)}</h1>
<p class="meta" style="margin-top:-8px">${esc(where(c))}</p>
<p>Confirm that you work here to verify this profile, update your company details and receive quote requests from buyers. It is free.</p>
${errs(errors)}
<form method="post" class="form" action="/claim/${esc(c.slug)}">${trap()}
<label for="name">Your name *</label><input id="name" name="name" required maxlength="100" value="${esc(values.name)}">
<label for="title">Job title</label><input id="title" name="title" maxlength="100" value="${esc(values.title)}">
<label for="email">Work email *</label><input id="email" type="email" name="email" required maxlength="150" value="${esc(values.email)}">
<small>Use an email at your company's own domain, for example name@${esc(hostOf(c.website) || 'yourcompany.com')}. It makes approval faster.</small>
<label for="phone">Phone or WhatsApp</label><input id="phone" name="phone" maxlength="30" value="${esc(values.phone)}">
<label for="message">Anything that helps us verify you</label><textarea id="message" name="message" rows="3" maxlength="600">${esc(values.message)}</textarea>
<label class="chk"><input type="checkbox" name="agree" value="1" required> I am authorised to represent ${esc(c.name)}.</label>
<button class="btn blue" type="submit" style="margin-top:16px">Submit claim</button></form>${back}`);
}

const thanksClaim = (origin: string, name: string) =>
  page(origin, 'Claim received', `<h1>Thanks, we have your claim</h1><p>We will check your details for <b>${esc(name)}</b> and email you within about two working days. Once it is approved, you will get a private link to update your profile.</p><p><a href="/">Back to FacList</a></p>`);

/* ---------- 2. request a quote ---------- */

const TIMELINES: Record<string, string> = { asap: 'As soon as possible', '1m': 'Within 1 month', '1-3m': '1 to 3 months', research: 'Just researching' };

export async function quotePage(ctx: Ctx, slug?: string): Promise<Response> {
  const { request, env, origin, url } = ctx;
  let company: CompanyRow | null = null;
  let catSlug = '', locSlug = '', catName = '', locName = '';
  if (slug) {
    company = await getCompany(env, slug);
    if (!company) return missing(origin);
  } else {
    catSlug = (url.searchParams.get('category') ?? '').toLowerCase();
    locSlug = (url.searchParams.get('loc') ?? '').toLowerCase();
    const okSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
    if (!okSlug(catSlug)) return missing(origin);
    const cat = await env.DB.prepare('SELECT name FROM categories WHERE slug = ?').bind(catSlug).first<{ name: string }>();
    if (!cat) return missing(origin);
    catName = cat.name;
    if (locSlug) {
      const loc = okSlug(locSlug) ? await env.DB.prepare('SELECT name FROM locations WHERE slug = ?').bind(locSlug).first<{ name: string }>() : null;
      if (loc) locName = loc.name; else locSlug = '';
    }
  }
  const target = company ? company.name : `${catName}${locName ? ' in ' + locName : ''} suppliers`;
  const action = company ? `/quote/${esc(company.slug)}` : `/quote?category=${encodeURIComponent(catSlug)}${locSlug ? `&loc=${encodeURIComponent(locSlug)}` : ''}`;

  let v: Record<string, string> = {};
  let errors: string[] = [];
  if (request.method === 'POST') {
    const form = await request.formData();
    const bot = botCheck(form);
    if (bot === 'honeypot') return thanksQuote(origin, target);
    v = { name: clean(form.get('name'), 100), email: clean(form.get('email'), 150).toLowerCase(), company: clean(form.get('company'), 120), phone: clean(form.get('phone'), 30), country: clean(form.get('country'), 60), message: cleanMulti(form.get('message'), 2000), quantity: clean(form.get('quantity'), 100), timeline: clean(form.get('timeline'), 10) };
    if (bot === 'fast') errors.push('Please wait a couple of seconds and press send again.');
    if (v.name.length < 2) errors.push('Please enter your name.');
    if (!EMAIL.test(v.email)) errors.push('Please enter a valid email address.');
    if (v.phone && !PHONE.test(v.phone)) errors.push('Please enter a valid phone number, or leave it empty.');
    if (v.message.length < 20) errors.push('Please describe what you need in at least a sentence or two (20 characters).');
    if (linkCount(v.message) > 2) errors.push('Please remove some links from your message.');
    if (v.timeline && !TIMELINES[v.timeline]) v.timeline = '';
    if (form.get('agree') !== '1') errors.push('Please agree to share your request.');
    if (!errors.length) {
      const h = await ipHash(request);
      if (await tooMany(env, 'leads', h)) return page(origin, 'Too many requests', '<h1>Too many requests</h1><p>Please try again in an hour.</p>', 429);
      await env.DB.prepare('INSERT INTO leads (company_id, category_slug, location_slug, buyer_name, buyer_email, buyer_company, buyer_phone, buyer_country, message, quantity, timeline, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(company?.id ?? null, catSlug || null, locSlug || null, v.name, v.email, v.company || null, v.phone || null, v.country || null, v.message, v.quantity || null, v.timeline || null, h).run();

      const details = `Buyer: ${v.name}${v.company ? `, ${v.company}` : ''}${v.country ? ` (${v.country})` : ''}\nEmail: ${v.email}${v.phone ? `\nPhone: ${v.phone}` : ''}${v.quantity ? `\nQuantity: ${v.quantity}` : ''}${v.timeline ? `\nTimeline: ${TIMELINES[v.timeline]}` : ''}\n\n${v.message}`;
      // who receives it: the supplier (if verified), or featured verified suppliers for a category request
      const recipients: string[] = [];
      if (company?.claimed_email) recipients.push(company.claimed_email);
      if (!company) {
        const f = await env.DB.prepare(`SELECT c.claimed_email AS e FROM featured f CROSS JOIN companies c ON c.id = f.company_id CROSS JOIN company_categories cc ON cc.company_id = c.id AND cc.category_id = (SELECT id FROM categories WHERE slug = ?)
          WHERE f.until > datetime('now') AND c.claimed_email IS NOT NULL${locSlug ? ' AND (c.state_slug = ? OR c.country_slug = ?)' : ''} LIMIT 3`)
          .bind(catSlug, ...(locSlug ? [locSlug, locSlug] : [])).all<{ e: string }>().catch(() => ({ results: [] as { e: string }[] }));
        for (const r of f.results) recipients.push(r.e);
      }
      let sent = 0;
      for (const to of recipients) if (await sendMail(env, to, `New quote request via FacList: ${target}`, `${details}\n\nYou can reply directly to ${v.email}.\n\n- FacList`)) sent++;
      if (sent) await env.DB.prepare("UPDATE leads SET status = 'forwarded' WHERE ip_hash = ? AND buyer_email = ? AND status = 'new'").bind(h, v.email).run();
      const unclaimed = company && !company.claimed_email ? `\n\nSupplier is NOT claimed. Contact them via their website: ${company.website ?? 'n/a'}` : '';
      await notify(env, `New quote request: ${target}`, `${details}${sent ? `\n\n(forwarded to ${sent} verified supplier${sent > 1 ? 's' : ''})` : ''}${unclaimed}\n\n${origin}/admin/leads`);
      return thanksQuote(origin, target);
    }
  }

  const sel = (n: string, val: string) => `<option value="${n}"${val === n ? ' selected' : ''}>${esc(TIMELINES[n])}</option>`;
  return page(origin, `Request a quote from ${target}`, `<h1>Request a quote</h1>
<p>Tell us what you need and we will pass your request to <b>${esc(target)}</b>.</p>
${errs(errors)}
<form method="post" class="form" action="${action}">${trap()}
<label for="message">What do you need? *</label><textarea id="message" name="message" rows="5" required minlength="20" maxlength="2000" placeholder="Part or product, material, size, drawings, certifications needed...">${esc(v.message)}</textarea>
<label for="quantity">Quantity</label><input id="quantity" name="quantity" maxlength="100" value="${esc(v.quantity)}" placeholder="e.g. 500 pieces, or 2 containers per month">
<label for="timeline">When do you need it?</label><select id="timeline" name="timeline"><option value="">Choose...</option>${Object.keys(TIMELINES).map((k) => sel(k, v.timeline)).join('')}</select>
<label for="name">Your name *</label><input id="name" name="name" required maxlength="100" value="${esc(v.name)}">
<label for="email">Email *</label><input id="email" type="email" name="email" required maxlength="150" value="${esc(v.email)}">
<label for="company">Your company</label><input id="company" name="company" maxlength="120" value="${esc(v.company)}">
<label for="phone">Phone or WhatsApp</label><input id="phone" name="phone" maxlength="30" value="${esc(v.phone)}">
<label for="country">Country</label><input id="country" name="country" maxlength="60" value="${esc(v.country)}">
<label class="chk"><input type="checkbox" name="agree" value="1" required> I agree that FacList may share this request, including my contact details, with the supplier(s) above.</label>
<button class="btn blue" type="submit" style="margin-top:16px">Send request</button></form>
${company ? `<p><a href="/supplier/${esc(company.slug)}">&larr; Back to ${esc(company.name)}</a></p>` : ''}`);
}

const thanksQuote = (origin: string, target: string) =>
  page(origin, 'Request sent', `<h1>Request sent</h1><p>Thanks. Your request for <b>${esc(target)}</b> has been received. Suppliers reply by email, usually within a few working days.</p><p><a href="/">Back to FacList</a></p>`);

/* ---------- 3. owner edits a claimed profile (private link) ---------- */

const TYPES = ['Manufacturer', 'Custom Manufacturer', 'Distributor', 'Service Company', 'Trading Company', 'Other'];
const BANDS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'];
const lines = (s: string | null) => (s ?? '').split(';').map((x) => x.trim()).filter(Boolean).join('\n');
const toList = (s: string) => [...new Set(s.split(/[\n;]/).map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 12).join(';') || null;

interface EditRow { id: number; slug: string; name: string; description: string | null; website: string | null; year_founded: number | null; company_type: string | null; employee_range: string | null; capabilities: string | null; industries: string | null; products: string | null; contact_email: string | null; contact_phone: string | null }

export async function managePage(ctx: Ctx, token: string): Promise<Response> {
  const { request, env, origin } = ctx;
  const hash = await sha256(token);
  const c = await env.DB.prepare('SELECT id, slug, name, description, website, year_founded, company_type, employee_range, capabilities, industries, products, contact_email, contact_phone FROM companies WHERE edit_token_hash = ? AND edit_token_hash IS NOT NULL AND claimed_status = 1').bind(hash).first<EditRow>();
  if (!c) return page(origin, 'Link not valid', '<h1>This link is not valid</h1><p>It may have been replaced by a newer one. Ask us for a new edit link.</p>', 404);

  let v: Record<string, string> = {
    description: c.description ?? '', website: c.website ?? '', year: c.year_founded ? String(c.year_founded) : '', type: c.company_type ?? '', band: c.employee_range ?? '',
    capabilities: lines(c.capabilities), industries: lines(c.industries), products: lines(c.products), cemail: c.contact_email ?? '', cphone: c.contact_phone ?? '',
  };
  let errors: string[] = [];
  let saved = false;
  if (request.method === 'POST') {
    const f = await request.formData();
    v = { description: cleanMulti(f.get('description'), 1500), website: clean(f.get('website'), 200), year: clean(f.get('year'), 4), type: clean(f.get('type'), 30), band: clean(f.get('band'), 12), capabilities: cleanMulti(f.get('capabilities'), 900), industries: cleanMulti(f.get('industries'), 900), products: cleanMulti(f.get('products'), 900), cemail: clean(f.get('cemail'), 150).toLowerCase(), cphone: clean(f.get('cphone'), 30) };
    let website: string | null = null;
    if (v.website) {
      try { const u = new URL(/^https?:\/\//i.test(v.website) ? v.website : 'https://' + v.website); if (!u.hostname.includes('.')) throw new Error(); website = u.origin; } catch { errors.push('The website address does not look right.'); }
    }
    const year = v.year ? Number(v.year) : null;
    if (v.year && !(Number.isInteger(year) && year! >= 1800 && year! <= new Date().getFullYear())) errors.push('Year founded must be a year such as 1998.');
    if (v.type && !TYPES.includes(v.type)) errors.push('Please choose a company type from the list.');
    if (v.band && !BANDS.includes(v.band)) errors.push('Please choose an employee range from the list.');
    if (v.cemail && !EMAIL.test(v.cemail)) errors.push('The contact email does not look right.');
    if (v.cphone && !PHONE.test(v.cphone)) errors.push('The contact phone does not look right.');
    if (linkCount(v.description) > 2) errors.push('Please remove some links from the description.');
    if (!errors.length) {
      const caps = toList(v.capabilities), inds = toList(v.industries), prods = toList(v.products);
      await env.DB.prepare('UPDATE companies SET description = ?, website = ?, year_founded = ?, company_type = ?, employee_range = ?, capabilities = ?, industries = ?, products = ?, contact_email = ?, contact_phone = ? WHERE id = ?')
        .bind(v.description || null, website, year, v.type || null, v.band || null, caps, inds, prods, v.cemail || null, v.cphone || null, c.id).run();
      await env.DB.prepare("UPDATE company_search SET description = ?, details = ? WHERE rowid = ?").bind(v.description, [caps, inds, prods].filter(Boolean).join(' ').replace(/;/g, ' '), c.id).run().catch(() => null);
      v = { ...v, website: website ?? '', capabilities: lines(caps), industries: lines(inds), products: lines(prods) };
      saved = true;
    }
  }

  const feat = await env.DB.prepare("SELECT until FROM featured WHERE company_id = ? AND until > datetime('now')").bind(c.id).first<{ until: string }>().catch(() => null);
  const upgrade = env.FEATURED_CHECKOUT_URL
    ? `<div class="prose"><h2>${esc(PLANS.featured.name)} listing</h2>${feat ? `<p>Your Featured listing is active until <b>${esc(feat.until.slice(0, 10))}</b>.</p>` : `<p>${esc(PLANS.featured.price)} ${esc(PLANS.featured.period)}. ${esc(PLANS.featured.note)}.</p><ul class="list2">${PLANS.featured.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p><a class="btn" href="${esc(env.FEATURED_CHECKOUT_URL + (env.FEATURED_CHECKOUT_URL.includes('?') ? '&' : '?') + 'ref=' + c.slug)}">Get a Featured listing</a></p><p class="meta">After you pay, we activate it within one working day.</p>`}</div>`
    : '';
  const opt = (list: string[], cur: string) => `<option value="">Choose...</option>${list.map((o) => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}`;
  return page(origin, `Edit ${c.name}`, `<h1>Edit ${esc(c.name)}</h1>
<p>This private page is only for you. Keep the link safe. Changes appear on your public profile within about an hour. <a href="/supplier/${esc(c.slug)}">View your profile</a></p>
${saved ? '<div class="ok">Saved. Thank you.</div>' : ''}${errs(errors)}
<form method="post" class="form" action="/manage/${esc(token)}">
<label for="description">About your company</label><textarea id="description" name="description" rows="5" maxlength="1500">${esc(v.description)}</textarea>
<label for="website">Website</label><input id="website" name="website" maxlength="200" value="${esc(v.website)}">
<label for="type">Company type</label><select id="type" name="type">${opt(TYPES, v.type)}</select>
<label for="year">Year founded</label><input id="year" name="year" inputmode="numeric" maxlength="4" value="${esc(v.year)}">
<label for="band">Number of employees</label><select id="band" name="band">${opt(BANDS, v.band)}</select>
<label for="capabilities">Capabilities (one per line)</label><textarea id="capabilities" name="capabilities" rows="4">${esc(v.capabilities)}</textarea>
<label for="industries">Industries you serve (one per line)</label><textarea id="industries" name="industries" rows="3">${esc(v.industries)}</textarea>
<label for="products">Products (one per line)</label><textarea id="products" name="products" rows="3">${esc(v.products)}</textarea>
<label for="cemail">Public contact email</label><input id="cemail" type="email" name="cemail" maxlength="150" value="${esc(v.cemail)}">
<label for="cphone">Public phone or WhatsApp</label><input id="cphone" name="cphone" maxlength="30" value="${esc(v.cphone)}">
<small>Contact details are hidden behind a "Show contact details" button to reduce spam and scraping.</small>
<button class="btn blue" type="submit" style="margin-top:16px">Save changes</button></form>${upgrade}`);
}

/* ---------- 4. pricing page for suppliers ---------- */

export function renderPricing(origin: string, env: Env): string {
  const p = PLANS.featured;
  const body = `<div class="pagehead"><div class="wrap"><nav class="crumbs"><a href="/">Home</a> &rsaquo; For suppliers</nav>
<h1>Get found by buyers</h1><p>Claim your free profile, keep your details up to date and receive quote requests from buyers.</p></div></div>
<div class="wrap" style="padding-top:28px"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
<div class="prose" style="margin:0"><h2>Free</h2><p style="font-size:1.6rem;margin:0 0 8px"><b>$0</b></p>
<ul class="list2"><li>Claim and verify your profile</li><li>Verified badge</li><li>Edit your description, capabilities, products and contact details</li><li>Receive quote requests by email</li></ul>
<p><a class="btn blue" href="/search">Find your company and claim it</a></p></div>
<div class="prose" style="margin:0;border-color:var(--blue)"><h2>${esc(p.name)}</h2><p style="font-size:1.6rem;margin:0 0 4px"><b>${esc(p.price)}</b> <span class="meta">${esc(p.period)}</span></p><p class="meta" style="margin-top:0">${esc(p.note)}</p>
<ul class="list2">${p.perks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="meta">Available to verified owners. After you claim your profile, you will see how to upgrade.</p></div></div>
<div class="prose"><h2>How it works</h2><ol class="list2"><li>Search for your company and press <b>Claim this profile</b>.</li><li>We check that you work there, usually within two working days.</li><li>You get a private link to edit your profile.</li></ol>
<p class="meta">FacList is growing. We do not promise a number of visitors or enquiries.</p></div></div>`;
  return layout({
    title: 'For suppliers: claim your profile | FacList',
    description: 'Claim your free FacList profile, update your company details and receive quote requests from buyers.',
    canonical: origin + '/pricing', origin, body,
    schema: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'For suppliers', url: origin + '/pricing' },
  });
}

export { randomToken };
