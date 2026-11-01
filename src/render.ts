import type { CompanyCard, SupplierData, ListingData, Category, Certification, Location, HomeData } from './db';
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
.layout{display:grid;grid-template-columns:270px 1fr;gap:28px;align-items:start;padding-top:28px}
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
@media(max-width:860px){.layout{grid-template-columns:1fr}.nav-hide{display:none}.result{flex-wrap:wrap}.result .cta{width:100%}.hero{padding:44px 0 40px}.search{flex-direction:column}}`;

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
<nav class="main nav-hide"><a href="/#categories">Categories</a><a href="/#countries">Countries</a><a href="/#why">Why FacList</a></nav>
</div></header>
${o.body}
<footer class="site"><div class="wrap"><a href="/"><b>FacList</b></a> &middot; Global manufacturing and supplier directory &middot; &copy; ${new Date().getFullYear()}</div></footer>
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

const TIER: Record<string, string> = { micro: 'Micro business', small: 'Small business', mid: 'Mid-size', large: 'Large manufacturer', enterprise: 'Enterprise' };

const crumbsHtml = (items: { name: string; url: string }[]) =>
  `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((i, idx) => (idx === items.length - 1 ? esc(i.name) : `<a href="${esc(i.url)}">${esc(i.name)}</a>`))
    .join(' &rsaquo; ')}</nav>`;

const crumbsLd = (origin: string, items: { name: string; url: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((i, idx) => ({ '@type': 'ListItem', position: idx + 1, name: i.name, item: origin + i.url })),
});

const resultCard = (c: CompanyCard) => {
  const where = [c.city, c.state ?? c.country].filter(Boolean).join(', ');
  const full = c.description ?? '';
  return `<article class="result">${avatar(c.name)}<div class="body">
<h3><a href="/supplier/${esc(c.slug)}">${esc(c.name)}</a>${c.claimed_status ? '<span class="ver">&#10003; Verified</span>' : ''}</h3>
<div class="loc">&#128205; ${esc(where)}</div>
${full ? `<p>${esc(full.slice(0, 190))}${full.length > 190 ? '&hellip;' : ''}</p>` : ''}
<div class="tags">${c.revenue_tier ? `<span class="tag grey">${esc(TIER[c.revenue_tier] ?? c.revenue_tier)}</span>` : ''}${
    c.employee_count ? `<span class="tag grey">${c.employee_count} employees</span>` : ''
  }</div></div><a class="btn blue cta" href="/supplier/${esc(c.slug)}">View profile</a></article>`;
};

/* ---------- home ---------- */

export function renderHome(origin: string, d: HomeData): string {
  const body = `<section class="hero"><div class="wrap">
<h1>Find trusted manufacturers and suppliers worldwide</h1>
<p class="lead">Compare verified factories by capability, country and certification, then go straight to the supplier that fits.</p>
<form class="search" onsubmit="var v=this.c.value;if(v){location.href='/directory/'+v}return false">
<select name="c" aria-label="Choose a category"><option value="">What are you looking for?</option>${d.categories
    .map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`)
    .join('')}</select><button class="btn" type="submit">Find suppliers</button></form>
<div class="stats"><div><b>${d.total.toLocaleString('en-US')}</b><span>Suppliers listed</span></div><div><b>${d.categories.length}</b><span>Categories</span></div><div><b>${d.countries.length}</b><span>Countries</span></div></div>
</div></section>
<div class="wrap">
<section class="block" id="categories"><h2 class="sec">Browse by category</h2><div class="grid">${d.categories
    .map(
      (c) =>
        `<a class="tile" href="/directory/${esc(c.slug)}">${avatar(c.name)}<span><b>${esc(c.name)}</b><small>${c.n.toLocaleString('en-US')} suppliers</small></span></a>`
    )
    .join('')}</div></section>
<section class="block" id="countries"><h2 class="sec">Browse by country</h2><ul class="chips">${d.countries
    .filter((c) => c.cat_slug)
    .map((c) => `<li><a href="/directory/${esc(c.cat_slug)}/${esc(c.slug)}">${esc(c.name)} (${c.n.toLocaleString('en-US')})</a></li>`)
    .join('')}</ul></section>
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
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'FacList',
      url: origin + '/',
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

  const crumbs = [
    { name: 'Home', url: '/' },
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

  const body = `<div class="pagehead"><div class="wrap">${crumbsHtml(crumbs)}
<h1>${esc(copy.h1)}</h1><p>${esc(copy.paragraphs[0])}</p></div></div>
<div class="wrap layout">
<aside>${upBox}${locBox}${certBox}</aside>
<div>
<div class="resulthead"><h2>${data.total.toLocaleString('en-US')} ${data.total === 1 ? 'supplier' : 'suppliers'} found</h2><span class="loc">${pages > 1 ? `Page ${page} of ${pages}` : ''}</span></div>
${data.companies.map(resultCard).join('')}
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

/* ---------- supplier ---------- */

export function renderSupplier(origin: string, d: SupplierData): string {
  const { company: c, categories, certs, related } = d;
  const path = `/supplier/${c.slug}`;
  const url = origin + path;
  const copy = synthSupplier({ path, company: c, categories: categories.map((x) => x.name), certs, nearby: related });
  const primary = categories[0];
  const crumbs = [
    { name: 'Home', url: '/' },
    ...(primary ? [{ name: primary.name, url: `/directory/${primary.slug}` }] : []),
    { name: c.name, url: path },
  ];
  const locSlug = c.state_slug ?? c.country_slug;
  const fact = (k: string, v: string | null | undefined) => (v ? `<div class="fact"><span>${esc(k)}</span><span>${v}</span></div>` : '');

  const body = `<div class="pagehead"><div class="wrap">${crumbsHtml(crumbs)}
<div class="profilehead" style="margin-top:12px">${avatar(c.name, true)}<div>
<h1 style="margin:0">${esc(c.name)}${c.claimed_status ? '<span class="ver">&#10003; Verified</span>' : ''}</h1>
<div class="loc" style="margin-top:4px">&#128205; ${esc(copy.where)}</div>
<div class="tags">${certs.map((x) => `<span class="tag">${esc(x.code)}</span>`).join('')}</div></div></div></div></div>
<div class="wrap layout" style="grid-template-columns:1fr 300px">
<div>
<div class="prose" style="margin-top:0"><h2>About ${esc(c.name)}</h2>${c.description ? `<p>${esc(c.description)}</p>` : ''}${copy.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
<div class="prose"><h2>Capabilities</h2><ul class="chips">${categories
    .map((x) => `<li><a href="/directory/${esc(x.slug)}">${esc(x.name)}</a></li>`)
    .join('')}${categories
    .map((x) => `<li><a href="/directory/${esc(x.slug)}/${esc(locSlug)}">${esc(x.name)} in ${esc(c.state ?? c.country)}</a></li>`)
    .join('')}</ul></div>
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
${related.length ? `<h2 class="sec" style="margin-top:28px">Similar suppliers nearby</h2>${related.map(resultCard).join('')}` : ''}
</div>
<aside><div class="box"><h3>Company facts</h3>
${fact('Location', esc([c.city, c.state, c.country].filter(Boolean).join(', ')))}
${fact('Address', c.address ? esc(c.address) : null)}
${fact('Employees', c.employee_count ? String(c.employee_count) : null)}
${fact('Company size', c.revenue_tier ? esc(TIER[c.revenue_tier] ?? c.revenue_tier) : null)}
${fact('Profile', c.claimed_status ? 'Verified' : 'Unclaimed')}
${c.website ? `<p style="margin:14px 0 0"><a class="btn blue" style="display:block" href="${esc(c.website)}" rel="nofollow noopener" target="_blank">Visit website</a></p>` : ''}
</div></aside></div>`;

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
        address: {
          '@type': 'PostalAddress',
          streetAddress: c.address ?? undefined,
          addressLocality: c.city ?? undefined,
          addressRegion: c.state ?? undefined,
          addressCountry: c.country_code,
        },
        geo: c.lat != null && c.lng != null ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } : undefined,
        numberOfEmployees: c.employee_count ? { '@type': 'QuantitativeValue', value: c.employee_count } : undefined,
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
