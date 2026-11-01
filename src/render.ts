import type { CompanyCard, SupplierData, ListingData, Category, Certification, Location } from './db';
import { PAGE_SIZE } from './db';
import { synthListing, synthSupplier } from './synth';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const CSS = `
:root{--fg:#14202b;--mut:#5b6b7a;--bg:#fff;--card:#f5f7fa;--line:#e2e8ee;--ac:#0b5fff}
@media(prefers-color-scheme:dark){:root{--fg:#e8eef4;--mut:#93a4b5;--bg:#0f161d;--card:#17212b;--line:#26333f;--ac:#6ea2ff}}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,sans-serif;color:var(--fg);background:var(--bg)}
a{color:var(--ac)}header,main,footer{max-width:960px;margin:0 auto;padding:16px}
header a.logo{font-weight:700;font-size:1.25rem;text-decoration:none;color:var(--fg)}
nav.crumbs{font-size:.875rem;color:var(--mut)}h1{line-height:1.25}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:12px 0}
.card h3{margin:0 0 4px}.meta{color:var(--mut);font-size:.875rem}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}
.chips a{display:inline-block;padding:4px 12px;border:1px solid var(--line);border-radius:99px;text-decoration:none;font-size:.9rem}
.badge{font-size:.75rem;border:1px solid var(--ac);color:var(--ac);border-radius:4px;padding:0 6px;margin-left:6px}
.pager{display:flex;gap:16px;justify-content:space-between}footer{color:var(--mut);font-size:.85rem}`;

interface PageOpts {
  title: string;
  description: string;
  canonical: string;
  origin: string;
  body: string;
  schema: unknown;
  noindex?: boolean;
  prev?: string;
  next?: string;
}

export function layout(o: PageOpts): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(o.canonical)}">
${o.prev ? `<link rel="prev" href="${esc(o.prev)}">` : ''}${o.next ? `<link rel="next" href="${esc(o.next)}">` : ''}
<meta name="robots" content="${o.noindex ? 'noindex,follow' : 'index,follow,max-snippet:-1,max-image-preview:large'}">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}">
<meta property="og:type" content="website"><meta property="og:url" content="${esc(o.canonical)}">
<style>${CSS}</style>
${jsonLd(o.schema)}
</head><body>
<header><a class="logo" href="/">FacList</a></header>
<main>${o.body}</main>
<footer>FacList &middot; Global manufacturing and supply chain directory</footer>
</body></html>`;
}

const crumbsHtml = (items: { name: string; url: string }[]) =>
  `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((i, idx) => (idx === items.length - 1 ? esc(i.name) : `<a href="${esc(i.url)}">${esc(i.name)}</a>`))
    .join(' &rsaquo; ')}</nav>`;

const crumbsLd = (origin: string, items: { name: string; url: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((i, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: i.name,
    item: origin + i.url,
  })),
});

const cardHtml = (c: CompanyCard) => {
  const where = [c.city, c.state ?? c.country].filter(Boolean).join(', ');
  const desc = (c.description ?? '').slice(0, 170);
  return `<article class="card"><h3><a href="/supplier/${esc(c.slug)}">${esc(c.name)}</a>${
    c.claimed_status ? '<span class="badge">Verified</span>' : ''
  }</h3><div class="meta">${esc(where)}${c.employee_count ? ` &middot; ~${c.employee_count} employees` : ''}</div>${
    desc ? `<p>${esc(desc)}${(c.description ?? '').length > 170 ? '&hellip;' : ''}</p>` : ''
  }</article>`;
};

/* ---------- home ---------- */

export function renderHome(origin: string, cats: { slug: string; name: string; n: number }[]): string {
  const body = `<h1>Find manufacturers and suppliers worldwide</h1>
<p>Browse verified suppliers by capability, region and certification.</p>
<ul class="chips">${cats.map((c) => `<li><a href="/directory/${esc(c.slug)}">${esc(c.name)} (${c.n})</a></li>`).join('')}</ul>`;
  return layout({
    title: 'FacList - Global Manufacturing & Supplier Directory',
    description: 'Search manufacturers and suppliers by capability, region and certification such as ISO 9001 and AS9100.',
    canonical: origin + '/',
    origin,
    body,
    schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'FacList', url: origin + '/' },
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

  const title = page > 1 ? `${copy.title} - Page ${page}` : copy.title;
  const locLinks = data.locationFacets
    .map((f) => `<li><a href="/directory/${esc(category.slug)}/${esc(f.slug)}">${esc(f.name)} (${f.n})</a></li>`)
    .join('');
  const certLinks = location
    ? data.certFacets
        .filter((f) => f.slug !== cert?.slug)
        .map(
          (f) =>
            `<li><a href="/directory/${esc(category.slug)}/${esc(location.slug)}/${esc(f.slug)}">${esc(f.code)} (${f.n})</a></li>`
        )
        .join('')
    : '';

  const body = `${crumbsHtml(crumbs)}
<h1>${esc(copy.h1)}</h1>
${copy.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
${locLinks ? `<h2>${location ? 'Cities and regions' : 'Browse by country'}</h2><ul class="chips">${locLinks}</ul>` : ''}
${certLinks ? `<h2>Filter by certification</h2><ul class="chips">${certLinks}</ul>` : ''}
<h2>${data.total} ${esc(category.name)} ${data.total === 1 ? 'supplier' : 'suppliers'}</h2>
${data.companies.map(cardHtml).join('')}
${
  pages > 1
    ? `<nav class="pager" aria-label="Pagination">${
        page > 1 ? `<a rel="prev" href="${esc(basePath)}${page > 2 ? `?page=${page - 1}` : ''}">&larr; Previous</a>` : '<span></span>'
      }<span>Page ${page} of ${pages}</span>${
        page < pages ? `<a rel="next" href="${esc(basePath)}?page=${page + 1}">Next &rarr;</a>` : '<span></span>'
      }</nav>`
    : ''
}
<h2>Frequently asked questions</h2>
${copy.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}`;

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
        mainEntity: copy.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return layout({
    title,
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
  const copy = synthSupplier({
    path,
    company: c,
    categories: categories.map((x) => x.name),
    certs,
    nearby: related,
  });

  const primary = categories[0];
  const crumbs = [
    { name: 'Home', url: '/' },
    ...(primary ? [{ name: primary.name, url: `/directory/${primary.slug}` }] : []),
    { name: c.name, url: path },
  ];
  const locSlug = c.state_slug ?? c.country_slug;

  const body = `${crumbsHtml(crumbs)}
<h1>${esc(c.name)}${c.claimed_status ? '<span class="badge">Verified</span>' : ''}</h1>
<p class="meta">${esc(copy.where)}</p>
${c.description ? `<p>${esc(c.description)}</p>` : ''}
${copy.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
<h2>Capabilities</h2>
<ul class="chips">${categories
    .map((x) => `<li><a href="/directory/${esc(x.slug)}">${esc(x.name)}</a></li>`)
    .join('')}${categories
    .map((x) => `<li><a href="/directory/${esc(x.slug)}/${esc(locSlug)}">${esc(x.name)} in ${esc(c.state ?? c.country)}</a></li>`)
    .join('')}</ul>
${
  certs.length
    ? `<h2>Certifications</h2><ul class="chips">${certs
        .map((x) =>
          primary
            ? `<li><a href="/directory/${esc(primary.slug)}/${esc(locSlug)}/${esc(x.slug)}">${esc(x.code)}</a></li>`
            : `<li>${esc(x.code)}</li>`
        )
        .join('')}</ul>`
    : ''
}
${c.website ? `<h2>Website</h2><p><a href="${esc(c.website)}" rel="nofollow noopener" target="_blank">${esc(c.website.replace(/^https?:\/\//, ''))}</a></p>` : ''}
${related.length ? `<h2>Similar suppliers nearby</h2>${related.map(cardHtml).join('')}` : ''}`;

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
        numberOfEmployees: c.employee_count
          ? { '@type': 'QuantitativeValue', value: c.employee_count }
          : undefined,
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
