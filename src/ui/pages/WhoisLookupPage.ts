import type { Locator, Page } from '@playwright/test';
import { PATHS } from '../paths';

/** Searches take up to about 8 seconds to navigate; this stays inside the test timeout. */
const SEARCH_NAVIGATION_TIMEOUT_MS = 15_000;

/** The WHOIS Lookup door: a form that opens the WHOIS results for a domain or URL. */
export class WhoisLookupPage {
  readonly heading: Locator;
  readonly searchBox: Locator;
  readonly searchButton: Locator;
  /** No validation message has been seen on this form yet, so this locator is inferred. */
  readonly validationMessage: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Free WHOIS lookup' });
    // The page repeats the form at the bottom; the first one is at the top.
    this.searchBox = page.getByRole('textbox', { name: 'Enter a domain name or URL' }).first();
    this.searchButton = page.getByRole('button', { name: 'Search Domains' }).first();
    this.validationMessage = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto(PATHS.whoisLookup);
    await this.heading.waitFor();
  }

  /** Types into the form and submits it, without waiting for the result. */
  async submit(input: string): Promise<void> {
    await this.searchBox.fill(input);
    await this.searchBox.press('Enter');
  }

  /**
   * Searches for a domain or URL, and waits to leave the form. A registered domain opens the WHOIS
   * results page; an available one opens the domain results page.
   */
  async lookUp(domainOrUrl: string): Promise<void> {
    await this.submit(domainOrUrl);
    await this.page
      .waitForURL((url) => url.pathname !== PATHS.whoisLookup, {
        timeout: SEARCH_NAVIGATION_TIMEOUT_MS,
      })
      .catch((error: unknown) => {
        throw new Error(`Searching for "${domainOrUrl}" didn't leave the WHOIS lookup form`, {
          cause: error,
        });
      });
  }
}
