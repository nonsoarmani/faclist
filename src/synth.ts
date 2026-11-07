import type { Category, Certification, CompanyCard } from './db';

/* ---------- deterministic randomness: same URL => same copy, different URL => different copy ---------- */

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(key: string) {
  const r = mulberry32(fnv1a(key));
  return {
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(r() * arr.length)];
    },
    shuffle<T>(arr: readonly T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

export type Vars = Record<string, string | number>;

export function fill(template: string, vars: Vars): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => (k in vars ? String(vars[k]) : ''))
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .trim();
}

export function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* ---------- listing pages ---------- */

export interface ListingCtx {
  path: string;
  category: Category;
  location?: { name: string; type: 'country' | 'state' };
  cert?: Certification;
  count: number;
  avgEmployees: number | null;
  claimed: number;
  topCities: string[];
  otherCerts: string[];
}

export interface ListingCopy {
  title: string;
  metaDescription: string;
  h1: string;
  paragraphs: string[];
  faq: { q: string; a: string }[];
}

const OPENINGS = [
  'FacList lists {{count}} {{category_lower}} {{noun}}{{place}}{{with_cert}}. Every profile shows location, company size and credentials so buyers can build a shortlist quickly.',
  'Looking for {{category_lower}} capacity{{place}}? This page covers {{count}} {{noun}}{{with_cert}} that you can compare side by side.',
  'Sourcing teams use this page to find {{category_lower}} suppliers{{place}}{{with_cert}}. Right now {{count}} {{noun}} are listed.',
  '{{count}} {{category_lower}} {{noun}}{{place}}{{with_cert}} are listed below, ordered by verified status and company size.',
];

const CLOSINGS = [
  'Open any profile to review capabilities and credentials, or narrow the list using the related links on this page.',
  'Use the profiles below to compare shops before you send out requests for quotation.',
  'Each listing links to a full supplier profile, and the related searches on this page help you refine by region and certification.',
  'Shortlist two or three suppliers from the list below, then check their profiles for certifications and company size before reaching out.',
];

const OPENINGS_TRADE = [
  '{{category}}{{place}}: FacList lists {{count}} {{noun}} with a website, location and company size so buyers can build a shortlist quickly.',
  'Looking for {{category_lower}}{{place}}? This page lists {{count}} {{noun}} you can compare side by side.',
  'Buyers and sourcing teams use this page to find {{category_lower}}{{place}}. {{count}} {{noun}} are listed right now.',
  '{{count}} {{noun}} under {{category}}{{place}} are listed below, ordered by verified status and company size.',
];

const CLOSINGS_TRADE = [
  'Open any profile to see where the company is based and how large it is, or narrow the list using the related links on this page.',
  'Use the profiles below to compare companies before you get in touch.',
  'Each listing links to a full company profile, and the related searches on this page help you refine by region.',
  'Shortlist two or three companies from the list below, then check their profiles and websites before reaching out.',
];

export function synthListing(c: ListingCtx): ListingCopy {
  const rng = makeRng(c.path);
  const trade = c.category.section === 'trade';
  const catLower = c.category.name.toLowerCase();
  const noun = trade ? plural(c.count, 'company', 'companies') : plural(c.count, 'manufacturer', 'manufacturers');
  const place = c.location ? ` in ${c.location.name}` : '';
  const certified = c.cert ? ` - ${c.cert.code} Certified` : '';
  const withCert = c.cert ? ` with ${c.cert.code} certification` : '';

  const vars: Vars = {
    category: c.category.name,
    category_lower: catLower,
    count: c.count,
    noun,
    place,
    certified,
    with_cert: withCert,
    location: c.location?.name ?? '',
    cert: c.cert?.code ?? '',
  };

  const title = fill(c.category.meta_title_template, vars);
  const metaDescription = fill(c.category.description_template, vars);
  const h1 = trade
    ? `${c.category.name}${place}`
    : `${c.category.name} Manufacturers${place}${c.cert ? ` with ${c.cert.code} Certification` : ''}`;

  // data-driven sentences, order shuffled per URL
  const facts: string[] = [];
  if (c.topCities.length) {
    facts.push(
      fill(
        rng.pick(
          trade
            ? ['The biggest clusters of companies are in {{cities}}.', 'Most listed companies operate from {{cities}}.']
            : ['Production is concentrated around {{cities}}.', 'The biggest clusters of suppliers are in {{cities}}.', 'Most listed shops operate out of {{cities}}.']
        ),
        { cities: list(c.topCities.slice(0, 3)) }
      )
    );
  }
  if (c.avgEmployees) {
    facts.push(
      fill(
        rng.pick([
          'The average listed company employs about {{avg}} people.',
          trade ? 'Typical headcount across these companies is roughly {{avg}} employees.' : 'Typical headcount across these suppliers is roughly {{avg}} employees.',
        ]),
        { avg: Math.round(c.avgEmployees) }
      )
    );
  }
  facts.push(
    c.claimed > 0
      ? `${c.claimed} ${plural(c.claimed, 'company has', 'companies have')} claimed and verified ${plural(c.claimed, 'its', 'their')} profile.`
      : 'No company here has claimed its profile yet, so owners can take over a listing to keep details current.'
  );
  if (c.cert?.authority) {
    facts.push(
      `${c.cert.code} is administered by ${c.cert.authority} and is commonly requested for ${catLower} work.`
    );
  }
  if (c.otherCerts.length) {
    facts.push(`Other credentials found among these suppliers include ${list(c.otherCerts.slice(0, 3))}.`);
  }

  const paragraphs = [
    fill(rng.pick(trade ? OPENINGS_TRADE : OPENINGS), vars),
    rng.shuffle(facts).join(' '),
    rng.pick(trade ? CLOSINGS_TRADE : CLOSINGS),
  ];

  const faq: { q: string; a: string }[] = [
    trade
      ? {
          q: `How many ${catLower} are listed${place}?`,
          a: `FacList currently lists ${c.count} ${noun} under ${c.category.name}${place}.`,
        }
      : {
          q: `How many ${catLower} manufacturers are listed${place}${withCert}?`,
          a: `FacList currently lists ${c.count} ${noun} offering ${catLower}${place}${withCert}.`,
        },
  ];
  if (c.topCities.length) {
    faq.push({
      q: trade ? `Which cities have the most ${catLower}${place}?` : `Which cities have the most ${catLower} suppliers${place}?`,
      a: `${list(c.topCities.slice(0, 3))} ${c.topCities.length === 1 ? 'has' : 'have'} the largest number of listed ${trade ? catLower : catLower + ' suppliers'}${place}.`,
    });
  }
  if (c.cert?.description) {
    faq.push({ q: `What does ${c.cert.code} certification mean for a ${catLower} supplier?`, a: c.cert.description });
  }

  return { title, metaDescription, h1, paragraphs, faq };
}

/* ---------- supplier pages ---------- */

export interface SupplierCtx {
  path: string;
  company: {
    name: string;
    city: string | null;
    state: string | null;
    country: string;
    employee_count: number | null;
    revenue_tier: string | null;
    claimed_status: number;
    description: string | null;
  };
  categories: string[];
  certs: { code: string; authority: string | null }[];
  nearby: CompanyCard[];
  yearFounded?: number | null;
  companyType?: string | null;
  capabilities?: string[];
  industries?: string[];
  section?: string;
}

const TIER_LABEL: Record<string, string> = {
  micro: 'a micro-sized business',
  small: 'a small business',
  mid: 'a mid-sized manufacturer',
  large: 'a large manufacturer',
  enterprise: 'an enterprise-scale manufacturer',
};

export function tierLabel(t: string | null): string | null {
  return t ? (TIER_LABEL[t] ?? null) : null;
}

export function synthSupplier(c: SupplierCtx) {
  const rng = makeRng(c.path);
  const where = [...new Set([c.company.city, c.company.state, c.company.country].filter(Boolean))].join(', ');
  const cats = c.categories.map((x) => x.toLowerCase());
  const trade = c.section === 'trade';
  const primary = c.categories[0] ?? (trade ? 'Import & Export' : 'Manufacturing');

  const sentences: string[] = [];
  sentences.push(
    rng.pick(trade ? [
      `${c.company.name} is based in ${where} and is listed under ${list(c.categories)}.`,
      `Based in ${where}, ${c.company.name} appears in our ${list(cats)} listings.`,
      `${c.company.name} operates from ${where} and is listed under ${list(c.categories)}.`,
    ] : [
      `${c.company.name} is a ${cats.length ? list(cats) : 'manufacturing'} supplier based in ${where}.`,
      `Based in ${where}, ${c.company.name} offers ${cats.length ? list(cats) : 'manufacturing services'}.`,
      `${c.company.name} provides ${cats.length ? list(cats) : 'manufacturing services'} from its location in ${where}.`,
    ])
  );
  const tier = trade ? null : tierLabel(c.company.revenue_tier);
  if (c.company.employee_count && tier) {
    sentences.push(`The company is ${tier} with around ${c.company.employee_count} employees.`);
  } else if (c.company.employee_count) {
    sentences.push(`The company employs around ${c.company.employee_count} people.`);
  }
  const nowYear = new Date().getFullYear();
  if (c.yearFounded && c.yearFounded <= nowYear) {
    const yrs = nowYear - c.yearFounded;
    sentences.push(
      yrs >= 1
        ? rng.pick([
            `Founded in ${c.yearFounded}, the company has been in business for ${yrs} ${plural(yrs, 'year', 'years')}.`,
            `${c.company.name} has been operating since ${c.yearFounded}.`,
          ])
        : `${c.company.name} was founded in ${c.yearFounded}.`
    );
  }
  if (c.companyType) sentences.push(`It is listed as a ${c.companyType.toLowerCase()}.`);
  if (c.capabilities?.length) sentences.push(`Listed capabilities include ${list(c.capabilities.slice(0, 4))}.`);
  if (c.industries?.length) sentences.push(`The company serves customers in ${list(c.industries.slice(0, 4).map((x) => x.toLowerCase()))}.`);
  if (c.certs.length) {
    sentences.push(
      rng.pick([
        `Listed credentials include ${list(c.certs.map((x) => x.code))}.`,
        `Buyers can verify ${list(c.certs.map((x) => x.code))} ${plural(c.certs.length, 'certification', 'certifications')} for this supplier.`,
      ])
    );
  }
  sentences.push(
    c.company.claimed_status
      ? 'This profile has been claimed and verified by the company.'
      : 'This profile has not been claimed yet; company representatives can claim it to update details.'
  );
  if (c.nearby.length) {
    sentences.push(
      `Other ${trade ? 'companies listed under ' + primary : primary.toLowerCase() + ' suppliers'} in ${c.company.country} include ${list(c.nearby.slice(0, 3).map((n) => n.name))}.`
    );
  }

  return {
    title: `${c.company.name} - ${primary}${trade ? '' : ' Manufacturer'} in ${[...new Set([c.company.city, c.company.state ?? c.company.country].filter(Boolean))].join(', ')} | FacList`,
    metaDescription: `${sentences.slice(0, 2).join(' ')} View credentials and request a quote on FacList.`.slice(0, 300),
    paragraphs: [sentences.slice(0, 3).join(' '), sentences.slice(3).join(' ')].filter(Boolean),
    where,
  };
}
