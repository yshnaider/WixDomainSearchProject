import type { APIResponse } from '@playwright/test';
import type { DomainSearch } from '../../src/api/domainSearch/DomainSearch';
import {
  apiErrorSchema,
  suggestDomainsResponseSchema,
  type ApiError,
  type SuggestDomainsResponse,
} from '../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../src/api/parseResponse';
import { getApiEnv } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/api.fixture';

const QUERY = 'sunnybakery';
const VALID_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const MAX_PAGES = 20;

const domainName = (domain: string) => domain.slice(0, domain.indexOf('.'));

const violatedFields = (error: ApiError) =>
  error.details.validationError?.fieldViolations.map((violation) => violation.field) ?? [];

const returnedDomains = (body: SuggestDomainsResponse | ApiError) =>
  'suggestions' in body ? body.suggestions.map((suggestion) => suggestion.domain) : [];

const describeResponse = async (response: APIResponse) =>
  `got ${response.status()}: ${(await response.text()) || '(empty body)'}`;

async function expectSuccess(response: APIResponse): Promise<SuggestDomainsResponse> {
  expect(response.status(), `expected 200, ${await describeResponse(response)}`).toBe(200);
  return parseResponse(response, suggestDomainsResponseSchema);
}

async function expectClientError(response: APIResponse): Promise<ApiError> {
  const status = response.status();
  expect(status >= 400 && status < 500, `expected 4xx, ${await describeResponse(response)}`).toBe(
    true,
  );
  return parseResponse(response, apiErrorSchema);
}

/** Accepts either a success or a 4xx body, for rows where both outcomes are allowed. */
async function expectNoServerError(response: APIResponse) {
  expect(response.status(), `expected no 5xx, ${await describeResponse(response)}`).toBeLessThan(
    500,
  );
  return parseResponse(response, suggestDomainsResponseSchema.or(apiErrorSchema));
}

async function fetchAllPages(domainSearch: DomainSearch, query: string, limit: number) {
  const pages: SuggestDomainsResponse[] = [];
  let cursor: string | undefined;
  do {
    pages.push(
      await expectSuccess(await domainSearch.suggestDomains({ query, paging: { limit, cursor } })),
    );
    if (pages.length > MAX_PAGES) {
      throw new Error(`Stopped after ${MAX_PAGES} pages of "${query}": cursors.next never ran out`);
    }
    cursor = pages.at(-1)?.pagingMetadata.cursors.next;
  } while (cursor);
  return pages;
}

test.describe('suggest-domains', () => {
  test('SD-01 returns a page of suggestions', { tag: '@smoke' }, async ({ domainSearch }) => {
    const body = await expectSuccess(
      await domainSearch.suggestDomains({ query: QUERY, paging: { limit: 10 } }),
    );

    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(body.suggestions.length).toBeLessThanOrEqual(10);
    expect(body.pagingMetadata.count).toBe(body.suggestions.length);
  });

  test('SD-02 returns suggestions without prices', { tag: '@sanity' }, async ({ domainSearch }) => {
    const response = await domainSearch.suggestDomains({ query: QUERY, paging: { limit: 10 } });

    const body = await expectSuccess(response);
    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(await response.text(), 'no response key mentions a price').not.toMatch(
      /"[^"]*price[^"]*":/i,
    );
  });

  test('SD-03 accepts a 1-character query', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectSuccess(await domainSearch.suggestDomains({ query: 'a' }));

    expect(body.pagingMetadata.count).toBe(body.suggestions.length);
  });

  test('SD-04 accepts a 100-character query', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectSuccess(await domainSearch.suggestDomains({ query: 'a'.repeat(100) }));

    expect(body.pagingMetadata.count).toBe(body.suggestions.length);
  });

  test('SD-05 rejects a 101-character query', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(
      await domainSearch.suggestDomains({ query: 'a'.repeat(101) }),
    );

    expect(violatedFields(error)).toContain('query');
  });

  test('SD-06 rejects an empty or missing query', { tag: '@edge' }, async ({ domainSearch }) => {
    await test.step('empty query', async () => {
      const error = await expectClientError(await domainSearch.suggestDomains({ query: '' }));
      expect(violatedFields(error)).toContain('query');
    });

    await test.step('no query parameter', async () => {
      const error = await expectClientError(
        await domainSearch.suggestDomainsRaw('paging.limit=10'),
      );
      expect(violatedFields(error)).toContain('query');
    });
  });

  test('SD-07 rejects a spaces-only query', { tag: '@edge' }, async ({ domainSearch }) => {
    const error = await expectClientError(await domainSearch.suggestDomains({ query: '   ' }));

    expect(error.message).not.toBe('');
  });

  test(
    'SD-09 handles Unicode and special characters',
    { tag: '@edge' },
    async ({ domainSearch }) => {
      for (const query of ['café', 'Bread & Butter']) {
        await test.step(query, async () => {
          const body = await expectNoServerError(await domainSearch.suggestDomains({ query }));
          for (const domain of returnedDomains(body)) {
            expect(domain).toMatch(VALID_DOMAIN);
          }
        });
      }
    },
  );

  test('SD-10 returns only the requested TLDs', { tag: '@sanity' }, async ({ domainSearch }) => {
    const body = await expectSuccess(
      await domainSearch.suggestDomains({ query: QUERY, tlds: ['com', 'net'] }),
    );

    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    for (const { domain } of body.suggestions) {
      expect(domain).toMatch(/\.(com|net)$/);
    }
  });

  test('SD-11 filters by a multi-level TLD', { tag: '@edge' }, async ({ domainSearch }) => {
    const body = await expectNoServerError(
      await domainSearch.suggestDomains({ query: QUERY, tlds: ['co.il'] }),
    );

    for (const domain of returnedDomains(body)) {
      expect(domain).toMatch(/\.co\.il$/);
    }
  });

  test(
    'SD-10 returns only .net for a single tlds[]=net',
    { tag: '@sanity' },
    async ({ domainSearch }) => {
      const body = await expectSuccess(
        await domainSearch.suggestDomains({ query: QUERY, tlds: ['net'] }),
      );

      expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
      const otherTlds = body.suggestions.map((s) => s.domain).filter((d) => !d.endsWith('.net'));
      expect(otherTlds, 'suggestions outside the requested .net').toEqual([]);
    },
  );

  test('SD-12 ignores an encoded tlds key', { tag: '@edge' }, async ({ domainSearch }) => {
    // Control: the raw key filters. Uses com, the only TLD the filter honors today.
    await test.step('raw tlds[]=com filters', async () => {
      const body = await expectSuccess(
        await domainSearch.suggestDomainsRaw(`query=${QUERY}&tlds[]=com`),
      );
      expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
      const otherTlds = body.suggestions.map((s) => s.domain).filter((d) => !d.endsWith('.com'));
      expect(otherTlds, 'raw tlds[]=com returned other TLDs').toEqual([]);
    });

    await test.step('encoded tlds%5B%5D=com is ignored', async () => {
      const body = await expectSuccess(
        await domainSearch.suggestDomainsRaw(`query=${QUERY}&tlds%5B%5D=com`),
      );
      const domains = body.suggestions.map((s) => s.domain);
      expect(
        domains.some((d) => !d.endsWith('.com')),
        `encoded key filtered to .com anyway: ${domains.join(', ')}`,
      ).toBe(true);
    });
  });

  test(
    'SD-13 rejects unsupported and malformed TLDs',
    { tag: '@edge' },
    async ({ domainSearch }) => {
      const cases = [
        { tld: 'notarealtld', code: 'TLD_NOT_SUPPORTED' },
        { tld: '.com', code: 'INVALID_TLD_FORMAT' },
      ];
      for (const { tld, code } of cases) {
        await test.step(tld, async () => {
          const response = await domainSearch.suggestDomains({ query: QUERY, tlds: [tld] });
          expect(response.status()).toBe(400);
          const error = await parseResponse(response, apiErrorSchema);
          expect(error.message).toBe(code);
          expect(violatedFields(error)).toContain('tlds');
        });
      }
    },
  );

  test('SD-14 respects maxLength', { tag: '@sanity' }, async ({ domainSearch }) => {
    // Suggestions are never shorter than the query, so maxLength must not be below its length.
    const maxLength = 12;
    const body = await expectSuccess(
      await domainSearch.suggestDomains({ query: QUERY, maxLength }),
    );

    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    for (const { domain } of body.suggestions) {
      expect(domainName(domain).length, domain).toBeLessThanOrEqual(maxLength);
    }
  });

  test('SD-15 rejects an invalid maxLength', { tag: '@edge' }, async ({ domainSearch }) => {
    for (const maxLength of ['0', '-1', 'abc']) {
      await test.step(`maxLength=${maxLength}`, async () => {
        await expectClientError(
          await domainSearch.suggestDomainsRaw(`query=${QUERY}&maxLength=${maxLength}`),
        );
      });
    }
  });

  test('SD-16 accepts the paging.limit boundaries', { tag: '@edge' }, async ({ domainSearch }) => {
    for (const limit of [1, 50]) {
      await test.step(`paging.limit=${limit}`, async () => {
        const body = await expectSuccess(
          await domainSearch.suggestDomains({ query: QUERY, paging: { limit } }),
        );
        expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
        expect(body.suggestions.length).toBeLessThanOrEqual(limit);
        expect(body.pagingMetadata.count).toBe(body.suggestions.length);
      });
    }
  });

  test('SD-17 rejects an out-of-range paging.limit', { tag: '@edge' }, async ({ domainSearch }) => {
    for (const limit of [0, 51]) {
      await test.step(`paging.limit=${limit}`, async () => {
        const error = await expectClientError(
          await domainSearch.suggestDomains({ query: QUERY, paging: { limit } }),
        );
        expect(violatedFields(error)).toContain('paging.limit');
      });
    }
  });

  test('SD-18 pages through every result', { tag: '@sanity' }, async ({ domainSearch }) => {
    const limit = 5;
    const pages = await fetchAllPages(domainSearch, QUERY, limit);

    for (const { suggestions, pagingMetadata } of pages) {
      expect(suggestions.length).toBeLessThanOrEqual(limit);
      expect(pagingMetadata.count).toBe(suggestions.length);
    }
    const domains = pages.flatMap((page) => page.suggestions.map((s) => s.domain));
    expect(new Set(domains).size, 'no domain appears on two pages').toBe(domains.length);
    const expectedHasNext = pages.map((_, index) => index < pages.length - 1);
    expect(pages.map((page) => page.pagingMetadata.hasNext)).toEqual(expectedHasNext);
  });

  test('SD-19 rejects an invalid cursor', { tag: '@edge' }, async ({ domainSearch }) => {
    await expectClientError(
      await domainSearch.suggestDomains({ query: QUERY, paging: { cursor: 'garbage' } }),
    );
  });

  test('SD-20 rejects a cursor from another query', { tag: '@edge' }, async ({ domainSearch }) => {
    const firstPage = await expectSuccess(
      await domainSearch.suggestDomains({ query: QUERY, paging: { limit: 2 } }),
    );
    const cursor = firstPage.pagingMetadata.cursors.next;
    expect(cursor, `"${QUERY}" with paging.limit=2 returned no next cursor`).toBeDefined();

    const body = await expectNoServerError(
      await domainSearch.suggestDomains({ query: 'greenleaf', paging: { cursor } }),
    );
    for (const domain of returnedDomains(body)) {
      expect(domain, 'a greenleaf request returned a sunnybakery result').not.toContain(QUERY);
    }
  });

  test(
    'SD-21 requires a valid API key',
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
          const response = await client.suggestDomains({ query: QUERY });
          await expectClientError(response);
          expect(await response.text()).not.toContain('"suggestions"');
        });
      }
    },
  );
});
