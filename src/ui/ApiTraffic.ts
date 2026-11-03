import type { Page, Response } from '@playwright/test';
import { matchesEndpoint, type DoorEndpoint } from './doorEndpoints';

export interface RecordedCall {
  url: URL;
  method: string;
  status: number;
  response: Response;
}

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
  calls(endpoint: DoorEndpoint): RecordedCall[] {
    return this.recorded.filter((call) => matchesEndpoint(call.url, endpoint));
  }

  /** Waits for the next response from the endpoint. Start waiting before the action that triggers it. */
  waitForResponse(endpoint: DoorEndpoint): Promise<Response> {
    return this.page.waitForResponse((response) => matchesEndpoint(response.url(), endpoint));
  }
}
