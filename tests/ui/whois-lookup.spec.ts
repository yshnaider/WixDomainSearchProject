import { checkDomainAvailabilityResponseSchema } from '../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../src/api/parseResponse';
import { generateUnregisteredDomain } from '../../src/api/registry/registry';
import { MIN_RESULTS, knownDomain } from '../../src/fixtures/testData';
import { expect, test } from '../../src/fixtures/ui.fixture';
import { DomainOfferCard } from '../../src/ui/components/DomainOfferCard';
import { PATHS, RESULT_QUERY_PARAMS } from '../../src/ui/paths';

const REGISTERED_DOMAIN = knownDomain('K1');

test.describe('WHOIS Lookup', () => {
  test(
    'searching a registered domain shows its WHOIS sections',
    { tag: '@sanity' },
    async ({ whoisLookupPage, whoisResultsPage }) => {
      await whoisLookupPage.goto();
      await whoisLookupPage.lookUp(REGISTERED_DOMAIN);
      await whoisResultsPage.waitForLoad();
      await whoisResultsPage.waitForWhoisInformation(REGISTERED_DOMAIN);

      await expect(whoisResultsPage.domainHeading(REGISTERED_DOMAIN)).toBeVisible();
      await expect(whoisResultsPage.domainInformation).toBeVisible();
      await expect(whoisResultsPage.registrarInformation).toBeVisible();
      await expect(whoisResultsPage.registrantContactInformation).toBeVisible();
      await expect(whoisResultsPage.search.input).toHaveValue(REGISTERED_DOMAIN);
    },
  );

  test(
    'a registered domain shows priced alternatives with Get It',
    { tag: '@sanity' },
    async ({ whoisResultsPage, apiTraffic }) => {
      const availabilityResponse = apiTraffic.waitForResponse('checkDomainAvailability');
      await whoisResultsPage.goto(REGISTERED_DOMAIN);

      const { availability } = await parseResponse(
        await availabilityResponse,
        checkDomainAvailabilityResponseSchema,
      );
      expect(availability.available, 'the page checked a registered domain').toBe(false);

      const offers = await whoisResultsPage.offers();
      expect(offers.length).toBeGreaterThanOrEqual(MIN_RESULTS);
      for (const offer of offers) {
        await expect(offer.domain).toBeVisible();
        await expect(offer.prices).toHaveCount(DomainOfferCard.PRICES_SHOWN);
        await expect(offer.purchaseButton).toBeVisible();
      }
    },
  );

  test(
    'an available domain leads to the domain results page',
    { tag: '@sanity' },
    async ({ page, whoisLookupPage }) => {
      const domain = await generateUnregisteredDomain();

      await whoisLookupPage.goto();
      await whoisLookupPage.lookUp(domain);

      // The redirect follows the page's own availability check, and the query is added just after
      // the path changes, so wait for both.
      await page.waitForURL(
        (url) =>
          url.pathname === PATHS.domainResults &&
          url.searchParams.has(RESULT_QUERY_PARAMS.domainResults),
      );

      const url = new URL(page.url());
      expect(url.searchParams.get(RESULT_QUERY_PARAMS.domainResults)).toBe(domain);
    },
  );
});
