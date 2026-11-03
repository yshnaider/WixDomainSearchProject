import { test as base, type APIRequestContext } from '@playwright/test';
import { authHeaders } from '../api/authHeaders';
import { DomainSearch } from '../api/domainSearch/DomainSearch';
import { getApiEnv } from '../config/env';

interface ApiFixtures {
  apiRequest: APIRequestContext;
  domainSearch: DomainSearch;
  /** Creates a client that sends only the given headers, for authentication tests. */
  domainSearchWithHeaders: (headers: Record<string, string>) => Promise<DomainSearch>;
}

export const test = base.extend<ApiFixtures>({
  apiRequest: async ({ playwright }, use) => {
    const env = getApiEnv();
    const request = await playwright.request.newContext({
      baseURL: env.BASE_URL,
      extraHTTPHeaders: authHeaders(env.API_KEY, env.WIX_ACCOUNT_ID),
    });
    await use(request);
    await request.dispose();
  },
  domainSearch: async ({ apiRequest }, use) => {
    await use(new DomainSearch(apiRequest));
  },
  domainSearchWithHeaders: async ({ playwright }, use) => {
    const { BASE_URL } = getApiEnv();
    const contexts: APIRequestContext[] = [];
    await use(async (headers) => {
      const request = await playwright.request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: headers,
      });
      contexts.push(request);
      return new DomainSearch(request);
    });
    await Promise.all(contexts.map((request) => request.dispose()));
  },
});

export { expect } from '@playwright/test';
