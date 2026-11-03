/**
 * Endpoints the doors call on www.wix.com (ARCHITECTURE.md). They're served under several path
 * prefixes, so they're matched by the end of the path.
 */
export const DOOR_ENDPOINTS = {
  listTlds: '/domain-tlds/list-tlds',
  suggestedTldDisplayPrices: '/v1/suggested-tld-display-prices',
  suggestDomains: '/domain-search/v2/suggest-domains',
  tldPromotions: '/v1/tld-promotions',
  generateBusinessNames: '/v1/business-names/generate',
  checkDomainAvailability: '/domain-search/v2/check-domain-availability',
  whois: '/v1/structured-domain-info/whois',
  tagManager: '/_api/tag-manager/api/v1/tags/hosts/PREMIUM_DOMAINS',
} as const;

export type DoorEndpoint = keyof typeof DOOR_ENDPOINTS;

export const matchesEndpoint = (url: string | URL, endpoint: DoorEndpoint) =>
  new URL(url).pathname.endsWith(DOOR_ENDPOINTS[endpoint]);
