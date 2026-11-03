import { SUGGEST_DOMAINS_PARAMS } from '../../src/api/domainSearch/DomainSearch';
import {
  checkDomainAvailabilityResponseSchema,
  suggestDomainsResponseSchema,
} from '../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../src/api/parseResponse';
import { generateUnregisteredDomain } from '../../src/api/registry/registry';
import { MIN_RESULTS, knownDomain } from '../../src/fixtures/testData';
import { expect, test } from '../../src/fixtures/ui.fixture';
import { DomainOfferCard } from '../../src/ui/components/DomainOfferCard';

const REGISTERED_DOMAIN = knownDomain('K1');

async function expectPriced(card: DomainOfferCard) {
  await expect(card.domain).toBeVisible();
  await expect(card.prices).toHaveCount(DomainOfferCard.PRICES_SHOWN);
  await expect(card.purchaseButton).toBeVisible();
}

test.describe('Domain results', () => {
  test(
    'an available domain shows the exact match first, with prices',
    { tag: '@sanity' },
    async ({ domainResultsPage, apiTraffic }) => {
      const domain = await generateUnregisteredDomain();
      const availabilityResponse = apiTraffic.waitForResponse('checkDomainAvailability');
      await domainResultsPage.goto(domain);

      const { availability } = await parseResponse(
        await availabilityResponse,
        checkDomainAvailabilityResponseSchema,
      );
      expect(availability.available, `${domain} is unregistered per RDAP`).toBe(true);

      const exactMatch = domainResultsPage.exactMatch();
      await expect(exactMatch.domain).toHaveText(domain);
      await expectPriced(exactMatch);
      await expect(domainResultsPage.alternativesHeading).toBeVisible();
    },
  );

  test(
    'a registered domain shows alternatives instead of an exact match',
    { tag: '@sanity' },
    async ({ domainResultsPage }) => {
      await domainResultsPage.goto(REGISTERED_DOMAIN);

      await expect(domainResultsPage.registeredMessage).toContainText(REGISTERED_DOMAIN);
      await expect(domainResultsPage.exactMatchCard).toHaveCount(0);
      const alternatives = await domainResultsPage.alternatives();
      expect(alternatives.length).toBeGreaterThanOrEqual(MIN_RESULTS);
      for (const card of alternatives) {
        await expectPriced(card);
      }
    },
  );

  test(
    'show more adds the next page of alternatives',
    { tag: '@sanity' },
    async ({ domainResultsPage, apiTraffic }) => {
      const domain = await generateUnregisteredDomain();
      const firstPageResponse = apiTraffic.waitForResponse('suggestDomains');
      await domainResultsPage.goto(domain);
      const firstPage = await parseResponse(await firstPageResponse, suggestDomainsResponseSchema);
      const { count, hasNext } = firstPage.pagingMetadata;
      await expect(domainResultsPage.showMoreButton, 'Show more follows hasNext').toBeVisible({
        visible: hasNext,
      });
      expect(hasNext, `precondition: the first page (${count} results) has a next page`).toBe(true);
      const shownBefore = await domainResultsPage.alternativeCards.count();

      const nextPageResponse = apiTraffic.waitForResponse('suggestDomains');
      await domainResultsPage.showMore();
      const nextPageUrl = new URL((await nextPageResponse).url());

      expect(nextPageUrl.searchParams.get(SUGGEST_DOMAINS_PARAMS.pagingCursor)).toBe(
        firstPage.pagingMetadata.cursors.next,
      );
      const alternatives = await domainResultsPage.alternatives();
      expect(alternatives.length).toBeGreaterThan(shownBefore);
      const domains = await Promise.all(alternatives.map((card) => card.domain.innerText()));
      expect(new Set(domains).size, 'no alternative is shown twice').toBe(domains.length);
    },
  );
});
