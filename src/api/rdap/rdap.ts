import { randomBytes } from 'node:crypto';

// Registry RDAP servers, queried directly: rdap.org also returns 404 for TLDs that have no RDAP
// server, which looks the same as "not registered".
const RDAP_SERVERS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
  uk: 'https://rdap.nominet.uk/uk/domain/',
  gov: 'https://rdap.nic.gov/rdap/domain/',
};

const GENERATION_ATTEMPTS = 3;

/** Asks the registry whether a domain (in punycode) is registered. */
export async function isRegistered(domain: string): Promise<boolean> {
  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  const server = RDAP_SERVERS[tld];
  if (!server) {
    throw new Error(`No RDAP server configured for .${tld} (${domain}); use the registry's WHOIS`);
  }

  // Plain fetch, so no Wix credentials are sent to the registry.
  const response = await fetch(`${server}${domain}`);
  if (response.status === 200) {
    return true;
  }
  if (response.status === 404) {
    return false;
  }
  throw new Error(`RDAP lookup for ${domain} returned ${response.status}`);
}

/** Generates a new .com domain, such as `qa-test-7x2k9q4m.com`, that RDAP confirms is unregistered. */
export async function generateUnregisteredDomain(): Promise<string> {
  for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt++) {
    const domain = `qa-test-${randomBytes(4).toString('hex')}.com`;
    if (!(await isRegistered(domain))) {
      return domain;
    }
  }
  throw new Error(`Every generated domain was registered after ${GENERATION_ATTEMPTS} attempts`);
}
