import type { Page, Route } from '@playwright/test';
import { matchesEndpoint, type DoorEndpoint } from './doorEndpoints';
import type { UrlFilter } from './ApiTraffic';

export interface StubbedResponse {
  status: number;
  /** An object is sent as JSON; a string is sent as is, for invalid-JSON tests. */
  body?: object | string;
  delayMs?: number;
}

export interface StubOptions {
  /** Only calls whose URL passes this filter are stubbed; the rest go through unchanged. */
  when?: UrlFilter;
}

/** Network errors that `route.abort` can simulate. */
export type NetworkFailure = 'timedout' | 'failed' | 'connectionreset';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replaces, rewrites, or slows the page's calls to the domain-search endpoints, for Failure tests.
 * Later stubs for the same endpoint take precedence.
 */
export class ApiStubs {
  constructor(private readonly page: Page) {}

  async respond(
    endpoint: DoorEndpoint,
    { status, body, delayMs }: StubbedResponse,
    options: StubOptions = {},
  ): Promise<void> {
    await this.route(endpoint, options, async (route) => {
      if (delayMs) {
        await pause(delayMs);
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
      });
    });
  }

  async fail(
    endpoint: DoorEndpoint,
    failure: NetworkFailure,
    options: StubOptions = {},
  ): Promise<void> {
    await this.route(endpoint, options, (route) => route.abort(failure));
  }

  /** Sends the real call, and returns its JSON body after `transform`, such as with a field removed. */
  async rewrite(
    endpoint: DoorEndpoint,
    transform: (body: unknown) => unknown,
    options: StubOptions = {},
  ): Promise<void> {
    await this.route(endpoint, options, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: transform(await response.json()) });
    });
  }

  /** Lets the call through unchanged, but late, for tests where a slow response arrives last. */
  async delay(endpoint: DoorEndpoint, delayMs: number, options: StubOptions = {}): Promise<void> {
    await this.route(endpoint, options, async (route) => {
      await pause(delayMs);
      await route.fallback();
    });
  }

  private async route(
    endpoint: DoorEndpoint,
    { when }: StubOptions,
    handler: (route: Route) => Promise<void>,
  ): Promise<void> {
    await this.page.route(
      (url) => matchesEndpoint(url, endpoint),
      async (route) => {
        if (when && !when(new URL(route.request().url()))) {
          await route.fallback();
          return;
        }
        await handler(route);
      },
    );
  }
}
