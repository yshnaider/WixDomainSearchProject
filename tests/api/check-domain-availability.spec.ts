import type { DomainSearch } from '../../src/api/domainSearch/DomainSearch';
import {
  apiErrorSchema,
  checkDomainAvailabilityResponseSchema,
  suggestDomainsResponseSchema,
  type ApiError,
  type CheckDomainAvailabilityResponse,
  type SuggestDomainsResponse,
} from '../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../src/api/parseResponse';
import { generateUnregisteredDomain, isRegistered } from '../../src/api/registry/registry';
import { getApiEnv } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/api.fixture';
import { BAD_DOMAINS, KNOWN_DOMAINS, MAX_LABEL_DOMAIN } from '../../src/fixtures/testData';
import {
  expectClientError,
  expectNoServerError,
  expectSuccess,
  violatedFields,
} from './support/expectResponse';

const K1 = KNOWN_DOMAINS[0].domain;
const K5 = KNOWN_DOMAINS[4].domain;
const K6 = KNOWN_DOMAINS[5].domain;
// K6 is checked by CA-19 instead: Wix doesn't sell .gov.
const SOLD_KNOWN_DOMAINS = KNOWN_DOMAINS.filter(({ id }) => id !== 'K6');
const PREMIUM_SEARCH_QUERY = 'supermario';

const check = async (domainSearch: DomainSearch, domain: string) =>
  expectSuccess(
    await domainSearch.checkDomainAvailability({ domain }),
    checkDomainAvailabilityResponseSchema,
  );

const availabilityOf = (body: CheckDomainAvailabilityResponse | ApiError) =>
  'availability' in body ? body.availability : undefined;

function findPremiumDomain(body: SuggestDomainsResponse): string {
  const premium = body.suggestions.find((suggestion) => suggestion.premium);
  if (!premium) {
    throw new Error(`No premium suggestion for "${PREMIUM_SEARCH_QUERY}" to test with`);
  }
  return premium.domain;
}

test.describe('check-domain-availability', () => {
  test(
    'CA-01 reports a registered domain as unavailable',
    { tag: '@smoke' },
    async ({ domainSearch }) => {
      const { availability } = await check(domainSearch, K1);

      expect(availability.domain).toBe(K1);
      expect(availability.available).toBe(false);
    },
  );

  test(
    'CA-02 reports an unregistered domain as available',
    { tag: '@smoke' },
    async ({ domainSearch }) => {
      const domain = await generateUnregisteredDomain();
      const { availability } = await check(domainSearch, domain);

      expect(availability.domain).toBe(domain);
      expect(availability.available).toBe(true);
    },
  );

  test.describe('CA-03 availability matches the registry', () => {
    for (const { id, domain } of SOLD_KNOWN_DOMAINS) {
      test(`${id} ${domain}`, { tag: '@sanity' }, async ({ domainSearch }) => {
        const registered = await isRegistered(domain);
        const { availability } = await check(domainSearch, domain);

        expect(availability.domain).toBe(domain);
        expect(availability.available, `registry says registered: ${registered}`).toBe(!registered);
      });
    }

    test('G generated unregistered domain', { tag: '@sanity' }, async ({ domainSearch }) => {
      const domain = await generateUnregisteredDomain();
      const { availability } = await check(domainSearch, domain);

      expect(availability.available, `${domain} is unregistered per RDAP`).toBe(true);
    });
  });

  test.describe('CA-04 every response includes premium status', () => {
    for (const { id, domain } of SOLD_KNOWN_DOMAINS) {
      test(`${id} ${domain}`, { tag: '@sanity' }, async ({ domainSearch }) => {
        const { availability } = await check(domainSearch, domain);

        expect(availability.premium).toEqual(expect.any(Boolean));
        expect(availability.premiumType).not.toBe('');
      });
    }

    test('G generated unregistered domain', { tag: '@sanity' }, async ({ domainSearch }) => {
      const { availability } = await check(domainSearch, await generateUnregisteredDomain());

      expect(availability.premium).toEqual(expect.any(Boolean));
      expect(availability.premiumType).not.toBe('');
    });
  });

  test(
    'CA-05 reports a premium domain as premium',
    { tag: '@sanity' },
    async ({ domainSearch }) => {
      const suggestions = await expectSuccess(
        await domainSearch.suggestDomains({ query: PREMIUM_SEARCH_QUERY, paging: { limit: 50 } }),
        suggestDomainsResponseSchema,
      );
      const domain = findPremiumDomain(suggestions);

      const { availability } = await check(domainSearch, domain);

      expect(availability.premium, `${domain} is premium in suggest-domains`).toBe(true);
    },
  );

  test('CA-06 never offers a 3-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectNoServerError(
      await domainSearch.checkDomainAvailability({ domain: 'a.b' }),
      checkDomainAvailabilityResponseSchema,
    );

    expect(availabilityOf(body)?.available).not.toBe(true);
  });

  test('CA-07 rejects a 2-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({ domain: 'ab' }),
    );

    expect(violatedFields(error)).toContain('domain');
  });

  test('CA-08 accepts a 63-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const domain = `${'a'.repeat(59)}.com`;
    const { availability } = await check(domainSearch, domain);

    expect(availability.domain).toBe(domain);
  });

  test('CA-09 rejects a 64-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({ domain: `${'a'.repeat(60)}.com` }),
    );

    expect(violatedFields(error)).toContain('domain');
  });

  test(
    'CA-10 rejects a 67-character domain with a legal label',
    { tag: '@edge' },
    async ({ domainSearch }) => {
      const error = await expectClientError(
        await domainSearch.checkDomainAvailability({ domain: MAX_LABEL_DOMAIN }),
      );

      expect(violatedFields(error)).toContain('domain');
    },
  );

  test('CA-11 rejects an empty or missing domain', { tag: '@edge' }, async ({ domainSearch }) => {
    await test.step('empty domain', async () => {
      const error = await expectClientError(
        await domainSearch.checkDomainAvailabilityRaw('domain='),
      );
      expect(violatedFields(error)).toContain('domain');
    });

    await test.step('no domain parameter', async () => {
      const error = await expectClientError(await domainSearch.checkDomainAvailabilityRaw(''));
      expect(violatedFields(error)).toContain('domain');
    });
  });

  test.describe('CA-12 rejects bad domains', () => {
    for (const { id, input } of BAD_DOMAINS) {
      test(
        `${id} ${JSON.stringify(input).slice(0, 40)}`,
        { tag: '@edge' },
        async ({ domainSearch }) => {
          await expectClientError(await domainSearch.checkDomainAvailability({ domain: input }));
        },
      );
    }
  });

  test('CA-13 ignores letter case', { tag: '@edge' }, async ({ domainSearch }) => {
    const lower = await check(domainSearch, K1);
    const upper = await check(domainSearch, K1.toUpperCase());

    expect(upper.availability.available).toBe(lower.availability.available);
    expect(upper.availability.premium).toBe(lower.availability.premium);
  });

  test('CA-14 accepts a punycode domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const { availability } = await check(domainSearch, K5);

    expect(availability.available).toBe(false);
  });

  test('CA-15 rejects a Unicode domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({ domain: 'bücher.com' }),
    );

    expect(violatedFields(error)).toContain('domain');
  });

  test('CA-16 rejects a domain without a TLD', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({ domain: 'sunnybakery' }),
    );

    expect(violatedFields(error)).toContain('domain');
  });

  test(
    'CA-17 accepts the documented example domain',
    { tag: '@sanity' },
    async ({ domainSearch }) => {
      const { availability } = await check(domainSearch, 'my-new-domain.com');

      expect(availability.domain).toBe('my-new-domain.com');
    },
  );

  test(
    'CA-18 requires a valid API key',
    { tag: '@failure' },
    async ({ domainSearchWithHeaders }) => {
      const { WIX_ACCOUNT_ID } = getApiEnv();
      const cases: { name: string; headers: Record<string, string> }[] = [
        { name: 'no API key', headers: {} },
        {
          name: 'invalid API key',
          headers: { Authorization: 'invalid-api-key', 'wix-account-id': WIX_ACCOUNT_ID },
        },
      ];
      for (const { name, headers } of cases) {
        await test.step(name, async () => {
          const client = await domainSearchWithHeaders(headers);
          const response = await client.checkDomainAvailability({ domain: K1 });
          await expectClientError(response);
          expect(await response.text()).not.toContain('"availability"');
        });
      }
    },
  );

  test("CA-19 rejects a TLD Wix doesn't sell", { tag: '@edge' }, async ({ domainSearch }) => {
    const response = await domainSearch.checkDomainAvailability({ domain: K6 });

    expect(response.status()).toBe(400);
    const error = await parseResponse(response, apiErrorSchema);
    expect(error.details.applicationError?.code).toBe('DOMAINS_UNSUPPORTED_TLD');
  });
});
