/** Page paths on www.wix.com. */
export const PATHS = {
  whoisLookup: '/domains/whois',
  whoisResults: '/domain/result/whois',
  /** Storefront results; WHOIS Lookup redirects here for an available domain. */
  domainResults: '/domain/result/',
} as const;

/** The query parameter each results page reads the searched domain from. */
export const RESULT_QUERY_PARAMS = {
  whoisResults: 'query',
  domainResults: 'q',
} as const;
