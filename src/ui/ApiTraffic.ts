import type { Page, Request, Response } from '@playwright/test';
import { matchesEndpoint, type DoorEndpoint } from './doorEndpoints';

export interface RecordedCall {
  url: URL;
  method: string;
  status: number;
  response: Response;
}

export type UrlFilter = (url: URL) => boolean;

const anyUrl: UrlFilter = () => true;

/** Records the page's calls to the domain-search endpoints, for UI-to-API integrity checks. */
export class ApiTraffic {
  private readonly recorded: RecordedCall[] = [];

  constructor(private readonly page: Page) {
    page.on('response', (response) => {
      this.recorded.push({
        url: new URL(response.url()),
        method: response.request().method(),
        status: response.status(),
        response,
      });
    });
  }

  /** Calls to the endpoint that have completed so far, oldest first. */
  calls(endpoint: DoorEndpoint, filter: UrlFilter = anyUrl): RecordedCall[] {
    return this.recorded.filter((call) => matchesEndpoint(call.url, endpoint) && filter(call.url));
  }

  /** The latest completed call to the endpoint. Fails if the page hasn't called it. */
  lastCall(endpoint: DoorEndpoint, filter: UrlFilter = anyUrl): RecordedCall {
    const call = this.calls(endpoint, filter).at(-1);
    if (!call) {
      throw new Error(`The page hasn't called ${endpoint}`);
    }
    return call;
  }

  /** Waits for the next response from the endpoint. Start waiting before the action that triggers it. */
  waitForResponse(endpoint: DoorEndpoint, filter: UrlFilter = anyUrl): Promise<Response> {
    return this.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return matchesEndpoint(url, endpoint) && filter(url);
    });
  }

  /** Resolves when a matching request finishes or fails, such as a delayed one cut off by navigation. */
  settled(endpoint: DoorEndpoint, filter: UrlFilter = anyUrl): Promise<void> {
    return new Promise((resolve) => {
      const onDone = (request: Request) => {
        const url = new URL(request.url());
        if (matchesEndpoint(url, endpoint) && filter(url)) {
          this.page.off('requestfinished', onDone);
          this.page.off('requestfailed', onDone);
          resolve();
        }
      };
      this.page.on('requestfinished', onDone);
      this.page.on('requestfailed', onDone);
    });
  }
}
