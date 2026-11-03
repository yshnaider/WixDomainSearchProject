import {
  CHECK_DOMAIN_AVAILABILITY_LIMITS,
  CHECK_DOMAIN_AVAILABILITY_PARAMS,
  SUGGEST_DOMAINS_LIMITS,
  type DomainSearch,
} from '../../src/api/domainSearch/DomainSearch';
import {
  VIOLATION_FIELDS,
  checkDomainAvailabilityErrorCodeSchema,
  checkDomainAvailabilityResponseSchema,
  suggestDomainsResponseSchema,
  type ApiError,
  type CheckDomainAvailabilityResponse,
  type SuggestDomainsResponse,
} from '../../src/api/domainSearch/domainSearch.schemas';
import { authHeaders } from '../../src/api/authHeaders';
import { HTTP_STATUS } from '../../src/api/httpStatus';
import { toQueryString } from '../../src/api/queryString';
import { generateUnregisteredDomain, isRegistered } from '../../src/api/registry/registry';
import { getApiEnv } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/api.fixture';
import {
  BAD_DOMAINS,
  DOMAINS,
  INVALID_API_KEY,
  KNOWN_DOMAINS,
  MAX_LABEL_DOMAIN,
  QUERIES,
  domainOfLength,
  knownDomain,
  titleFor,
} from '../../src/fixtures/testData';
import {
  expectClientError,
  expectErrorStatus,
  expectNoServerError,
  expectSuccess,
  violatedFields,
} from './support/expectResponse';

const LIMITS = CHECK_DOMAIN_AVAILABILITY_LIMITS;
const ERROR_CODES = checkDomainAvailabilityErrorCodeSchema.enum;
const REGISTERED_DOMAIN = knownDomain('K1');
const PUNYCODE_DOMAIN = knownDomain('K5');
const UNSOLD_TLD_DOMAIN = knownDomain('K6');
// K6 is checked by CA-19 instead: Wix doesn't sell .gov.
const SOLD_KNOWN_DOMAINS = KNOWN_DOMAINS.filter(({ domain }) => domain !== UNSOLD_TLD_DOMAIN);

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
    throw new Error(`No premium suggestion for "${QUERIES.premium}" to test with`);
  }
  return premium.domain;
}

test.describe('check-domain-availability', () => {
  test(
    'CA-01 reports a registered domain as unavailable',
    { tag: '@smoke' },
    async ({ domainSearch }) => {
      const { availability } = await check(domainSearch, REGISTERED_DOMAIN);

      expect(availability.domain).toBe(REGISTERED_DOMAIN);
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
        expect(availability.premiumType).toBeTruthy();
      });
    }

    test('G generated unregistered domain', { tag: '@sanity' }, async ({ domainSearch }) => {
      const { availability } = await check(domainSearch, await generateUnregisteredDomain());

      expect(availability.premium).toEqual(expect.any(Boolean));
      expect(availability.premiumType).toBeTruthy();
    });
  });

  test(
    'CA-05 reports a premium domain as premium',
    { tag: '@sanity' },
    async ({ domainSearch }) => {
      const suggestions = await expectSuccess(
        await domainSearch.suggestDomains({
          query: QUERIES.premium,
          paging: { limit: SUGGEST_DOMAINS_LIMITS.pagingLimitMax },
        }),
        suggestDomainsResponseSchema,
      );
      const domain = findPremiumDomain(suggestions);

      const { availability } = await check(domainSearch, domain);

      expect(availability.premium, `${domain} is premium in suggest-domains`).toBe(true);
    },
  );

  test('CA-06 never offers a 3-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectNoServerError(
      await domainSearch.checkDomainAvailability({ domain: DOMAINS.minLength }),
      checkDomainAvailabilityResponseSchema,
    );

    expect(availabilityOf(body)?.available).not.toBe(true);
  });

  test('CA-07 rejects a 2-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({ domain: DOMAINS.tooShort }),
    );

    expect(violatedFields(error)).toContain(VIOLATION_FIELDS.domain);
  });

  test('CA-08 accepts a 63-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const domain = domainOfLength(LIMITS.domainMaxLength);
    const { availability } = await check(domainSearch, domain);

    expect(availability.domain).toBe(domain);
  });

  test('CA-09 rejects a 64-character domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({
        domain: domainOfLength(LIMITS.domainMaxLength + 1),
      }),
    );

    expect(violatedFields(error)).toContain(VIOLATION_FIELDS.domain);
  });

  test(
    'CA-10 rejects a 67-character domain with a legal label',
    { tag: '@edge' },
    async ({ domainSearch }) => {
      const error = await expectClientError(
        await domainSearch.checkDomainAvailability({ domain: MAX_LABEL_DOMAIN }),
      );

      expect(violatedFields(error)).toContain(VIOLATION_FIELDS.domain);
    },
  );

  test('CA-11 rejects an empty or missing domain', { tag: '@edge' }, async ({ domainSearch }) => {
    await test.step('empty domain', async () => {
      const error = await expectClientError(
        await domainSearch.checkDomainAvailabilityRaw(
          toQueryString({ [CHECK_DOMAIN_AVAILABILITY_PARAMS.domain]: QUERIES.empty }),
        ),
      );
      expect(violatedFields(error)).toContain(VIOLATION_FIELDS.domain);
    });

    await test.step('no domain parameter', async () => {
      const error = await expectClientError(
        await domainSearch.checkDomainAvailabilityRaw(toQueryString({})),
      );
      expect(violatedFields(error)).toContain(VIOLATION_FIELDS.domain);
    });
  });

  test.describe('CA-12 rejects bad domains', () => {
    for (const { id, input } of BAD_DOMAINS) {
      test(`${id} ${titleFor(input)}`, { tag: '@edge' }, async ({ domainSearch }) => {
        await expectClientError(await domainSearch.checkDomainAvailability({ domain: input }));
      });
    }
  });

  test('CA-13 ignores letter case', { tag: '@edge' }, async ({ domainSearch }) => {
    const lower = await check(domainSearch, REGISTERED_DOMAIN);
    const upper = await check(domainSearch, REGISTERED_DOMAIN.toUpperCase());

    expect(upper.availability.available).toBe(lower.availability.available);
    expect(upper.availability.premium).toBe(lower.availability.premium);
  });

  test('CA-14 accepts a punycode domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const { availability } = await check(domainSearch, PUNYCODE_DOMAIN);

    expect(availability.available).toBe(false);
  });

  test('CA-15 rejects a Unicode domain', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({ domain: DOMAINS.unicode }),
    );

    expect(violatedFields(error)).toContain(VIOLATION_FIELDS.domain);
  });

  test('CA-16 rejects a domain without a TLD', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.checkDomainAvailability({ domain: DOMAINS.noTld }),
    );

    expect(violatedFields(error)).toContain(VIOLATION_FIELDS.domain);
  });

  test(
    'CA-17 accepts the documented example domain',
    { tag: '@sanity' },
    async ({ domainSearch }) => {
      const { availability } = await check(domainSearch, DOMAINS.documentedExample);

      expect(availability.domain).toBe(DOMAINS.documentedExample);
    },
  );

  test(
    'CA-18 requires a valid API key',
    { tag: '@failure' },
    async ({ domainSearchWithHeaders }) => {
      const { WIX_ACCOUNT_ID } = getApiEnv();
      const cases = [
        { name: 'no API key', headers: {} },
        { name: 'invalid API key', headers: authHeaders(INVALID_API_KEY, WIX_ACCOUNT_ID) },
      ];
      for (const { name, headers } of cases) {
        await test.step(name, async () => {
          const client = await domainSearchWithHeaders(headers);
          const response = await client.checkDomainAvailability({ domain: REGISTERED_DOMAIN });
          await expectClientError(response);
          const leaked = checkDomainAvailabilityResponseSchema.safeParse(await response.json());
          expect(leaked.success, 'the body contains availability data').toBe(false);
        });
      }
    },
  );

  test("CA-19 rejects a TLD Wix doesn't sell", { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectErrorStatus(
      await domainSearch.checkDomainAvailability({ domain: UNSOLD_TLD_DOMAIN }),
      HTTP_STATUS.BAD_REQUEST,
    );

    expect(error.details.applicationError?.code).toBe(ERROR_CODES.DOMAINS_UNSUPPORTED_TLD);
  });
});
