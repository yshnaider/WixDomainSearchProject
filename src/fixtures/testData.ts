/** Registered domains from TEST_PLAN.md's Known Domains table, checked on 2026-11-03. */
export const KNOWN_DOMAINS = [
  { id: 'K1', domain: 'google.com' },
  { id: 'K2', domain: 'wikipedia.org' },
  { id: 'K3', domain: 'bbc.co.uk' },
  { id: 'K4', domain: 'ynet.co.il' },
  { id: 'K5', domain: 'xn--bcher-kva.com' },
  { id: 'K6', domain: 'nasa.gov' },
] as const;

const LABEL_63 = 'a'.repeat(63);

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
  { id: 'B15', input: `${'a'.repeat(64)}.com` },
  { id: 'B16', input: `${[LABEL_63, LABEL_63, LABEL_63, LABEL_63].join('.')}.com` },
  { id: 'B17', input: 'shop.notarealtld' },
  { id: 'B18', input: 'shop.test' },
  { id: 'B18', input: 'shop.example' },
  { id: 'B18', input: 'shop.invalid' },
  { id: 'B18', input: 'shop.localhost' },
  { id: 'B19', input: '192.0.2.1' },
  { id: 'B20', input: '[2001:db8::1]' },
] as const;

/** Row U9: a legal 63-character label, which makes a 67-character domain. */
export const MAX_LABEL_DOMAIN = `${LABEL_63}.com`;
