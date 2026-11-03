import { suggestDomainsResponseSchema } from '../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../src/api/parseResponse';
import { expect, test } from '../../src/fixtures/api.fixture';

const domainName = (domain: string) => domain.slice(0, domain.indexOf('.'));

test.describe('suggest-domains', () => {
  test('SD-02 returns suggestions without prices', { tag: '@sanity' }, async ({ domainSearch }) => {
    const response = await domainSearch.suggestDomains({
      query: 'sunnybakery',
      paging: { limit: 10 },
    });

    expect(response.status()).toBe(200);
    const body = await parseResponse(response, suggestDomainsResponseSchema);
    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(body.suggestions.length).toBeLessThanOrEqual(10);
    expect(await response.text(), 'no response key mentions a price').not.toMatch(
      /"[^"]*price[^"]*":/i,
    );
  });

  test('SD-10 returns only the requested TLDs', { tag: '@sanity' }, async ({ domainSearch }) => {
    const response = await domainSearch.suggestDomains({
      query: 'sunnybakery',
      tlds: ['com', 'net'],
    });

    expect(response.status()).toBe(200);
    const body = await parseResponse(response, suggestDomainsResponseSchema);
    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    for (const { domain } of body.suggestions) {
      expect(domain).toMatch(/\.(com|net)$/);
    }
  });

  test('SD-14 respects maxLength', { tag: '@sanity' }, async ({ domainSearch }) => {
    // Suggestions are never shorter than the query, so maxLength must not be below its length.
    const maxLength = 12;
    const response = await domainSearch.suggestDomains({ query: 'sunnybakery', maxLength });

    expect(response.status()).toBe(200);
    const body = await parseResponse(response, suggestDomainsResponseSchema);
    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    for (const { domain } of body.suggestions) {
      expect(domainName(domain).length, domain).toBeLessThanOrEqual(maxLength);
    }
  });
});
