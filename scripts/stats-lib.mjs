// Computes the pre-computed statistics from plain row lists (no database access in here, so it can be tested).
import { createHash } from 'node:crypto';

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // same ordering SQLite uses ("binary")
const hash = (o) => createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const tally = (items, keyFn) => { const m = new Map(); for (const x of items) { const k = keyFn(x); if (k !== null && k !== undefined && k !== '') m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const group = (arr, keyFn) => { const m = new Map(); for (const x of arr) { const k = keyFn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };

/**
 * links:      [{ cat, id, cs, ss, city, emp, cl }]     one row per company/category pair
 * certLinks:  [{ id, cert }]                           company id + certification id
 * certs:      [{ id, slug, code, name }]
 * categories: [{ id, slug, name, section }]
 * locNames:   { slug: name }
 * countryCounts: [{ slug, n, last }]
 */
export function computeStats({ links, certLinks, certs, categories, locNames, countryCounts }) {
  const certMeta = new Map(certs.map((c) => [c.id, c]));
  const catMeta = new Map(categories.map((c) => [c.id, c]));
  const certsOf = new Map();
  for (const x of certLinks) { if (!certsOf.has(x.id)) certsOf.set(x.id, []); certsOf.get(x.id).push(x.cert); }
  const nameOf = (slug) => locNames[slug] ?? slug;

  const listing = [];
  const certFacetsFor = (items) => {
    const t = new Map();
    for (const x of items) for (const cid of certsOf.get(x.id) ?? []) t.set(cid, (t.get(cid) ?? 0) + 1);
    return [...t].map(([cid, n]) => ({ ...certMeta.get(cid), n })).filter((c) => c.slug)
      .sort((a, b) => b.n - a.n || cmp(a.code, b.code)).slice(0, 8).map((c) => ({ slug: c.slug, code: c.code, name: c.name, n: c.n }));
  };

  const makeRow = (cat, loc, type, cs, certId, items, noCertItems, certFacets) => {
    const emps = items.filter((x) => x.emp !== null && x.emp !== undefined);
    const cities = [...tally(items, (x) => x.city)].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, 5).map(([c]) => c);
    let locFacets = [];
    if (type === 'all') locFacets = [...tally(items, (x) => x.cs)].map(([slug, n]) => ({ slug, name: nameOf(slug), n }));
    else if (type === 'country') locFacets = [...tally(items, (x) => x.ss)].map(([slug, n]) => ({ slug, name: nameOf(slug), n }));
    locFacets = locFacets.sort((a, b) => b.n - a.n || cmp(a.name, b.name)).slice(0, 30);
    const row = {
      key: `${cat}|${loc}|${certId}`, category_id: cat, loc_slug: loc, cert_id: certId, country_slug: cs,
      cat_slug: catMeta.get(cat)?.slug ?? '', cert_slug: certId ? certMeta.get(certId)?.slug ?? null : null,
      total: items.length, avg_emp: emps.length ? emps.reduce((t, x) => t + x.emp, 0) / emps.length : null,
      claimed: items.reduce((t, x) => t + (x.cl ? 1 : 0), 0),
      top_cities: JSON.stringify(cities), loc_facets: JSON.stringify(locFacets),
      cert_facets: JSON.stringify(loc ? certFacets : []),
    };
    row.hash = hash(row);
    return row;
  };

  for (const [cat, list] of group(links, (x) => x.cat)) {
    const groups = [{ loc: '', type: 'all', cs: '', items: list }];
    for (const [cs, items] of group(list, (x) => x.cs)) groups.push({ loc: cs, type: 'country', cs, items });
    for (const [ss, items] of group(list.filter((x) => x.ss), (x) => x.ss)) groups.push({ loc: ss, type: 'state', cs: items[0].cs, items });
    for (const g of groups) {
      const facets = g.loc ? certFacetsFor(g.items) : [];
      listing.push(makeRow(cat, g.loc, g.type, g.cs, 0, g.items, g.items, facets));
      if (!g.loc) continue;
      const byCert = new Map();
      for (const x of g.items) for (const cid of certsOf.get(x.id) ?? []) { if (!byCert.has(cid)) byCert.set(cid, []); byCert.get(cid).push(x); }
      for (const [cid, items] of byCert) if (certMeta.has(cid)) listing.push(makeRow(cat, g.loc, g.type, g.cs, cid, items, g.items, facets));
    }
  }

  // site-wide rows: homepage / Import & Export section / sitemap index
  const site = [];
  for (const section of ['manufacturing', 'trade']) {
    const cats = categories.filter((c) => c.section === section);
    const ids = new Set(cats.map((c) => c.id));
    const sl = links.filter((x) => ids.has(x.cat));
    const perCat = tally(sl, (x) => x.cat);
    const categoriesOut = cats.map((c) => ({ slug: c.slug, name: c.name, n: perCat.get(c.id) ?? 0 }))
      .sort((a, b) => b.n - a.n || cmp(a.name, b.name));
    const byCountry = new Map();
    for (const x of sl) { if (!byCountry.has(x.cs)) byCountry.set(x.cs, { companies: new Set(), cats: new Map() }); const g = byCountry.get(x.cs); g.companies.add(x.id); g.cats.set(x.cat, (g.cats.get(x.cat) ?? 0) + 1); }
    const countries = [...byCountry].map(([slug, g]) => {
      const top = [...g.cats].sort((a, b) => b[1] - a[1] || cmp(catMeta.get(a[0]).slug, catMeta.get(b[0]).slug))[0];
      return { slug, name: nameOf(slug), n: g.companies.size, cat_slug: top ? catMeta.get(top[0]).slug : null };
    }).sort((a, b) => b.n - a.n || cmp(a.name, b.name)).slice(0, 60);
    const value = JSON.stringify({ total: new Set(sl.map((x) => x.id)).size, categories: categoriesOut, countries });
    site.push({ key: `section:${section}`, value, hash: hash(value) });
  }
  const idx = JSON.stringify(countryCounts);
  site.push({ key: 'sitemap-index', value: idx, hash: hash(idx) });
  return { listing, site };
}
