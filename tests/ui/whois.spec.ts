import { BAD_INPUTS, KNOWN_DOMAINS, WHOIS_INPUTS, titleFor } from '../../src/fixtures/testData';
import { expect, test } from '../../src/fixtures/ui.fixture';
import { PATHS, RESULT_QUERY_PARAMS } from '../../src/ui/paths';

// K1 is covered by WH-01.
const OTHER_KNOWN_DOMAINS = KNOWN_DOMAINS.filter(({ id }) => id !== 'K1');

test.describe('WHOIS Lookup', () => {
  test.describe('WH-03 registered domains show their WHOIS sections', () => {
    for (const { id, domain } of OTHER_KNOWN_DOMAINS) {
      test(`${id} ${domain}`, { tag: '@sanity' }, async ({ whoisLookupPage, whoisResultsPage }) => {
        await whoisLookupPage.goto();
        await whoisLookupPage.lookUp(domain);
        await whoisResultsPage.waitForLoad();
        await whoisResultsPage.waitForWhoisInformation(domain);

        await expect(whoisResultsPage.domainInformation).toBeVisible();
        await expect(whoisResultsPage.registrarInformation).toBeVisible();
        await expect(whoisResultsPage.registrantContactInformation).toBeVisible();
      });
    }
  });

  test(
    'WH-04 a URL is looked up by its domain',
    { tag: '@sanity' },
    async ({ page, whoisLookupPage, whoisResultsPage }) => {
      await whoisLookupPage.goto();
      await whoisLookupPage.lookUp(WHOIS_INPUTS.url);
      await whoisResultsPage.waitForLoad();

      const url = new URL(page.url());
      expect(url.pathname).toBe(PATHS.whoisResults);
      expect(url.searchParams.get(RESULT_QUERY_PARAMS.whoisResults)).toBe(WHOIS_INPUTS.urlDomain);
      await whoisResultsPage.waitForWhoisInformation(WHOIS_INPUTS.urlDomain);
      await expect(whoisResultsPage.registrarInformation).toBeVisible();
    },
  );

  test.describe('WH-07 bad input is cleanly rejected', () => {
    for (const { id, input } of BAD_INPUTS) {
      test(`${id} ${titleFor(input)}`, { tag: '@edge' }, async ({ page, whoisLookupPage }) => {
        await whoisLookupPage.goto();
        await whoisLookupPage.submit(input);

        // Soft, so one run reports every part of the proposed clean rejection.
        await expect.soft(whoisLookupPage.validationMessage, 'a clear message').toBeVisible();
        await expect.soft(whoisLookupPage.searchBox, "the user's text is kept").toHaveValue(input);
        await expect
          .soft(page, 'no results page opens, so nothing is offered')
          .toHaveURL((url) => url.pathname === PATHS.whoisLookup);
      });
    }
  });
});
