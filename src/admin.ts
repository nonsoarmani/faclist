import { esc } from './render';
import { hmac, randomToken, safeEqual, sha256 } from './crypto';
import { sendMail } from './notify';
import { page, type Ctx } from './forms';

const COOKIE = 'fl_admin';
const WEEK = 7 * 24 * 3600 * 1000;

async function isAdmin(ctx: Ctx): Promise<boolean> {
  const pw = ctx.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(ctx.request.headers.get('cookie') ?? '');
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return safeEqual(sig, await hmac(pw, `admin|${exp}`));
}

const redirect = (to: string, extra: Record<string, string> = {}) => new Response(null, { status: 303, headers: { location: to, 'cache-control': 'no-store', ...extra } });

const nav = `<p style="display:flex;gap:16px;flex-wrap:wrap;font-weight:600"><a href="/admin">Overview</a><a href="/admin/claims">Claims</a><a href="/admin/leads">Quote requests</a><a href="/admin/featured">Featured</a>
<form method="post" action="/admin/logout" style="margin-left:auto"><button class="btn ghost" style="padding:6px 14px">Log out</button></form></p><hr style="border:0;border-top:1px solid var(--line)">`;
const shell = (ctx: Ctx, title: string, body: string, status = 200) => page(ctx.origin, `Admin: ${title}`, `<div style="max-width:none">${nav}<h1>${esc(title)}</h1>${body}</div>`, status);
const table = (head: string[], rows: string[][]) =>
  rows.length ? `<div class="scroll"><table class="tbl"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="meta">Nothing here yet.</p>';
const post = (action: string, label: string, cls = 'btn ghost') => `<form method="post" action="${action}" style="display:inline"><button class="${cls}" style="padding:6px 12px">${label}</button></form>`;
const CHECK: Record<string, string> = { match: '<span class="ver">email matches website</span>', 'free-email': '<span class="ver" style="background:#fef3c7;color:#92400e">free email address</span>', mismatch: '<span class="ver" style="background:#fee2e2;color:#991b1b">email does not match website</span>', 'no-website': '<span class="ver" style="background:#f1f5f9;color:#475569">company has no website</span>' };

export async function adminRouter(ctx: Ctx, parts: string[]): Promise<Response> {
  const { request, env, origin, url } = ctx;
  if (!env.ADMIN_PASSWORD) return page(origin, 'Admin closed', '<h1>Admin is not set up</h1><p>Set the secret <code>ADMIN_PASSWORD</code> in Cloudflare to open this area (see HOW-TO.md).</p>', 404);
  const isPost = request.method === 'POST';

  // same-site check for every change (together with the SameSite=Strict cookie)
  if (isPost) {
    const o = request.headers.get('origin');
    if (o && o !== url.origin) return page(origin, 'Blocked', '<h1>Request blocked</h1>', 403);
  }

  // ----- login / logout -----
  if (parts[0] === 'login' && isPost) {
    const f = await request.formData();
    const ok = safeEqual(await sha256(String(f.get('password') ?? '')), await sha256(env.ADMIN_PASSWORD));
    if (!ok) {
      await new Promise((r) => setTimeout(r, 800));
      return page(origin, 'Admin login', '<h1>Admin</h1><div class="alert">Wrong password.</div><form method="post" action="/admin/login" class="form"><label for="p">Password</label><input id="p" type="password" name="password" required autofocus><button class="btn blue" style="margin-top:12px">Log in</button></form>', 401);
    }
    const exp = String(Date.now() + WEEK);
    const sig = await hmac(env.ADMIN_PASSWORD, `admin|${exp}`);
    return redirect('/admin', { 'set-cookie': `${COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK / 1000}` });
  }
  if (parts[0] === 'logout' && isPost) return redirect('/admin', { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  if (!(await isAdmin(ctx))) {
    return page(origin, 'Admin login', '<h1>Admin</h1><form method="post" action="/admin/login" class="form"><label for="p">Password</label><input id="p" type="password" name="password" required autofocus><button class="btn blue" style="margin-top:12px">Log in</button></form>', 401);
  }

  const db = env.DB;
  const id = Number(parts[1]);

  // ----- actions -----
  if (isPost && parts[0] === 'claims' && Number.isInteger(id) && (parts[2] === 'approve' || parts[2] === 'reject')) {
    const claim = await db.prepare("SELECT id, company_id, name, email FROM claims WHERE id = ? AND status = 'pending'").bind(id).first<{ id: number; company_id: number; name: string; email: string }>();
    if (!claim) return redirect('/admin/claims');
    if (parts[2] === 'reject') {
      await db.prepare("UPDATE claims SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?").bind(id).run();
      return redirect('/admin/claims');
    }
    return giveLink(ctx, claim.company_id, claim.email, claim.name, id);
  }
  if (isPost && parts[0] === 'company' && Number.isInteger(id) && parts[2] === 'relink') {
    const c = await db.prepare('SELECT claimed_email FROM companies WHERE id = ? AND claimed_status = 1').bind(id).first<{ claimed_email: string | null }>();
    if (!c?.claimed_email) return redirect('/admin/claims');
    return giveLink(ctx, id, c.claimed_email, '', null);
  }
  if (isPost && parts[0] === 'leads' && Number.isInteger(id) && parts[2] === 'status') {
    const f = await request.formData();
    const s = String(f.get('status'));
    if (['new', 'forwarded', 'closed'].includes(s)) await db.prepare('UPDATE leads SET status = ? WHERE id = ?').bind(s, id).run();
    return redirect('/admin/leads');
  }
  if (isPost && parts[0] === 'featured' && parts[1] === 'add') {
    const f = await request.formData();
    const slug = String(f.get('slug') ?? '').trim().toLowerCase();
    const months = Math.min(24, Math.max(1, Number(f.get('months')) || 1));
    const c = await db.prepare('SELECT id, name FROM companies WHERE slug = ?').bind(slug).first<{ id: number; name: string }>();
    if (!c) return shell(ctx, 'Featured', `<div class="alert">No company with the address "${esc(slug)}".</div>${await featuredBody(ctx)}`, 404);
    const cur = await db.prepare('SELECT until FROM featured WHERE company_id = ?').bind(c.id).first<{ until: string }>();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const base = cur && cur.until > now ? cur.until : now;
    await db.prepare(`INSERT OR REPLACE INTO featured (company_id, until) VALUES (?, datetime(?, '+${months} months'))`).bind(c.id, base).run();
    return redirect('/admin/featured');
  }
  if (isPost && parts[0] === 'featured' && parts[1] === 'remove') {
    const f = await request.formData();
    await db.prepare('DELETE FROM featured WHERE company_id = ?').bind(Number(f.get('company_id'))).run();
    return redirect('/admin/featured');
  }

  // ----- pages -----
  if (parts[0] === 'claims') {
    const pending = await db.prepare("SELECT cl.id, cl.name, cl.title, cl.email, cl.phone, cl.message, cl.email_check, cl.created_at, c.name AS company, c.slug, c.website, c.country FROM claims cl JOIN companies c ON c.id = cl.company_id WHERE cl.status = 'pending' ORDER BY cl.created_at LIMIT 50").all<Record<string, string>>();
    const done = await db.prepare("SELECT cl.id, cl.name, cl.email, cl.reviewed_at, cl.company_id, c.name AS company, c.slug FROM claims cl JOIN companies c ON c.id = cl.company_id WHERE cl.status = 'approved' ORDER BY cl.reviewed_at DESC LIMIT 25").all<Record<string, string>>();
    return shell(ctx, 'Claims',
      `<h2>Waiting for review (${pending.results.length})</h2>${table(['When', 'Person', 'Company', 'Check', 'Message', ''], pending.results.map((r) => [esc(r.created_at.slice(0, 16)), `<b>${esc(r.name)}</b><br>${esc(r.title ?? '')}<br>${esc(r.email)}<br>${esc(r.phone ?? '')}`, `<a href="/supplier/${esc(r.slug)}">${esc(r.company)}</a><br>${r.website ? `<a href="${esc(r.website)}" rel="noopener nofollow">${esc(r.website)}</a>` : ''}`, CHECK[r.email_check] ?? '', esc(r.message ?? ''), post(`/admin/claims/${r.id}/approve`, 'Approve', 'btn blue') + ' ' + post(`/admin/claims/${r.id}/reject`, 'Reject')]))}
<h2>Recently approved</h2>${table(['Approved', 'Person', 'Company', ''], done.results.map((r) => [esc((r.reviewed_at ?? '').slice(0, 16)), esc(r.email), `<a href="/supplier/${esc(r.slug)}">${esc(r.company)}</a>`, post(`/admin/company/${r.company_id}/relink`, 'New edit link')]))}`);
  }
  if (parts[0] === 'leads') {
    const rows = await db.prepare("SELECT l.id, l.created_at, l.status, l.buyer_name, l.buyer_email, l.buyer_company, l.buyer_phone, l.buyer_country, l.message, l.quantity, l.timeline, l.category_slug, l.location_slug, c.name AS company, c.slug, c.website, c.claimed_email FROM leads l LEFT JOIN companies c ON c.id = l.company_id ORDER BY l.id DESC LIMIT 100").all<Record<string, string>>();
    return shell(ctx, 'Quote requests', table(['When', 'Buyer', 'For', 'Request', 'Status'], rows.results.map((r) => [esc(r.created_at.slice(0, 16)), `<b>${esc(r.buyer_name)}</b><br>${esc(r.buyer_company ?? '')} ${esc(r.buyer_country ?? '')}<br><a href="mailto:${esc(r.buyer_email)}">${esc(r.buyer_email)}</a><br>${esc(r.buyer_phone ?? '')}`,
      r.slug ? `<a href="/supplier/${esc(r.slug)}">${esc(r.company)}</a><br>${r.claimed_email ? 'verified supplier' : `<span class="meta">not claimed. Contact via ${r.website ? `<a href="${esc(r.website)}" rel="noopener nofollow">website</a>` : 'n/a'}</span>`}` : `category: ${esc(r.category_slug ?? '')} ${esc(r.location_slug ?? '')}`,
      `${esc(r.message)}${r.quantity ? `<br><span class="meta">Quantity: ${esc(r.quantity)}</span>` : ''}${r.timeline ? `<br><span class="meta">Timeline: ${esc(r.timeline)}</span>` : ''}`,
      `<form method="post" action="/admin/leads/${r.id}/status"><select name="status" onchange="this.form.submit()">${['new', 'forwarded', 'closed'].map((s) => `<option${s === r.status ? ' selected' : ''}>${s}</option>`).join('')}</select></form>`])));
  }
  if (parts[0] === 'featured') return shell(ctx, 'Featured', await featuredBody(ctx));

  const n = await db.prepare("SELECT (SELECT COUNT(*) FROM claims WHERE status = 'pending') AS p, (SELECT COUNT(*) FROM leads WHERE status = 'new') AS l, (SELECT COUNT(*) FROM claims WHERE status = 'approved') AS a, (SELECT COUNT(*) FROM featured WHERE until > datetime('now')) AS f").first<Record<string, number>>();
  return shell(ctx, 'Overview', `<div class="grid"><a class="tile" href="/admin/claims"><span><b>${n?.p ?? 0}</b><small>claims waiting</small></span></a><a class="tile" href="/admin/leads"><span><b>${n?.l ?? 0}</b><small>new quote requests</small></span></a><a class="tile" href="/admin/claims"><span><b>${n?.a ?? 0}</b><small>verified companies</small></span></a><a class="tile" href="/admin/featured"><span><b>${n?.f ?? 0}</b><small>active Featured listings</small></span></a></div>
<p class="meta" style="margin-top:20px">After approving claims, run <code>npm run stats</code> now and then so the "verified" counts on category pages catch up.</p>`);
}

async function featuredBody(ctx: Ctx): Promise<string> {
  const act = await ctx.env.DB.prepare("SELECT f.company_id, f.until, c.name, c.slug, c.claimed_email FROM featured f JOIN companies c ON c.id = f.company_id WHERE f.until > datetime('now') ORDER BY f.until").all<Record<string, string>>();
  return `<form method="post" action="/admin/featured/add" class="form" style="max-width:520px"><label for="s">Company address (the part after /supplier/)</label><input id="s" name="slug" required placeholder="e.g. buckeye-precision-machining">
<label for="m">Months to add</label><select id="m" name="months"><option>1</option><option>3</option><option>6</option><option>12</option></select><button class="btn blue" style="margin-top:12px">Activate Featured</button></form>
<h2>Active</h2>${table(['Company', 'Until', 'Verified owner', ''], act.results.map((r) => [`<a href="/supplier/${esc(r.slug)}">${esc(r.name)}</a>`, esc(r.until.slice(0, 10)), esc(r.claimed_email ?? 'not claimed'), `<form method="post" action="/admin/featured/remove" style="display:inline"><input type="hidden" name="company_id" value="${r.company_id}"><button class="btn ghost" style="padding:6px 12px">Remove</button></form>`]))}`;
}

/** Marks a company as verified (when claimId is given) and creates a new private edit link. The link is shown once and stored only as a hash. */
async function giveLink(ctx: Ctx, companyId: number, email: string, person: string, claimId: number | null): Promise<Response> {
  const { env, origin } = ctx;
  const token = randomToken();
  const hash = await sha256(token);
  const stmts = [env.DB.prepare('UPDATE companies SET claimed_status = 1, claimed_email = ?, edit_token_hash = ? WHERE id = ?').bind(email, hash, companyId)];
  if (claimId !== null) stmts.unshift(env.DB.prepare("UPDATE claims SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?").bind(claimId));
  await env.DB.batch(stmts);
  const co = await env.DB.prepare('SELECT name, slug FROM companies WHERE id = ?').bind(companyId).first<{ name: string; slug: string }>();
  const link = `${origin}/manage/${token}`;
  const mailed = await sendMail(env, email, `Your FacList profile for ${co?.name} is verified`,
    `Hello${person ? ' ' + person : ''},\n\nYour claim for ${co?.name} on FacList has been approved. Use this private link to update your profile:\n\n${link}\n\nKeep it safe: anyone with the link can edit your profile. If you lose it, reply to this email and we will send a new one.\n\n- FacList`);
  return shell(ctx, 'Approved', `<p>${esc(co?.name ?? '')} is now verified (it shows the green badge).</p>
<p>${mailed ? `We emailed this link to <b>${esc(email)}</b>.` : `Email is not set up, so send this link to <b>${esc(email)}</b> yourself (email or WhatsApp):`}</p>
<p><input readonly value="${esc(link)}" style="width:100%;padding:12px;font-size:.9rem" onclick="this.select()"></p>
<p class="meta">This link is shown only now. If you lose it, press "New edit link" next to the company under Claims.</p><p><a class="btn blue" href="/admin/claims">Back to claims</a></p>`);
}
