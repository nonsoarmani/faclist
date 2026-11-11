import type { CompanyCard, SupplierData, ListingData, Category, Certification, Location, HomeData, SectionData } from './db';
import { PAGE_SIZE } from './db';
import { synthListing, synthSupplier } from './synth';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/* ---------- design system ---------- */

const CSS = `
:root{--navy:#0b1f3a;--blue:#1d4ed8;--blue2:#e8efff;--amber:#f59e0b;--fg:#0f172a;--mut:#64748b;--line:#e2e8f0;--bg:#f8fafc}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--fg);background:var(--bg)}
a{color:var(--blue)}h1,h2,h3{line-height:1.25}
.wrap{max-width:1160px;margin:0 auto;padding:0 20px}
header.site{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.bar{display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{display:flex;gap:10px;align-items:center;font-weight:800;font-size:1.35rem;color:var(--navy);text-decoration:none;letter-spacing:-.02em}
nav.main a{margin-left:26px;color:var(--fg);text-decoration:none;font-weight:500;font-size:.95rem}
nav.main a:hover{color:var(--blue)}
.hero{background:linear-gradient(135deg,#0b1f3a 0%,#123a8f 60%,#1d4ed8 100%);color:#fff;padding:68px 0 56px}
.hero h1{font-size:clamp(2rem,4.5vw,3.1rem);margin:0 0 14px;letter-spacing:-.02em}
.hero p.lead{font-size:1.15rem;color:#c7d6f5;max-width:620px;margin:0}
.search{display:flex;gap:8px;background:#fff;padding:8px;border-radius:14px;max-width:660px;margin-top:28px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.search select{flex:1;min-width:0;border:0;font-size:1rem;padding:12px 10px;background:transparent;color:var(--fg);outline:none}
.btn{background:var(--amber);color:#1a1200;border:0;border-radius:10px;padding:12px 22px;font-weight:700;font-size:.95rem;cursor:pointer;text-decoration:none;display:inline-block;text-align:center}
.btn:hover{filter:brightness(1.05)}.btn.blue{background:var(--blue);color:#fff}
.btn.ghost{background:#fff;border:1px solid var(--line);color:var(--fg)}
.stats{display:flex;gap:40px;margin-top:34px;flex-wrap:wrap}.stats b{display:block;font-size:1.7rem}.stats span{color:#b6c7ee;font-size:.9rem}
section.block{padding:44px 0 8px}h2.sec{font-size:1.55rem;margin:0 0 20px;color:var(--navy);letter-spacing:-.01em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
.tile{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;text-decoration:none;color:var(--fg);transition:.15s}
.tile:hover{border-color:var(--blue);box-shadow:0 6px 18px rgba(29,78,216,.14);transform:translateY(-1px)}
.tile b{display:block;line-height:1.3}.tile small{color:var(--mut)}
.av{flex:none;width:46px;height:46px;border-radius:11px;display:grid;place-items:center;color:#fff;font-weight:700;font-size:1.05rem}
.av.lg{width:80px;height:80px;font-size:1.8rem;border-radius:16px}
.feat{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}
.feat div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:22px}.feat h3{margin:0 0 6px;color:var(--navy)}.feat p{margin:0;color:#475569}
.pagehead{background:#fff;border-bottom:1px solid var(--line);padding:22px 0 26px}
.pagehead h1{margin:8px 0 10px;color:var(--navy);font-size:clamp(1.6rem,3vw,2.2rem);letter-spacing:-.01em}
.pagehead p{margin:0;color:#475569;max-width:820px}
.crumbs{font-size:.85rem;color:var(--mut)}.crumbs a{color:var(--mut);text-decoration:none}.crumbs a:hover{color:var(--blue)}
.layout{display:grid;grid-template-columns:270px minmax(0,1fr);gap:28px;align-items:start;padding-top:28px}
.layout.profile{grid-template-columns:minmax(0,1fr) 300px}
aside .box{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:16px}
aside h3{margin:0 0 8px;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:var(--mut)}
aside ul{list-style:none;margin:0;padding:0}
aside li a{display:flex;justify-content:space-between;gap:8px;padding:6px 0;text-decoration:none;color:var(--fg);font-size:.94rem}
aside li a:hover{color:var(--blue)}aside li span{color:var(--mut)}
.resulthead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.resulthead h2{margin:0;font-size:1.15rem;color:var(--navy)}
.result{display:flex;gap:16px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:14px;transition:.15s}
.result:hover{border-color:var(--blue);box-shadow:0 6px 18px rgba(29,78,216,.1)}
.result h3{margin:0;font-size:1.1rem}.result h3 a{color:var(--navy);text-decoration:none}.result h3 a:hover{color:var(--blue)}
.result .body{flex:1;min-width:0}.result p{margin:6px 0 0;color:#334155;font-size:.94rem}
.result .cta{align-self:center;flex:none}
.loc{color:var(--mut);font-size:.9rem}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.tag{background:var(--blue2);color:var(--blue);border-radius:6px;padding:2px 9px;font-size:.78rem;font-weight:600}
.tag.grey{background:#f1f5f9;color:#475569}
.ver{background:#dcfce7;color:#166534;border-radius:99px;padding:1px 10px;font-size:.72rem;font-weight:700;margin-left:8px;vertical-align:middle;white-space:nowrap}
.prose{background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px 24px;margin:20px 0}
.prose h2{margin-top:0;font-size:1.2rem;color:var(--navy)}.prose h3{font-size:1rem;margin:16px 0 4px}.prose p{margin:0 0 10px;color:#334155}
.pager{display:flex;justify-content:space-between;align-items:center;margin:20px 0}
.fact{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:.92rem}
.fact:last-of-type{border-bottom:0}.fact span:first-child{color:var(--mut)}.fact span:last-child{text-align:right;font-weight:500}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0;list-style:none}
.chips a{display:inline-block;padding:6px 14px;border:1px solid var(--line);background:#fff;border-radius:99px;text-decoration:none;font-size:.9rem;color:var(--fg)}
.chips a:hover{border-color:var(--blue);color:var(--blue)}
.profilehead{display:flex;gap:20px;align-items:center}
footer.site{background:var(--navy);color:#b8c6e0;padding:34px 0;margin-top:56px;font-size:.9rem}
footer.site a{color:#fff;text-decoration:none}
form.hsearch{flex:1;max-width:400px;margin:0 20px}
form.hsearch input{width:100%;border:1px solid var(--line);border-radius:99px;padding:9px 16px;font-size:.92rem;background:var(--bg);color:var(--fg);outline:none}
form.hsearch input:focus{border-color:var(--blue);background:#fff}
.search input{flex:1;min-width:0;border:0;font-size:1rem;padding:12px 10px;background:transparent;color:var(--fg);outline:none}
.pop{margin-top:14px;font-size:.9rem;color:#b6c7ee}.pop a{color:#fff;margin-right:14px}
.na{color:#94a3b8;font-weight:400;font-style:normal}
.form label{display:block;margin:14px 0 4px;font-weight:600}.form label.chk{display:flex;gap:8px;align-items:flex-start;font-weight:400;margin-top:18px}
.form input:not([type=checkbox]),.form textarea,.form select{width:100%;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:#fff;color:var(--fg)}
.form small{display:block;color:var(--mut);margin-top:4px}.hp{position:absolute;left:-9999px;height:0;overflow:hidden}
.alert{background:#fee2e2;color:#991b1b;border-radius:10px;padding:10px 14px;margin:12px 0}.ok{background:#dcfce7;color:#166534;border-radius:10px;padding:10px 14px;margin:12px 0}
.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left;font-size:.9rem}.scroll{overflow-x:auto}
.feat-tag{background:#fef3c7;color:#92400e;border-radius:99px;padding:1px 10px;font-size:.72rem;font-weight:700;margin-left:8px;vertical-align:middle;white-space:nowrap}
.list2{margin:0;padding-left:20px;color:#334155}.list2 li{margin:2px 0}
.fbox,aside .box.fbox{padding:0}.fbox summary{cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:14px 18px;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:var(--mut);font-weight:700;list-style:none}
.fbox summary::-webkit-details-marker{display:none}.fbox summary::after{content:"+";font-size:1.2rem;line-height:1}.fbox[open] summary::after{content:"\\2212"}
.fbox ul{padding:0 18px 12px}
.fbox summary{min-height:48px}
img,svg{max-width:100%}.result h3,.pagehead h1,.fact span:last-child{overflow-wrap:anywhere}
@media(max-width:860px){
html,body{overflow-x:hidden}
.wrap{padding:0 16px}
header.site{position:static}
.bar{flex-wrap:wrap;height:auto;padding-top:12px;padding-bottom:12px;gap:10px}
form.hsearch{order:3;flex:1 1 100%;max-width:none;margin:0}
form.hsearch input{font-size:16px;padding:11px 16px}
.nav-hide{display:none}
.hero{padding:34px 0 30px}.hero p.lead{font-size:1rem}
.search{flex-direction:column;padding:10px;gap:6px;margin-top:20px}
.search input{padding:12px 8px;font-size:16px}.search .btn{width:100%;padding:14px}
.pop{line-height:2}.pop a{display:inline-block;margin-right:12px}
.stats{gap:24px;margin-top:24px}.stats b{font-size:1.35rem}
section.block{padding-top:30px}h2.sec{font-size:1.3rem}
.grid{grid-template-columns:1fr}
.layout,.layout.profile{grid-template-columns:minmax(0,1fr);gap:16px;padding-top:18px}
.layout.profile aside{order:-1}
aside .box{margin-bottom:10px}.fbox ul{max-height:240px;overflow:auto}.fbox summary{padding:12px 16px}.fbox ul{padding:0 16px 10px}
.pagehead{padding:16px 0 20px}.pagehead h1{font-size:1.45rem}
.crumbs{overflow-wrap:anywhere}
.resulthead{flex-direction:column;gap:2px}
.result{flex-wrap:wrap;padding:14px;gap:12px}.result .av{width:40px;height:40px;font-size:.95rem}
.result .cta{width:100%;padding:12px}.result .body{min-width:0}
.profilehead{gap:14px;align-items:flex-start}.profilehead h1{font-size:1.3rem!important}
.av.lg{width:56px;height:56px;font-size:1.3rem;border-radius:12px}
.prose{padding:16px;margin:14px 0}
.fact{font-size:.9rem}
.chips a{padding:7px 14px}
.pager{gap:8px}.pager .btn{padding:12px 16px}
.feat{grid-template-columns:1fr}
footer.site{margin-top:36px;text-align:center}
}`;

const LOGO = `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#1d4ed8"/><path d="M8 24V9h10v3.2h-6.4v3.2H17v3.1h-5.4V24z" fill="#fff"/><circle cx="23.5" cy="21.5" r="3" fill="#f59e0b"/></svg>`;

interface PageOpts {
  title: string;
  description: string;
  canonical: string;
  body: string;
  schema: unknown;
  noindex?: boolean;
  prev?: string;
  next?: string;
}

export function layout(o: PageOpts & { origin: string }): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(o.canonical)}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1d4ed8"/><path d="M8 24V9h10v3.2h-6.4v3.2H17v3.1h-5.4V24z" fill="#fff"/></svg>`)}">
${o.prev ? `<link rel="prev" href="${esc(o.prev)}">` : ''}${o.next ? `<link rel="next" href="${esc(o.next)}">` : ''}
<meta name="robots" content="${o.noindex ? 'noindex,follow' : 'index,follow,max-snippet:-1,max-image-preview:large'}">
<meta name="theme-color" content="#0b1f3a">
<meta property="og:site_name" content="FacList"><meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}">
<meta property="og:type" content="website"><meta property="og:url" content="${esc(o.canonical)}">
<style>${CSS}</style>
${jsonLd(o.schema)}
</head><body>
<header class="site"><div class="wrap bar">
<a class="logo" href="/">${LOGO}FacList</a>
<form class="hsearch" action="/search" method="get" role="search"><input type="search" name="q" maxlength="100" placeholder="Search e.g. CNC machining Lagos" aria-label="Search suppliers"></form>
<nav class="main nav-hide"><a href="/#categories">Categories</a><a href="/#countries">Countries</a><a href="/import-export">Import &amp; Export</a><a href="/pricing">For suppliers</a></nav>
</div></header>
${o.body}
<footer class="site"><div class="wrap"><a href="/"><b>FacList</b></a> &middot; Global manufacturing and supplier directory &middot; &copy; ${new Date().getFullYear()} &middot; <a href="/pricing">For suppliers</a><br>Some listing data &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap contributors</a></div></footer>
</body></html>`;
}

/* ---------- helpers ---------- */

const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'F';

const hue = (s: string) => [...s].reduce((a, c) => (a + c.charCodeAt(0) * 7) % 360, 0);
const avatar = (name: string, lg = false) =>
  `<div class="av${lg ? ' lg' : ''}" style="background:hsl(${hue(name)} 55% 42%)" aria-hidden="true">${esc(initials(name))}</div>`;

export const fmtRange = (s: string) => s.replace(/\d+/g, (m) => Number(m).toLocaleString('en-US'));

const TIER: Record<string, string> = { micro: 'Micro business', small: 'Small business', mid: 'Mid-size', large: 'Large manufacturer', enterprise: 'Enterprise' };

const uniq = (a: (string | null | undefined)[]) => [...new Set(a.filter(Boolean) as string[])];

const crumbsHtml = (items: { name: string; url: string }[]) =>
  `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((i, idx) => (idx === items.length - 1 ? esc(i.name) : `<a href="${esc(i.url)}">${esc(i.name)}</a>`))
    .join(' &rsaquo; ')}</nav>`;

const crumbsLd = (origin: string, items: { name: string; url: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((i, idx) => ({ '@type': 'ListItem', position: idx + 1, name: i.name, item: origin + i.url })),
});

const resultCard = (c: CompanyCard, featured = false) => {
  const where = uniq([c.city, c.state ?? c.country]).join(', ');
  const full = c.description ?? '';
  return `<article class="result">${avatar(c.name)}<div class="body">
<h3><a href="/supplier/${esc(c.slug)}">${esc(c.name)}</a>${c.claimed_status ? '<span class="ver">&#10003; Verified</span>' : ''}${featured ? '<span class="feat-tag">Featured</span>' : ''}</h3>
<div class="loc">&#128205; ${esc(where)}</div>
${full ? `<p>${esc(full.slice(0, 190))}${full.length > 190 ? '&hellip;' : ''}</p>` : ''}
<div class="tags">${c.company_type ? `<span class="tag">${esc(c.company_type)}</span>` : ''}${c.year_founded ? `<span class="tag grey">Est. ${c.year_founded}</span>` : ''}${c.revenue_tier ? `<span class="tag grey">${esc(TIER[c.revenue_tier] ?? c.revenue_tier)}</span>` : ''}${
    c.employee_range ? `<span class="tag grey">${esc(fmtRange(c.employee_range))} employees</span>` : c.employee_count ? `<span class="tag grey">${c.employee_count} employees</span>` : ''
  }</div></div><a class="btn blue cta" href="/supplier/${esc(c.slug)}">View profile</a></article>`;
};

/* ---------- home ---------- */

const tile = (c: { slug: string; name: string; n: number }, unit = 'suppliers') =>
  `<a class="tile" href="/directory/${esc(c.slug)}">${avatar(c.name)}<span><b>${esc(c.name)}</b><small>${c.n.toLocaleString('en-US')} ${unit}</small></span></a>`;

export function renderHome(origin: string, d: HomeData): string {
  const t = d.trade;
  const body = `<section class="hero"><div class="wrap">
<h1>Find trusted manufacturers and suppliers worldwide</h1>
<p class="lead">Compare verified factories by capability, country and certification, then go straight to the supplier that fits.</p>
<form class="search" action="/search" method="get" role="search"><input type="search" name="q" maxlength="100" placeholder="e.g. sheet metal Lagos" aria-label="Search suppliers"><button class="btn" type="submit">Search</button></form>
<div class="pop">Popular: ${d.categories.slice(0, 4).map((c) => `<a href="/directory/${esc(c.slug)}">${esc(c.name)}</a>`).join('')}</div>
<div class="stats"><div><b>${d.total.toLocaleString('en-US')}</b><span>Suppliers listed</span></div>${
    t.total ? `<div><b>${t.total.toLocaleString('en-US')}</b><span>Import &amp; export companies</span></div>` : ''
  }<div><b>${d.categories.length}</b><span>Categories</span></div><div><b>${d.countries.length}</b><span>Countries</span></div></div>
</div></section>
<div class="wrap">
<section class="block" id="categories"><h2 class="sec">Browse manufacturing by category</h2><div class="grid">${d.categories.map((c) => tile(c)).join('')}</div></section>
<section class="block" id="countries"><h2 class="sec">Browse by country</h2><ul class="chips">${d.countries
    .filter((c) => c.cat_slug)
    .map((c) => `<li><a href="/directory/${esc(c.cat_slug)}/${esc(c.slug)}">${esc(c.name)} (${c.n.toLocaleString('en-US')})</a></li>`)
    .join('')}</ul></section>
${
  t.total
    ? `<section class="block" id="trade"><h2 class="sec">Import &amp; export directory</h2>
<p style="margin:-8px 0 18px;color:#475569;max-width:720px">Looking for exporters, importers, trading companies or freight and logistics partners? Browse ${t.total.toLocaleString('en-US')} companies by category and country.</p>
<div class="grid">${t.categories.filter((c) => c.n > 0).map((c) => tile(c, 'companies')).join('')}</div>
<p style="margin-top:16px"><a class="btn blue" href="/import-export">Browse Import &amp; Export &rarr;</a></p></section>`
    : ''
}
<section class="block" id="why"><h2 class="sec">Why buyers use FacList</h2><div class="feat">
<div><h3>Compare in minutes</h3><p>Every supplier has the same clear profile: location, size, capabilities and credentials.</p></div>
<div><h3>Filter by certification</h3><p>Jump straight to suppliers holding ISO 9001, AS9100, IATF 16949 and more.</p></div>
<div><h3>Verified profiles</h3><p>Look for the green Verified badge, which marks companies that have confirmed their own listing.</p></div>
</div></section></div>`;
  return layout({
    title: 'FacList - Global Manufacturing & Supplier Directory',
    description: 'Search manufacturers and suppliers by capability, country and certification such as ISO 9001 and AS9100.',
    canonical: origin + '/',
    origin,
    body,
    schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'FacList', url: origin + '/' },
  });
}

/* ---------- Import & Export section landing page ---------- */

export function renderSection(origin: string, d: SectionData): string {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Import & Export', url: '/import-export' }];
  const body = `<div class="pagehead"><div class="wrap">${crumbsHtml(crumbs)}
<h1>Import &amp; Export Companies Directory</h1>
<p>Find importers, exporters, trading companies and freight and logistics providers. ${d.total.toLocaleString('en-US')} companies are listed, each with its location, size and website.</p></div></div>
<div class="wrap">
<section class="block"><h2 class="sec">Browse by category</h2><div class="grid">${d.categories.filter((c) => c.n > 0).map((c) => tile(c, 'companies')).join('')}</div></section>
<section class="block"><h2 class="sec">Browse by country</h2><ul class="chips">${d.countries
    .filter((c) => c.cat_slug)
    .map((c) => `<li><a href="/directory/${esc(c.cat_slug)}/${esc(c.slug)}">${esc(c.name)} (${c.n.toLocaleString('en-US')})</a></li>`)
    .join('')}</ul></section></div>`;
  return layout({
    title: 'Import & Export Companies Directory | FacList',
    description: `Directory of ${d.total.toLocaleString('en-US')} importers, exporters, trading companies and freight and logistics providers, by country.`,
    canonical: origin + '/import-export',
    origin,
    body,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'CollectionPage', name: 'Import & Export Companies Directory', url: origin + '/import-export', isPartOf: { '@type': 'WebSite', name: 'FacList', url: origin + '/' } },
        crumbsLd(origin, crumbs),
      ],
    },
  });
}

/* ---------- listing ---------- */

export interface ListingInput {
  origin: string;
  category: Category;
  location?: Location;
  cert?: Certification;
  data: ListingData;
  page: number;
}

export function renderListing(i: ListingInput): string {
  const { origin, category, location, cert, data, page } = i;
  const basePath = `/directory/${category.slug}${location ? `/${location.slug}` : ''}${cert ? `/${cert.slug}` : ''}`;
  const pageUrl = (p: number) => origin + basePath + (p > 1 ? `?page=${p}` : '');
  const pages = Math.ceil(data.total / PAGE_SIZE);

  const copy = synthListing({
    path: basePath,
    category,
    location: location ? { name: location.name, type: location.type } : undefined,
    cert,
    count: data.total,
    avgEmployees: data.avgEmployees,
    claimed: data.claimed,
    topCities: data.topCities,
    otherCerts: data.certFacets.filter((c) => c.slug !== cert?.slug).map((c) => c.code),
  });

  const trade = category.section === 'trade';
  const unit = trade ? ['company', 'companies'] : ['supplier', 'suppliers'];
  const crumbs = [
    { name: 'Home', url: '/' },
    ...(trade ? [{ name: 'Import & Export', url: '/import-export' }] : []),
    { name: category.name, url: `/directory/${category.slug}` },
    ...(location ? [{ name: location.name, url: `/directory/${category.slug}/${location.slug}` }] : []),
    ...(cert ? [{ name: cert.code, url: basePath }] : []),
  ];

  const locBox = data.locationFacets.length
    ? `<div class="box"><h3>${location ? 'Regions' : 'Countries'}</h3><ul>${data.locationFacets
        .map((f) => `<li><a href="/directory/${esc(category.slug)}/${esc(f.slug)}"><b style="font-weight:500">${esc(f.name)}</b><span>${f.n}</span></a></li>`)
        .join('')}</ul></div>`
    : '';
  const certItems = location ? data.certFacets.filter((f) => f.slug !== cert?.slug) : [];
  const certBox = certItems.length
    ? `<div class="box"><h3>Certifications</h3><ul>${certItems
        .map(
          (f) =>
            `<li><a href="/directory/${esc(category.slug)}/${esc(location!.slug)}/${esc(f.slug)}"><b style="font-weight:500">${esc(f.code)}</b><span>${f.n}</span></a></li>`
        )
        .join('')}</ul></div>`
    : '';
  const upBox =
    location || cert
      ? `<div class="box"><h3>Widen your search</h3><ul>${
          cert
            ? `<li><a href="/directory/${esc(category.slug)}/${esc(location!.slug)}">Remove ${esc(cert.code)} filter</a></li>`
            : ''
        }${
          location
            ? `<li><a href="/directory/${esc(category.slug)}">All ${esc(category.name)}</a></li>`
            : ''
        }</ul></div>`
      : '';

  const fb = (h: string) => h.replace('<div class="box"><h3>', '<details class="box fbox" open><summary>').replace('</h3>', '</summary>').replace(/<\/div>$/, '</details>');
  const body = `<div class="pagehead"><div class="wrap">${crumbsHtml(crumbs)}
<h1>${esc(copy.h1)}</h1><p>${esc(copy.paragraphs[0])}</p></div></div>
<div class="wrap layout">
<aside><div class="box"><h3>Need a quote?</h3><p style="margin:0 0 10px;font-size:.92rem">Tell us what you need and we will pass it to suppliers.</p><a class="btn" style="display:block" rel="nofollow" href="/quote?category=${esc(category.slug)}${location ? `&amp;loc=${esc(location.slug)}` : ''}">Request quotes</a></div>${fb(upBox)}${fb(locBox)}${fb(certBox)}</aside>
<script>if(innerWidth<860)document.querySelectorAll('details.fbox').forEach(function(d){d.open=false})</script>
<div>
<div class="resulthead"><h2>${data.total.toLocaleString('en-US')} ${data.total === 1 ? unit[0] : unit[1]} found</h2><span class="loc">${pages > 1 ? `Page ${page} of ${pages}` : ''}</span></div>
${page === 1 && data.featured?.length ? `<h2 class="sec" style="font-size:1rem;margin:0 0 10px;color:var(--mut)">Featured ${trade ? 'companies' : 'suppliers'}</h2>${data.featured.map((x) => resultCard(x, true)).join('')}<h2 class="sec" style="font-size:1rem;margin:18px 0 10px;color:var(--mut)">All ${trade ? 'companies' : 'suppliers'}</h2>` : ''}${data.companies.filter((x) => !(page === 1 && data.featured?.some((f) => f.id === x.id))).map((x) => resultCard(x)).join('')}
${
  pages > 1
    ? `<nav class="pager" aria-label="Pagination">${
        page > 1 ? `<a class="btn ghost" rel="prev" href="${esc(basePath)}${page > 2 ? `?page=${page - 1}` : ''}">&larr; Previous</a>` : '<span></span>'
      }<span class="loc">Page ${page} of ${pages}</span>${
        page < pages ? `<a class="btn blue" rel="next" href="${esc(basePath)}?page=${page + 1}">Next &rarr;</a>` : '<span></span>'
      }</nav>`
    : ''
}
<div class="prose"><h2>About this list</h2>${copy.paragraphs.slice(1).map((p) => `<p>${esc(p)}</p>`).join('')}
<h2 style="margin-top:22px">Frequently asked questions</h2>${copy.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</div>
</div></div>`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': pageUrl(page) + '#page',
        url: pageUrl(page),
        name: copy.h1,
        description: copy.metaDescription,
        isPartOf: { '@type': 'WebSite', name: 'FacList', url: origin + '/' },
        mainEntity: { '@id': pageUrl(page) + '#list' },
      },
      {
        '@type': 'ItemList',
        '@id': pageUrl(page) + '#list',
        numberOfItems: data.total,
        itemListElement: data.companies.map((c, idx) => ({
          '@type': 'ListItem',
          position: (page - 1) * PAGE_SIZE + idx + 1,
          url: `${origin}/supplier/${c.slug}`,
          name: c.name,
        })),
      },
      crumbsLd(origin, crumbs),
      {
        '@type': 'FAQPage',
        mainEntity: copy.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return layout({
    title: page > 1 ? `${copy.title} - Page ${page}` : copy.title,
    description: copy.metaDescription,
    canonical: pageUrl(page),
    origin,
    body,
    schema,
    prev: page > 1 ? pageUrl(page - 1) : undefined,
    next: page < pages ? pageUrl(page + 1) : undefined,
  });
}

/* ---------- search ---------- */

export function renderSearch(
  origin: string,
  q: string,
  results: { total: number; companies: CompanyCard[] } | null,
  page: number,
  cats: { slug: string; name: string; n: number }[]
): string {
  const pages = results ? Math.ceil(results.total / PAGE_SIZE) : 0;
  const link = (p: number) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ''}`;
  const body = `<div class="pagehead"><div class="wrap">${crumbsHtml([{ name: 'Home', url: '/' }, { name: 'Search', url: '/search' }])}
<h1>${q ? `Results for &ldquo;${esc(q)}&rdquo;` : 'Search suppliers'}</h1>
<form action="/search" method="get" role="search" style="margin-top:12px;display:flex;gap:8px;max-width:640px"><input type="search" name="q" value="${esc(q)}" maxlength="100" placeholder="e.g. CNC machining" aria-label="Search suppliers" style="flex:1;min-width:0;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:16px"><button class="btn blue" type="submit">Search</button></form></div></div>
<div class="wrap" style="padding-top:28px">
${
  results && results.total > 0
    ? `<div class="resulthead"><h2>${results.total.toLocaleString('en-US')} ${results.total === 1 ? 'supplier' : 'suppliers'} found</h2><span class="loc">${pages > 1 ? `Page ${page} of ${pages}` : ''}</span></div>
${results.companies.map((x) => resultCard(x)).join('')}
${
  pages > 1
    ? `<nav class="pager" aria-label="Pagination">${page > 1 ? `<a class="btn ghost" rel="prev" href="${esc(link(page - 1))}">&larr; Previous</a>` : '<span></span>'}<span class="loc">Page ${page} of ${pages}</span>${page < pages ? `<a class="btn blue" rel="next" href="${esc(link(page + 1))}">Next &rarr;</a>` : '<span></span>'}</nav>`
    : ''
}`
    : `<div class="prose" style="margin-top:0"><h2>${q ? 'No suppliers matched that search' : 'What are you looking for?'}</h2><p>${q ? 'Try fewer or simpler words, or browse a category:' : 'Type a product, process or place above, or browse a category:'}</p><ul class="chips">${cats.map((c) => `<li><a href="/directory/${esc(c.slug)}">${esc(c.name)} (${c.n})</a></li>`).join('')}</ul></div>`
}
</div>`;
  return layout({
    title: q ? `${q} - Supplier search | FacList` : 'Search suppliers | FacList',
    description: 'Search manufacturers and suppliers on FacList.',
    canonical: origin + '/search',
    origin,
    body,
    noindex: true,
    schema: { '@context': 'https://schema.org', '@type': 'SearchResultsPage', name: 'Supplier search', url: origin + '/search' },
  });
}

/* ---------- supplier ---------- */

const items = (s: string | null) => (s ?? '').split(';').map((x) => x.trim()).filter(Boolean);
const empRange = (n: number | null) =>
  n == null ? null : n <= 10 ? '1-10' : n <= 50 ? '11-50' : n <= 200 ? '51-200' : n <= 500 ? '201-500' : n <= 1000 ? '501-1,000' : '1,000+';

export function renderSupplier(origin: string, d: SupplierData): string {
  const { company: c, categories, certs, related } = d;
  const path = `/supplier/${c.slug}`;
  const url = origin + path;
  const nowYear = new Date().getFullYear();
  const year = c.year_founded && c.year_founded <= nowYear ? c.year_founded : null;
  const caps = items(c.capabilities);
  const inds = items(c.industries);
  const prods = items(c.products);

  const copy = synthSupplier({
    path,
    company: c,
    categories: categories.map((x) => x.name),
    certs,
    nearby: related,
    yearFounded: year,
    companyType: c.company_type,
    capabilities: caps,
    industries: inds,
    section: categories[0]?.section,
  });

  const primary = categories[0];
  const trade = primary?.section === 'trade';
  const crumbs = [
    { name: 'Home', url: '/' },
    ...(trade ? [{ name: 'Import & Export', url: '/import-export' }] : []),
    ...(primary ? [{ name: primary.name, url: `/directory/${primary.slug}` }] : []),
    { name: c.name, url: path },
  ];
  const locSlug = c.state_slug ?? c.country_slug;
  const na = '<em class="na">Not provided</em>';
  const fact = (k: string, v: string | null | undefined) => `<div class="fact"><span>${esc(k)}</span><span>${v ? v : na}</span></div>`;
  const yrs = year ? nowYear - year : null;
  const sales = c.sales_range ?? (c.revenue_tier ? (TIER[c.revenue_tier] ?? null) : null);

  const body = `<div class="pagehead"><div class="wrap">${crumbsHtml(crumbs)}
<div class="profilehead" style="margin-top:12px">${avatar(c.name, true)}<div>
<h1 style="margin:0">${esc(c.name)}${c.claimed_status ? '<span class="ver">&#10003; Verified</span>' : ''}</h1>
<div class="loc" style="margin-top:4px">&#128205; ${esc(copy.where)}</div>
<div class="tags">${d.featured ? '<span class="feat-tag" style="margin:0">Featured</span>' : ''}${c.company_type ? `<span class="tag grey">${esc(c.company_type)}</span>` : ''}${year ? `<span class="tag grey">Est. ${year}</span>` : ''}${certs.map((x) => `<span class="tag">${esc(x.code)}</span>`).join('')}</div></div></div></div></div>
<div class="wrap layout profile">
<div>
<div class="prose" style="margin-top:0"><h2>About ${esc(c.name)}</h2>${c.description ? `<p>${esc(c.description)}</p>` : ''}${copy.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
<div class="prose"><h2>${trade ? 'Categories' : 'Capabilities'}</h2>${
    caps.length ? `<ul class="list2">${caps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><br>` : ''
  }<ul class="chips">${categories.map((x) => `<li><a href="/directory/${esc(x.slug)}">${esc(x.name)}</a></li>`).join('')}${categories
    .map((x) => `<li><a href="/directory/${esc(x.slug)}/${esc(locSlug)}">${esc(x.name)} in ${esc(c.state ?? c.country)}</a></li>`)
    .join('')}</ul></div>
${inds.length ? `<div class="prose"><h2>Industries served</h2><ul class="chips">${inds.map((x) => `<li><span class="tag" style="font-size:.9rem;padding:4px 12px">${esc(x)}</span></li>`).join('')}</ul></div>` : ''}
${prods.length ? `<div class="prose"><h2>Products</h2><ul class="list2">${prods.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
${
  certs.length
    ? `<div class="prose"><h2>Certifications</h2><ul class="chips">${certs
        .map((x) =>
          primary
            ? `<li><a href="/directory/${esc(primary.slug)}/${esc(locSlug)}/${esc(x.slug)}">${esc(x.name)}</a></li>`
            : `<li><span>${esc(x.name)}</span></li>`
        )
        .join('')}</ul></div>`
    : ''
}
${related.length ? `<h2 class="sec" style="margin-top:28px">${trade ? 'Similar companies nearby' : 'Similar suppliers nearby'}</h2>${related.map((x) => resultCard(x)).join('')}` : ''}
</div>
<aside><div class="box"><a class="btn" style="display:block" rel="nofollow" href="/quote/${esc(c.slug)}">Request a quote</a></div>
<div class="box"><h3>Company facts</h3>
${fact('Location', esc(uniq([c.city, c.state, c.country]).join(', ')))}
${fact('Address', c.address ? esc(c.address) : null)}
${fact('Company type', c.company_type ? esc(c.company_type) : null)}
${fact('Year founded', year ? `${year}${yrs ? ` (${yrs} ${yrs === 1 ? 'year' : 'years'} in business)` : ''}` : null)}
${fact('Employees', c.employee_range ? esc(fmtRange(c.employee_range)) : empRange(c.employee_count))}
${fact('Annual sales', sales ? esc(sales) : null)}
${fact('Profile', c.claimed_status ? 'Verified' : 'Unclaimed')}
${c.website ? `<p style="margin:14px 0 0"><a class="btn blue" style="display:block" href="${esc(c.website)}" rel="nofollow noopener" target="_blank">Visit website</a></p>` : ''}
</div>${c.contact_email || c.contact_phone ? `<div class="box"><h3>Contact</h3><button class="btn ghost" style="width:100%" data-e="${c.contact_email ? btoa(c.contact_email) : ''}" data-p="${c.contact_phone ? btoa(c.contact_phone) : ''}" onclick="var b=this,e=b.dataset.e,p=b.dataset.p,h='';if(e)h+='<a href=&quot;mailto:'+atob(e)+'&quot;>'+atob(e)+'</a><br>';if(p)h+='<a href=&quot;tel:'+atob(p)+'&quot;>'+atob(p)+'</a>';b.outerHTML=h">Show contact details</button></div>` : ''}${c.claimed_status ? '' : `<div class="box"><h3>Is this your company?</h3><p style="margin:0 0 10px;font-size:.92rem">Claim this profile to verify it, update your details and receive quote requests.</p><a class="btn ghost" style="display:block" rel="nofollow" href="/claim/${esc(c.slug)}">Claim this profile</a></div>`}</aside></div>`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': url + '#page',
        url,
        name: copy.title,
        mainEntity: { '@id': url + '#org' },
        isPartOf: { '@type': 'WebSite', name: 'FacList', url: origin + '/' },
      },
      {
        '@type': ['Organization', 'LocalBusiness'],
        '@id': url + '#org',
        name: c.name,
        description: c.description ?? undefined,
        url: c.website ?? url,
        foundingDate: year ? String(year) : undefined,
        knowsAbout: caps.length ? caps : undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: c.address ?? undefined,
          addressLocality: c.city ?? undefined,
          addressRegion: c.state ?? undefined,
          addressCountry: c.country_code,
        },
        geo: c.lat != null && c.lng != null ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } : undefined,
        numberOfEmployees: c.employee_range
          ? (() => { const m = c.employee_range!.match(/^(\d+)(?:-(\d+)|\+)?$/); return m ? { '@type': 'QuantitativeValue', minValue: Number(m[1]), maxValue: m[2] ? Number(m[2]) : undefined } : undefined; })()
          : c.employee_count ? { '@type': 'QuantitativeValue', value: c.employee_count } : undefined,
        makesOffer: categories.map((x) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: x.name } })),
        hasCredential: certs.map((x) => ({
          '@type': 'EducationalOccupationalCredential',
          name: x.name,
          credentialCategory: 'certification',
          recognizedBy: x.authority ? { '@type': 'Organization', name: x.authority } : undefined,
        })),
      },
      crumbsLd(origin, crumbs),
    ],
  };

  return layout({ title: copy.title, description: copy.metaDescription, canonical: url, origin, body, schema });
}
