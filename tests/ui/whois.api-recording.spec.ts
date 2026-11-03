import {
  CHECK_DOMAIN_AVAILABILITY_PARAMS,
  SUGGEST_DOMAINS_PARAMS,
} from '../../src/api/domainSearch/DomainSearch';
import {
  checkDomainAvailabilityResponseSchema,
  suggestDomainsResponseSchema,
} from '../../src/api/domainSearch/domainSearch.schemas';
import {
  structuredDomainInfoResponseSchema,
  suggestedTldDisplayPricesResponseSchema,
} from '../../src/api/domainsServerless/domainsServerless.schemas';
import { HTTP_STATUS } from '../../src/api/httpStatus';
import { parseResponse } from '../../src/api/parseResponse';
import { generateUnregisteredDomain } from '../../src/api/registry/registry';
import {
  DOMAINS,
  MIN_RESULTS,
  SLOW_RESPONSE_MS,
  STUB_BODIES,
  WHOIS_INPUTS,
  knownDomain,
} from '../../src/fixtures/testData';
import { expect, test } from '../../src/fixtures/ui.fixture';
import type { ApiStubs } from '../../src/ui/ApiStubs';
import type { ApiTraffic } from '../../src/ui/ApiTraffic';
import type { DomainResultsPage } from '../../src/ui/pages/DomainResultsPage';
import type { WhoisLookupPage } from '../../src/ui/pages/WhoisLookupPage';
import { WhoisResultsPage } from '../../src/ui/pages/WhoisResultsPage';
import { PATHS, RESULT_QUERY_PARAMS } from '../../src/ui/paths';
import { domainsOf, expectPricedByTld } from './support/integrity';

const REGISTERED_DOMAIN = knownDomain('K1');
const PUNYCODE_DOMAIN = knownDomain('K5');

const checksDomain = (domain: string) => (url: URL) =>
  url.searchParams.get(CHECK_DOMAIN_AVAILABILITY_PARAMS.domain) === domain;
const isNextPage = (url: URL) => url.searchParams.has(SUGGEST_DOMAINS_PARAMS.pagingCursor);

type LookupState = 'registered' | 'available';

interface Pages {
  whoisLookupPage: WhoisLookupPage;
  whoisResultsPage: WhoisResultsPage;
  domainResultsPage: DomainResultsPage;
}

/** Looks up an available domain, and waits for the results page WHOIS redirects to. */
async function lookUpAvailable(
  { whoisLookupPage, domainResultsPage }: Omit<Pages, 'whoisResultsPage'>,
  domain: string,
): Promise<void> {
  await whoisLookupPage.goto();
  await whoisLookupPage.lookUp(domain);
  await domainResultsPage.waitForResults(domain);
}

/** Looks up an input, and reports which state the lookup settled in. */
async function lookUpState(pages: Pages, input: string): Promise<LookupState> {
  await pages.whoisLookupPage.goto();
  await pages.whoisLookupPage.lookUp(input);
  const registered = pages.whoisResultsPage.registrarInformation;
  await registered.or(pages.domainResultsPage.exactMatchCard).first().waitFor();
  return (await registered.isVisible()) ? 'registered' : 'available';
}

async function lastPrices(apiTraffic: ApiTraffic) {
  return parseResponse(
    apiTraffic.lastCall('suggestedTldDisplayPrices').response,
    suggestedTldDisplayPricesResponseSchema,
  );
}

async function lastSuggestions(apiTraffic: ApiTraffic) {
  return parseResponse(
    apiTraffic.lastCall('suggestDomains').response,
    suggestDomainsResponseSchema,
  );
}

async function stubFailure(
  apiStubs: ApiStubs,
  endpoint: Parameters<ApiStubs['respond']>[0],
  failure: string,
): Promise<void> {
  switch (failure) {
    case '500':
      return apiStubs.respond(endpoint, {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: STUB_BODIES.error,
      });
    case '429':
      return apiStubs.respond(endpoint, {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        body: STUB_BODIES.error,
      });
    case 'timeout':
      return apiStubs.fail(endpoint, 'timedout');
    case 'invalid JSON':
      return apiStubs.respond(endpoint, { status: HTTP_STATUS.OK, body: STUB_BODIES.invalidJson });
    default:
      throw new Error(`Unknown failure "${failure}"`);
  }
}

const withoutOwnerData = (body: unknown) => {
  const parsed = structuredDomainInfoResponseSchema.parse(body);
  return { ...parsed, info: { ...parsed.info, registrant: {} } };
};

test.describe('WHOIS Lookup (API recording)', () => {
  test(
    'WH-01 a registered domain shows its WHOIS sections and priced alternatives',
    { tag: '@smoke' },
    async ({ whoisLookupPage, whoisResultsPage, apiTraffic }) => {
      await whoisLookupPage.goto();
      await whoisLookupPage.lookUp(REGISTERED_DOMAIN);
      await whoisResultsPage.waitForLoad();
      await whoisResultsPage.waitForWhoisInformation(REGISTERED_DOMAIN);
      const offers = await whoisResultsPage.offers();

      const { availability } = await parseResponse(
        apiTraffic.lastCall('checkDomainAvailability', checksDomain(REGISTERED_DOMAIN)).response,
        checkDomainAvailabilityResponseSchema,
      );
      expect(availability.available).toBe(false);

      const { info } = await parseResponse(
        apiTraffic.lastCall('parseRdap').response,
        structuredDomainInfoResponseSchema,
      );
      expect(info.registrar.name, 'parse-rdap returns a registrar').toBeTruthy();
      await expect(whoisResultsPage.registrarSection).toContainText(info.registrar.name ?? '');
      for (const nameserver of info.domainInfo.nameservers) {
        await expect(whoisResultsPage.domainSection).toContainText(nameserver.toLowerCase());
      }
      await expect(whoisResultsPage.rawRegistryData).toBeVisible();

      expect(offers.length).toBeGreaterThanOrEqual(MIN_RESULTS);
      const suggestions = await lastSuggestions(apiTraffic);
      expect((await domainsOf(offers)).sort()).toEqual(
        suggestions.suggestions.map((s) => s.domain).sort(),
      );
      const prices = await lastPrices(apiTraffic);
      for (const offer of offers) {
        await expectPricedByTld(offer, prices);
      }
    },
  );

  test(
    'WH-02 an available domain leads to its exact match and priced alternatives',
    { tag: '@smoke' },
    async ({ whoisLookupPage, domainResultsPage, apiTraffic }) => {
      const domain = await generateUnregisteredDomain();
      await lookUpAvailable({ whoisLookupPage, domainResultsPage }, domain);

      const { availability } = await parseResponse(
        apiTraffic.lastCall('checkDomainAvailability', checksDomain(domain)).response,
        checkDomainAvailabilityResponseSchema,
      );
      expect(availability.available).toBe(true);

      const exactMatch = domainResultsPage.exactMatch();
      await expect(exactMatch.domain).toHaveText(domain);
      const alternatives = await domainResultsPage.alternatives();
      expect(alternatives.length).toBeGreaterThanOrEqual(MIN_RESULTS);

      const suggestions = await lastSuggestions(apiTraffic);
      expect([domain, ...(await domainsOf(alternatives))].sort()).toEqual(
        suggestions.suggestions.map((s) => s.domain).sort(),
      );
      const prices = await lastPrices(apiTraffic);
      for (const card of [exactMatch, ...alternatives]) {
        await expectPricedByTld(card, prices);
      }
    },
  );

  test(
    'WH-05 load more follows the paging rules',
    { tag: '@sanity' },
    async ({ whoisLookupPage, domainResultsPage, apiTraffic }) => {
      const domain = await generateUnregisteredDomain();
      await lookUpAvailable({ whoisLookupPage, domainResultsPage }, domain);
      const firstPage = await lastSuggestions(apiTraffic);
      const { count, hasNext } = firstPage.pagingMetadata;
      await expect(domainResultsPage.showMoreButton, 'Show more follows hasNext').toBeVisible({
        visible: hasNext,
      });
      expect(hasNext, `precondition: the first page (${count} results) has a next page`).toBe(true);
      const shownBefore = await domainResultsPage.alternativeCards.count();

      const nextPageResponse = apiTraffic.waitForResponse('suggestDomains', isNextPage);
      await domainResultsPage.showMore();
      const response = await nextPageResponse;
      const nextPage = await parseResponse(response, suggestDomainsResponseSchema);
      const nextPageUrl = new URL(response.url());

      expect(nextPageUrl.searchParams.get(SUGGEST_DOMAINS_PARAMS.pagingCursor)).toBe(
        firstPage.pagingMetadata.cursors.next,
      );
      expect(nextPage.suggestions.length).toBeLessThanOrEqual(
        Number(nextPageUrl.searchParams.get(SUGGEST_DOMAINS_PARAMS.pagingLimit)),
      );
      await expect(domainResultsPage.alternativeCards).toHaveCount(
        shownBefore + nextPage.pagingMetadata.count,
      );
      const alternatives = await domainResultsPage.alternatives();
      const domains = await domainsOf(alternatives);
      expect(new Set(domains).size, 'no alternative is shown twice').toBe(domains.length);
      const prices = await lastPrices(apiTraffic);
      for (const card of alternatives) {
        await expectPricedByTld(card, prices);
      }
    },
  );

  test(
    'WH-06 mixed case matches the lowercase lookup',
    { tag: '@edge' },
    async ({ whoisLookupPage, whoisResultsPage, domainResultsPage }) => {
      const pages = { whoisLookupPage, whoisResultsPage, domainResultsPage };
      const lowercase = await lookUpState(pages, WHOIS_INPUTS.q1);
      const mixedCase = await lookUpState(pages, WHOIS_INPUTS.mixedCaseQ1);

      expect(mixedCase).toBe(lowercase);
    },
  );

  test(
    'WH-06 an uppercase registered domain matches its lowercase state',
    { tag: '@edge' },
    async ({ whoisLookupPage, whoisResultsPage, domainResultsPage }) => {
      const pages = { whoisLookupPage, whoisResultsPage, domainResultsPage };
      const lowercase = await lookUpState(pages, REGISTERED_DOMAIN);
      const uppercase = await lookUpState(pages, REGISTERED_DOMAIN.toUpperCase());

      expect(lowercase).toBe('registered');
      expect(uppercase).toBe(lowercase);
    },
  );

  test(
    'WH-06 Unicode and punycode both check the punycode domain',
    { tag: '@edge' },
    async ({ whoisLookupPage, whoisResultsPage, domainResultsPage, apiTraffic }) => {
      const pages = { whoisLookupPage, whoisResultsPage, domainResultsPage };
      const states: LookupState[] = [];
      for (const input of [DOMAINS.unicode, PUNYCODE_DOMAIN]) {
        const check = apiTraffic.waitForResponse('checkDomainAvailability');
        states.push(await lookUpState(pages, input));
        const checked = new URL((await check).url());
        expect(checked.searchParams.get(CHECK_DOMAIN_AVAILABILITY_PARAMS.domain), input).toBe(
          PUNYCODE_DOMAIN,
        );
      }
      expect(states[0]).toBe(states[1]);
    },
  );

  test(
    'WH-08 missing owner data is marked, and the rest still shows',
    { tag: '@failure' },
    async ({ whoisLookupPage, whoisResultsPage, apiStubs }) => {
      await apiStubs.rewrite('parseRdap', withoutOwnerData);
      await whoisLookupPage.goto();
      await whoisLookupPage.lookUp(REGISTERED_DOMAIN);
      await whoisResultsPage.waitForLoad();
      await whoisResultsPage.waitForWhoisInformation(REGISTERED_DOMAIN);

      await expect(whoisResultsPage.registrantSection).toContainText(
        WhoisResultsPage.MISSING_VALUE,
      );
      await expect(whoisResultsPage.domainInformation).toBeVisible();
      await expect(whoisResultsPage.brokerBanner, 'availability is still shown').toBeVisible();
    },
  );

  test.describe('WH-09 failed WHOIS data shows a message, and alternatives still show', () => {
    const cases = [
      { endpoint: 'parseRdap', failure: '500' },
      { endpoint: 'parseRdap', failure: 'timeout' },
      { endpoint: 'whois', failure: '500' },
      { endpoint: 'whois', failure: 'timeout' },
    ] as const;
    for (const { endpoint, failure } of cases) {
      test(
        `${endpoint} ${failure}`,
        { tag: '@failure' },
        async ({ whoisLookupPage, whoisResultsPage, apiStubs }) => {
          await stubFailure(apiStubs, endpoint, failure);
          await whoisLookupPage.goto();
          await whoisLookupPage.lookUp(REGISTERED_DOMAIN);
          await whoisResultsPage.waitForLoad();

          const offers = await whoisResultsPage.offers();
          expect(offers.length).toBeGreaterThanOrEqual(MIN_RESULTS);
          await expect(
            whoisResultsPage.errorMessage,
            'a message in place of the data',
          ).toBeVisible();
        },
      );
    }
  });

  test.describe('WH-10 a failed availability check is cleanly rejected', () => {
    for (const failure of ['500', '429', 'timeout', 'invalid JSON']) {
      test(
        failure,
        { tag: '@failure' },
        async ({ page, whoisLookupPage, whoisResultsPage, apiStubs }) => {
          await stubFailure(apiStubs, 'checkDomainAvailability', failure);
          await whoisLookupPage.goto();
          await whoisLookupPage.lookUp(REGISTERED_DOMAIN);
          await whoisResultsPage.waitForLoad();

          // Soft, so one run reports every part of the proposed clean rejection.
          await expect.soft(whoisResultsPage.errorMessage, 'a clear message').toBeVisible();
          await expect
            .soft(whoisResultsPage.registrarInformation, 'no registered state')
            .toBeHidden();
          await expect
            .soft(page, 'no available state')
            .toHaveURL((url) => url.pathname !== PATHS.domainResults);
        },
      );
    }
  });

  test(
    'WH-11 a late response for an earlier lookup does not replace the newer result',
    { tag: '@failure' },
    async ({ whoisLookupPage, whoisResultsPage, domainResultsPage, apiStubs, apiTraffic }) => {
      const laterDomain = await generateUnregisteredDomain();
      const isEarlier = (url: URL) =>
        checksDomain(REGISTERED_DOMAIN)(url) ||
        url.searchParams.get(SUGGEST_DOMAINS_PARAMS.query) === REGISTERED_DOMAIN ||
        url.searchParams.get(RESULT_QUERY_PARAMS.whoisResults) === REGISTERED_DOMAIN;
      for (const endpoint of ['checkDomainAvailability', 'suggestDomains', 'whois'] as const) {
        await apiStubs.delay(endpoint, SLOW_RESPONSE_MS, { when: isEarlier });
      }
      // Only a registered domain's lookup calls parse-rdap, so every call belongs to it.
      await apiStubs.delay('parseRdap', SLOW_RESPONSE_MS);
      const earlierCheckSettled = apiTraffic.settled(
        'checkDomainAvailability',
        checksDomain(REGISTERED_DOMAIN),
      );

      await whoisLookupPage.goto();
      await whoisLookupPage.lookUp(REGISTERED_DOMAIN);
      await whoisResultsPage.search.search(laterDomain);
      await earlierCheckSettled;
      await domainResultsPage.waitForResults(laterDomain);

      await expect(domainResultsPage.exactMatch().domain).toHaveText(laterDomain);
      await expect(whoisResultsPage.domainHeading(REGISTERED_DOMAIN)).toHaveCount(0);
    },
  );

  test(
    'WH-12 a failed load more keeps the loaded alternatives and shows a message',
    { tag: '@failure' },
    async ({ whoisLookupPage, domainResultsPage, apiStubs, apiTraffic }) => {
      const domain = await generateUnregisteredDomain();
      await lookUpAvailable({ whoisLookupPage, domainResultsPage }, domain);
      const { count, hasNext } = (await lastSuggestions(apiTraffic)).pagingMetadata;
      expect(hasNext, `precondition: the first page (${count} results) has a next page`).toBe(true);
      const shownBefore = await domainResultsPage.alternativeCards.count();

      await apiStubs.respond(
        'suggestDomains',
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, body: STUB_BODIES.error },
        { when: isNextPage },
      );
      await domainResultsPage.showMoreButton.click();

      await expect.soft(domainResultsPage.errorMessage, 'a message').toBeVisible();
      await expect(domainResultsPage.alternativeCards).toHaveCount(shownBefore);
    },
  );
});
