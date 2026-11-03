import type { Page, Route } from '@playwright/test';
import { matchesEndpoint, type DoorEndpoint } from './doorEndpoints';

export interface StubbedResponse {
  status: number;
  /** An object is sent as JSON; a string is sent as is, for invalid-JSON tests. */
  body?: object | string;
  delayMs?: number;
}

/** Network errors that `route.abort` can simulate. */
export type NetworkFailure = 'timedout' | 'failed' | 'connectionreset';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replaces or slows the page's calls to the domain-search endpoints, for Failure tests.
 * Later stubs for the same endpoint take precedence.
 */
export class ApiStubs {
  constructor(private readonly page: Page) {}

  async respond(endpoint: DoorEndpoint, { status, body, delayMs }: StubbedResponse): Promise<void> {
    await this.route(endpoint, async (route) => {
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

  async fail(endpoint: DoorEndpoint, failure: NetworkFailure): Promise<void> {
    await this.route(endpoint, (route) => route.abort(failure));
  }

  /** Lets the call through unchanged, but late, for tests where a slow response arrives last. */
  async delay(endpoint: DoorEndpoint, delayMs: number): Promise<void> {
    await this.route(endpoint, async (route) => {
      await pause(delayMs);
      await route.fallback();
    });
  }

  private async route(
    endpoint: DoorEndpoint,
    handler: (route: Route) => Promise<void>,
  ): Promise<void> {
    await this.page.route((url) => matchesEndpoint(url, endpoint), handler);
  }
}
