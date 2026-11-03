import {
  SUGGEST_DOMAINS_LIMITS,
  SUGGEST_DOMAINS_PARAMS,
} from '../../src/api/domainSearch/DomainSearch';
import {
  VIOLATION_FIELDS,
  suggestDomainsErrorCodeSchema,
  suggestDomainsResponseSchema,
  type ApiError,
  type SuggestDomainsResponse,
} from '../../src/api/domainSearch/domainSearch.schemas';
import { authHeaders } from '../../src/api/authHeaders';
import { HTTP_STATUS } from '../../src/api/httpStatus';
import { toQueryString } from '../../src/api/queryString';
import { getApiEnv } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/api.fixture';
import {
  ENCODED_TLDS_KEY,
  INVALID_API_KEY,
  INVALID_CURSOR,
  INVALID_NUMBERS,
  MIN_RESULTS,
  PAGE_SIZES,
  PATTERNS,
  QUERIES,
  TLDS,
  stringOfLength,
} from '../../src/fixtures/testData';
import { domainName, tldOf } from '../../src/utils/domain';
import {
  expectClientError,
  expectErrorStatus,
  expectNoServerError,
  expectSuccess,
  violatedFields,
} from './support/expectResponse';
import { fetchAllPages } from './support/pagination';

const PARAMS = SUGGEST_DOMAINS_PARAMS;
const LIMITS = SUGGEST_DOMAINS_LIMITS;
const ERROR_CODES = suggestDomainsErrorCodeSchema.enum;

const returnedDomains = (body: SuggestDomainsResponse | ApiError) =>
  'suggestions' in body ? body.suggestions.map((suggestion) => suggestion.domain) : [];

const domainsOutside = (body: SuggestDomainsResponse, tld: string) =>
  body.suggestions.map((suggestion) => suggestion.domain).filter((domain) => tldOf(domain) !== tld);

test.describe('suggest-domains', () => {
  test('SD-01 returns a page of suggestions', { tag: '@smoke' }, async ({ domainSearch }) => {
    const body = await expectSuccess(
      await domainSearch.suggestDomains({
        query: QUERIES.default,
        paging: { limit: PAGE_SIZES.default },
      }),
      suggestDomainsResponseSchema,
    );

    expect(body.suggestions.length).toBeGreaterThanOrEqual(MIN_RESULTS);
    expect(body.suggestions.length).toBeLessThanOrEqual(PAGE_SIZES.default);
    expect(body.pagingMetadata.count).toBe(body.suggestions.length);
  });

  test('SD-02 returns suggestions without prices', { tag: '@sanity' }, async ({ domainSearch }) => {
    const response = await domainSearch.suggestDomains({
      query: QUERIES.default,
      paging: { limit: PAGE_SIZES.default },
    });

    const body = await expectSuccess(response, suggestDomainsResponseSchema);
    expect(body.suggestions.length).toBeGreaterThanOrEqual(MIN_RESULTS);
    expect(await response.text(), 'no response key mentions a price').not.toMatch(
      PATTERNS.priceKey,
    );
  });

  test('SD-03 accepts a 1-character query', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectSuccess(
      await domainSearch.suggestDomains({ query: stringOfLength(LIMITS.queryMinLength) }),
      suggestDomainsResponseSchema,
    );

    expect(body.pagingMetadata.count).toBe(body.suggestions.length);
  });

  test('SD-04 accepts a 100-character query', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectSuccess(
      await domainSearch.suggestDomains({ query: stringOfLength(LIMITS.queryMaxLength) }),
      suggestDomainsResponseSchema,
    );

    expect(body.pagingMetadata.count).toBe(body.suggestions.length);
  });

  test('SD-05 rejects a 101-character query', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.suggestDomains({ query: stringOfLength(LIMITS.queryMaxLength + 1) }),
    );

    expect(violatedFields(error)).toContain(VIOLATION_FIELDS.query);
  });

  test('SD-06 rejects an empty or missing query', { tag: '@edge' }, async ({ domainSearch }) => {
    await test.step('empty query', async () => {
      const error = await expectClientError(
        await domainSearch.suggestDomains({ query: QUERIES.empty }),
      );
      expect(violatedFields(error)).toContain(VIOLATION_FIELDS.query);
    });

    await test.step('no query parameter', async () => {
      const error = await expectClientError(
        await domainSearch.suggestDomainsRaw(
          toQueryString({ [PARAMS.pagingLimit]: PAGE_SIZES.default }),
        ),
      );
      expect(violatedFields(error)).toContain(VIOLATION_FIELDS.query);
    });
  });

  test('SD-07 rejects a spaces-only query', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.suggestDomains({ query: QUERIES.spacesOnly }),
    );

    expect(error.message).toBeTruthy();
  });

  test(
    'SD-09 handles Unicode and special characters',
    { tag: '@edge' },
    async ({ domainSearch }) => {
      for (const query of [QUERIES.unicode, QUERIES.specialCharacters]) {
        await test.step(query, async () => {
          const body = await expectNoServerError(
            await domainSearch.suggestDomains({ query }),
            suggestDomainsResponseSchema,
          );
          for (const domain of returnedDomains(body)) {
            expect(domain).toMatch(PATTERNS.validDomain);
          }
        });
      }
    },
  );

  test('SD-10 returns only the requested TLDs', { tag: '@sanity' }, async ({ domainSearch }) => {
    const requested: string[] = [TLDS.com, TLDS.net];
    const body = await expectSuccess(
      await domainSearch.suggestDomains({ query: QUERIES.default, tlds: requested }),
      suggestDomainsResponseSchema,
    );

    expect(body.suggestions.length).toBeGreaterThanOrEqual(MIN_RESULTS);
    for (const { domain } of body.suggestions) {
      expect(requested, domain).toContain(tldOf(domain));
    }
  });

  test(
    'SD-10 returns only .net for a single tlds[]=net',
    { tag: '@sanity' },
    async ({ domainSearch }) => {
      const body = await expectSuccess(
        await domainSearch.suggestDomains({ query: QUERIES.default, tlds: [TLDS.net] }),
        suggestDomainsResponseSchema,
      );

      expect(body.suggestions.length).toBeGreaterThanOrEqual(MIN_RESULTS);
      expect(domainsOutside(body, TLDS.net), 'suggestions outside the requested .net').toEqual([]);
    },
  );

  test('SD-11 filters by a multi-level TLD', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectNoServerError(
      await domainSearch.suggestDomains({ query: QUERIES.default, tlds: [TLDS.multiLevel] }),
      suggestDomainsResponseSchema,
    );

    for (const domain of returnedDomains(body)) {
      expect(tldOf(domain), domain).toBe(TLDS.multiLevel);
    }
  });

  test('SD-12 ignores an encoded tlds key', { tag: '@edge' }, async ({ domainSearch }) => {
    // Control: the raw key filters. Uses com, the only TLD the filter honors today.
    await test.step('raw tlds[]=com filters', async () => {
      const body = await expectSuccess(
        await domainSearch.suggestDomainsRaw(
          toQueryString({ [PARAMS.query]: QUERIES.default, [PARAMS.tlds]: TLDS.com }),
        ),
        suggestDomainsResponseSchema,
      );
      expect(body.suggestions.length).toBeGreaterThanOrEqual(MIN_RESULTS);
      expect(domainsOutside(body, TLDS.com), 'raw tlds[]=com returned other TLDs').toEqual([]);
    });

    await test.step('encoded tlds%5B%5D=com is ignored', async () => {
      const body = await expectSuccess(
        await domainSearch.suggestDomainsRaw(
          toQueryString({ [PARAMS.query]: QUERIES.default, [ENCODED_TLDS_KEY]: TLDS.com }),
        ),
        suggestDomainsResponseSchema,
      );
      const domains = body.suggestions.map((suggestion) => suggestion.domain);
      expect(
        domainsOutside(body, TLDS.com),
        `encoded key filtered to .com anyway: ${domains.join(', ')}`,
      ).not.toEqual([]);
    });
  });

  test(
    'SD-13 rejects unsupported and malformed TLDs',
    { tag: '@edge' },
    async ({ domainSearch }) => {
      const cases = [
        { tld: TLDS.unsupported, code: ERROR_CODES.TLD_NOT_SUPPORTED },
        { tld: TLDS.withDot, code: ERROR_CODES.INVALID_TLD_FORMAT },
      ];
      for (const { tld, code } of cases) {
        await test.step(tld, async () => {
          const error = await expectErrorStatus(
            await domainSearch.suggestDomains({ query: QUERIES.default, tlds: [tld] }),
            HTTP_STATUS.BAD_REQUEST,
          );
          expect(error.message).toBe(code);
          expect(violatedFields(error)).toContain(VIOLATION_FIELDS.tlds);
        });
      }
    },
  );

  test('SD-14 respects maxLength', { tag: '@sanity' }, async ({ domainSearch }) => {
    // Suggestions are never shorter than the query, so maxLength must not be below its length.
    const maxLength = QUERIES.default.length + 1;
    const body = await expectSuccess(
      await domainSearch.suggestDomains({ query: QUERIES.default, maxLength }),
      suggestDomainsResponseSchema,
    );

    expect(body.suggestions.length).toBeGreaterThanOrEqual(MIN_RESULTS);
    for (const { domain } of body.suggestions) {
      expect(domainName(domain).length, domain).toBeLessThanOrEqual(maxLength);
    }
  });

  test('SD-15 rejects an invalid maxLength', { tag: '@edge' }, async ({ domainSearch }) => {
    for (const maxLength of INVALID_NUMBERS) {
      await test.step(`maxLength=${maxLength}`, async () => {
        await expectClientError(
          await domainSearch.suggestDomainsRaw(
            toQueryString({ [PARAMS.query]: QUERIES.default, [PARAMS.maxLength]: maxLength }),
          ),
        );
      });
    }
  });

  test('SD-16 accepts the paging.limit boundaries', { tag: '@edge' }, async ({ domainSearch }) => {
    for (const limit of [LIMITS.pagingLimitMin, LIMITS.pagingLimitMax]) {
      await test.step(`paging.limit=${limit}`, async () => {
        const body = await expectSuccess(
          await domainSearch.suggestDomains({ query: QUERIES.default, paging: { limit } }),
          suggestDomainsResponseSchema,
        );
        expect(body.suggestions.length).toBeGreaterThanOrEqual(MIN_RESULTS);
        expect(body.suggestions.length).toBeLessThanOrEqual(limit);
        expect(body.pagingMetadata.count).toBe(body.suggestions.length);
      });
    }
  });

  test('SD-17 rejects an out-of-range paging.limit', { tag: '@edge' }, async ({ domainSearch }) => {
    for (const limit of [LIMITS.pagingLimitMin - 1, LIMITS.pagingLimitMax + 1]) {
      await test.step(`paging.limit=${limit}`, async () => {
        const error = await expectClientError(
          await domainSearch.suggestDomains({ query: QUERIES.default, paging: { limit } }),
        );
        expect(violatedFields(error)).toContain(VIOLATION_FIELDS.pagingLimit);
      });
    }
  });

  test('SD-18 pages through every result', { tag: '@sanity' }, async ({ domainSearch }) => {
    const pages = await fetchAllPages(domainSearch, QUERIES.default, PAGE_SIZES.pageWalk);

    for (const { suggestions, pagingMetadata } of pages) {
      expect(suggestions.length).toBeLessThanOrEqual(PAGE_SIZES.pageWalk);
      expect(pagingMetadata.count).toBe(suggestions.length);
    }
    const domains = pages.flatMap((page) => page.suggestions.map((s) => s.domain));
    expect(new Set(domains).size, 'no domain appears on two pages').toBe(domains.length);
    const lastPage = pages.length - 1;
    const expectedHasNext = pages.map((_, index) => index < lastPage);
    expect(pages.map((page) => page.pagingMetadata.hasNext)).toEqual(expectedHasNext);
  });

  test('SD-19 rejects an invalid cursor', { tag: '@edge' }, async ({ domainSearch }) => {
    await expectClientError(
      await domainSearch.suggestDomains({
        query: QUERIES.default,
        paging: { cursor: INVALID_CURSOR },
      }),
    );
  });

  test('SD-20 rejects a cursor from another query', { tag: '@edge' }, async ({ domainSearch }) => {
    const firstPage = await expectSuccess(
      await domainSearch.suggestDomains({
        query: QUERIES.default,
        paging: { limit: PAGE_SIZES.cursorSource },
      }),
      suggestDomainsResponseSchema,
    );
    const cursor = firstPage.pagingMetadata.cursors.next;
    expect(cursor, `"${QUERIES.default}" returned no next cursor`).toBeDefined();

    const body = await expectNoServerError(
      await domainSearch.suggestDomains({ query: QUERIES.other, paging: { cursor } }),
      suggestDomainsResponseSchema,
    );
    for (const domain of returnedDomains(body)) {
      expect(
        domain,
        `a "${QUERIES.other}" request returned a "${QUERIES.default}" result`,
      ).not.toContain(QUERIES.default);
    }
  });

  test(
    'SD-21 requires a valid API key',
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
          const response = await client.suggestDomains({ query: QUERIES.default });
          await expectClientError(response);
          const leaked = suggestDomainsResponseSchema.safeParse(await response.json());
          expect(leaked.success, 'the body contains suggestions').toBe(false);
        });
      }
    },
  );
});
