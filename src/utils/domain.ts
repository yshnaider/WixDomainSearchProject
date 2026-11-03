/** A lowercase domain in punycode, such as `sunnybakery.co.il`. */
export const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** The name before the first dot: `sunnybakery` in `sunnybakery.co.il`. */
export const domainName = (domain: string) => domain.slice(0, domain.indexOf('.'));

/** Everything after the first dot: `co.il` in `sunnybakery.co.il`. */
export const tldOf = (domain: string) => domain.slice(domain.indexOf('.') + 1);
