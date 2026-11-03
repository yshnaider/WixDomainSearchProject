import { DOMAIN_PATTERN } from '../utils/domain';

/** Every successful search must return at least this many results. */
export const MIN_RESULTS = 1;

export const QUERIES = {
  default: 'sunnybakery',
  other: 'greenleaf',
  /** Returns premium suggestions, such as supermario.biz. */
  premium: 'supermario',
  unicode: 'café',
  specialCharacters: 'Bread & Butter',
  spacesOnly: '   ',
  empty: '',
} as const;

export const TLDS = {
  com: 'com',
  net: 'net',
  multiLevel: 'co.il',
  unsupported: 'notarealtld',
  withDot: '.com',
} as const;

/** The percent-encoded `tlds[]` key, which the API ignores. */
export const ENCODED_TLDS_KEY = 'tlds%5B%5D';

export const PAGE_SIZES = {
  default: 10,
  pageWalk: 5,
  /** Small enough that the first page has a next cursor. */
  cursorSource: 2,
} as const;

/** How late a delayed response arrives in the plan's timing tests (SF-16, BN-14, WH-11). */
export const SLOW_RESPONSE_MS = 3000;

/** Values that aren't valid positive numbers. */
export const INVALID_NUMBERS = ['0', '-1', 'abc'] as const;

export const INVALID_CURSOR = 'garbage';
export const INVALID_API_KEY = 'invalid-api-key';

export const DOMAINS = {
  documentedExample: 'my-new-domain.com',
  unicode: 'bücher.com',
  noTld: 'sunnybakery',
  /** 3 characters, the documented minimum. */
  minLength: 'a.b',
  /** 2 characters, below the documented minimum. */
  tooShort: 'ab',
} as const;

/** Patterns for checking response bodies. */
export const PATTERNS = {
  validDomain: DOMAIN_PATTERN,
  priceKey: /"[^"]*price[^"]*":/i,
} as const;

const DNS_LIMITS = { labelMaxLength: 63, nameMaxLength: 253 } as const;
const FILLER = 'a';

export const stringOfLength = (length: number) => FILLER.repeat(length);

/** A .com domain whose total length is `length`. */
export const domainOfLength = (length: number) =>
  `${stringOfLength(length - TLDS.com.length - 1)}.${TLDS.com}`;

const MAX_LABEL = stringOfLength(DNS_LIMITS.labelMaxLength);
const LABELS_OVER_NAME_LIMIT = Math.ceil(
  DNS_LIMITS.nameMaxLength / (DNS_LIMITS.labelMaxLength + 1),
);

/** Registered domains from TEST_PLAN.md's Known Domains table, checked on 2026-11-03. */
export const KNOWN_DOMAINS = [
  { id: 'K1', domain: 'google.com' },
  { id: 'K2', domain: 'wikipedia.org' },
  { id: 'K3', domain: 'bbc.co.uk' },
  { id: 'K4', domain: 'ynet.co.il' },
  { id: 'K5', domain: 'xn--bcher-kva.com' },
  { id: 'K6', domain: 'nasa.gov' },
] as const;

export type KnownDomainId = (typeof KNOWN_DOMAINS)[number]['id'];

export function knownDomain(id: KnownDomainId): string {
  const known = KNOWN_DOMAINS.find((entry) => entry.id === id);
  if (!known) {
    throw new Error(`No known domain with id ${id}`);
  }
  return known.domain;
}

/** Rows B3–B20 of TEST_PLAN.md's Bad and Unusual Input table. */
export const BAD_DOMAINS = [
  { id: 'B3', input: 'qwe!@# zxc' },
  { id: 'B4', input: '12345.67890' },
  { id: 'B5', input: 'shop$.com' },
  { id: 'B6', input: 'my_shop.com' },
  { id: 'B7', input: '🍕shop.com' },
  { id: 'B8', input: 'shop​.com' },
  { id: 'B9', input: '‏shop.com' },
  { id: 'B10', input: 'shop\n.com' },
  { id: 'B11', input: '-shop.com' },
  { id: 'B12', input: 'shop-.com' },
  { id: 'B13', input: 'shop..com' },
  { id: 'B14', input: 'my shop.com' },
  { id: 'B15', input: `${stringOfLength(DNS_LIMITS.labelMaxLength + 1)}.${TLDS.com}` },
  {
    id: 'B16',
    input: `${Array.from({ length: LABELS_OVER_NAME_LIMIT }, () => MAX_LABEL).join('.')}.${TLDS.com}`,
  },
  { id: 'B17', input: 'shop.notarealtld' },
  { id: 'B18', input: 'shop.test' },
  { id: 'B18', input: 'shop.example' },
  { id: 'B18', input: 'shop.invalid' },
  { id: 'B18', input: 'shop.localhost' },
  { id: 'B19', input: '192.0.2.1' },
  { id: 'B20', input: '[2001:db8::1]' },
] as const;

/** Row U9: a legal 63-character label, which makes a 67-character domain. */
export const MAX_LABEL_DOMAIN = `${MAX_LABEL}.${TLDS.com}`;

const TITLE_INPUT_LENGTH = 40;

/** A short, printable version of an input, for test titles. */
export const titleFor = (input: string) => JSON.stringify(input).slice(0, TITLE_INPUT_LENGTH);
