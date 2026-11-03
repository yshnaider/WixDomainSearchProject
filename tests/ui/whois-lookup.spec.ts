import { checkDomainAvailabilityResponseSchema } from '../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../src/api/parseResponse';
import { generateUnregisteredDomain } from '../../src/api/registry/registry';
import { MIN_RESULTS, knownDomain } from '../../src/fixtures/testData';
import { expect, test } from '../../src/fixtures/ui.fixture';
import { PATHS, RESULT_QUERY_PARAMS } from '../../src/ui/paths';

const REGISTERED_DOMAIN = knownDomain('K1');
const PRICES_PER_OFFER = 2;

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
      await expect(whoisResultsPage.searchBox).toHaveValue(REGISTERED_DOMAIN);
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
        await expect(offer.prices).toHaveCount(PRICES_PER_OFFER);
        await expect(offer.getItButton).toBeVisible();
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

      // The redirect follows the page's own availability check, so wait for the navigation.
      await page.waitForURL((url) => url.pathname === PATHS.domainResults);

      const url = new URL(page.url());
      expect(url.searchParams.get(RESULT_QUERY_PARAMS.domainResults)).toBe(domain);
    },
  );
});
