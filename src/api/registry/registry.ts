import { randomBytes } from 'node:crypto';
import { connect } from 'node:net';

// Registry RDAP servers, queried directly: rdap.org also returns 404 for TLDs that have no RDAP
// server, which looks the same as "not registered".
const RDAP_SERVERS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
  uk: 'https://rdap.nominet.uk/uk/domain/',
  gov: 'https://rdap.nic.gov/rdap/domain/',
};

// For TLDs without RDAP. Each entry says how the server marks a registered and a free domain.
const WHOIS_SERVERS: Record<string, { host: string; registered: RegExp; free: RegExp }> = {
  il: {
    host: 'whois.isoc.org.il',
    registered: /^domain:/m,
    free: /No data was found to match the request criteria/,
  },
};

const WHOIS_TIMEOUT_MS = 10_000;
const GENERATION_ATTEMPTS = 3;

/** Asks the domain's registry whether it's registered. The domain must be in punycode. */
export async function isRegistered(domain: string): Promise<boolean> {
  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  const rdapServer = RDAP_SERVERS[tld];
  if (rdapServer) {
    return isRegisteredByRdap(`${rdapServer}${domain}`, domain);
  }
  const whoisServer = WHOIS_SERVERS[tld];
  if (whoisServer) {
    return isRegisteredByWhois(whoisServer, domain);
  }
  throw new Error(`No RDAP or WHOIS server configured for .${tld} (${domain})`);
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

async function isRegisteredByRdap(url: string, domain: string): Promise<boolean> {
  // Plain fetch, so no Wix credentials are sent to the registry.
  const response = await fetch(url);
  if (response.status === 200) {
    return true;
  }
  if (response.status === 404) {
    return false;
  }
  throw new Error(`RDAP lookup for ${domain} returned ${response.status}`);
}

async function isRegisteredByWhois(
  server: (typeof WHOIS_SERVERS)[string],
  domain: string,
): Promise<boolean> {
  const answer = await queryWhois(server.host, domain);
  if (server.registered.test(answer)) {
    return true;
  }
  if (server.free.test(answer)) {
    return false;
  }
  throw new Error(`WHOIS answer from ${server.host} for ${domain} is neither registered nor free`);
}

function queryWhois(host: string, domain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let answer = '';
    const socket = connect(43, host, () => socket.write(`${domain}\r\n`));
    socket.setTimeout(WHOIS_TIMEOUT_MS, () => {
      socket.destroy();
      reject(new Error(`WHOIS query to ${host} for ${domain} timed out`));
    });
    socket.on('data', (chunk) => (answer += chunk.toString()));
    socket.on('close', () => resolve(answer));
    socket.on('error', (error) =>
      reject(new Error(`WHOIS query to ${host} for ${domain} failed: ${error.message}`)),
    );
  });
}
