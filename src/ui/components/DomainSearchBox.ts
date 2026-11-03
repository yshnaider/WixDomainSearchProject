import type { Locator, Page } from '@playwright/test';

/** The domain search box at the top of the results pages, with its suggested TLD chips. */
export class DomainSearchBox {
  readonly input: Locator;
  readonly submitButton: Locator;
  readonly suggestedTlds: Locator;

  constructor(page: Page) {
    this.input = page.getByTestId('module-coreDomainSearch-searchInput').getByRole('textbox');
    this.submitButton = page.getByTestId('module-coreDomainSearch-searchSubmitButton');
    this.suggestedTlds = page.getByTestId(/^tld-option-/);
  }

  async search(query: string): Promise<void> {
    await this.input.fill(query);
    await this.input.press('Enter');
  }
}
