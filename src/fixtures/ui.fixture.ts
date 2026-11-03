import { test as base } from '@playwright/test';
import { ApiStubs } from '../ui/ApiStubs';
import { ApiTraffic } from '../ui/ApiTraffic';
import { DomainResultsPage } from '../ui/pages/DomainResultsPage';
import { WhoisLookupPage } from '../ui/pages/WhoisLookupPage';
import { WhoisResultsPage } from '../ui/pages/WhoisResultsPage';

interface UiFixtures {
  apiTraffic: ApiTraffic;
  apiStubs: ApiStubs;
  domainResultsPage: DomainResultsPage;
  whoisLookupPage: WhoisLookupPage;
  whoisResultsPage: WhoisResultsPage;
}

/** Page models are added here by /add-ui-page-model. */
export const test = base.extend<UiFixtures>({
  apiTraffic: async ({ page }, use) => {
    await use(new ApiTraffic(page));
  },
  apiStubs: async ({ page }, use) => {
    await use(new ApiStubs(page));
  },
  domainResultsPage: async ({ page }, use) => {
    await use(new DomainResultsPage(page));
  },
  whoisLookupPage: async ({ page }, use) => {
    await use(new WhoisLookupPage(page));
  },
  whoisResultsPage: async ({ page }, use) => {
    await use(new WhoisResultsPage(page));
  },
});

export { expect } from '@playwright/test';
