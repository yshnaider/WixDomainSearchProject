import type { APIResponse } from '@playwright/test';
import {
  checkDomainAvailabilityResponseSchema,
  type CheckDomainAvailabilityResponse,
} from '../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../src/api/parseResponse';
import { generateUnregisteredDomain, isRegistered } from '../../src/api/rdap/rdap';
import { expect, test } from '../../src/fixtures/api.fixture';
import { KNOWN_DOMAINS } from '../../src/fixtures/testData';

// K4 (.co.il) has no RDAP server; its registry WHOIS check comes with full coverage.
const RDAP_KNOWN_DOMAINS = KNOWN_DOMAINS.filter(({ id }) => id !== 'K4');

async function expectSuccess(response: APIResponse): Promise<CheckDomainAvailabilityResponse> {
  const body = (await response.text()) || '(empty body)';
  expect(response.status(), `expected 200, got ${response.status()}: ${body}`).toBe(200);
  return parseResponse(response, checkDomainAvailabilityResponseSchema);
}

test.describe('check-domain-availability', () => {
  test.describe('CA-03 availability matches the registry', () => {
    for (const { id, domain } of RDAP_KNOWN_DOMAINS) {
      test(`${id} ${domain}`, { tag: '@sanity' }, async ({ domainSearch }) => {
        const registered = await isRegistered(domain);
        const { availability } = await expectSuccess(
          await domainSearch.checkDomainAvailability({ domain }),
        );

        expect(availability.domain).toBe(domain);
        expect(availability.available, `RDAP says registered: ${registered}`).toBe(!registered);
      });
    }

    test('G generated unregistered domain', { tag: '@sanity' }, async ({ domainSearch }) => {
      const domain = await generateUnregisteredDomain();
      const { availability } = await expectSuccess(
        await domainSearch.checkDomainAvailability({ domain }),
      );

      expect(availability.domain).toBe(domain);
      expect(availability.available, `${domain} is unregistered per RDAP`).toBe(true);
    });
  });

  test(
    'CA-17 accepts the documented example domain',
    { tag: '@sanity' },
    async ({ domainSearch }) => {
      const { availability } = await expectSuccess(
        await domainSearch.checkDomainAvailability({ domain: 'my-new-domain.com' }),
      );

      expect(availability.domain).toBe('my-new-domain.com');
    },
  );
});
