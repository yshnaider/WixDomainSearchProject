import { test as base, type APIRequestContext } from '@playwright/test';
import { DomainSearch } from '../api/domainSearch/DomainSearch';
import { getApiEnv } from '../config/env';

interface ApiFixtures {
  apiRequest: APIRequestContext;
  domainSearch: DomainSearch;
}

export const test = base.extend<ApiFixtures>({
  apiRequest: async ({ playwright }, use) => {
    const env = getApiEnv();
    const request = await playwright.request.newContext({
      baseURL: env.BASE_URL,
      extraHTTPHeaders: {
        Authorization: env.API_KEY,
        'wix-account-id': env.WIX_ACCOUNT_ID,
      },
    });
    await use(request);
    await request.dispose();
  },
  domainSearch: async ({ apiRequest }, use) => {
    await use(new DomainSearch(apiRequest));
  },
});

export { expect } from '@playwright/test';
