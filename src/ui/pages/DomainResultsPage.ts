import type { Locator, Page } from '@playwright/test';
import { DomainOfferCard } from '../components/DomainOfferCard';
import { DomainSearchBox } from '../components/DomainSearchBox';
import { PATHS, RESULT_QUERY_PARAMS } from '../paths';

/** Results usually render within a few seconds; this stays inside the test timeout. */
const RESULTS_TIMEOUT_MS = 15_000;

/**
 * Storefront results for a searched domain. An available domain shows an exact-match card first;
 * a registered one shows a message and featured alternatives. Both end with a list of alternatives.
 */
export class DomainResultsPage {
  readonly heading: Locator;
  readonly search: DomainSearchBox;
  readonly registeredMessage: Locator;
  readonly exactMatchCard: Locator;
  readonly featuredCards: Locator;
  readonly alternativesHeading: Locator;
  readonly alternativeCards: Locator;
  readonly showMoreButton: Locator;
  /** No error message has been seen on this page yet, so this locator is inferred. */
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', {
      name: 'Lock in your domain. Start your online journey.',
    });
    this.search = new DomainSearchBox(page);
    this.registeredMessage = page.getByTestId('general-anonymous-override');
    this.exactMatchCard = page.getByTestId('hero-card');
    this.featuredCards = page.getByTestId(/^main-card-\d+$/);
    this.alternativesHeading = page.getByRole('heading', {
      name: 'Explore available alternatives',
    });
    this.alternativeCards = page.getByTestId(/^recommendations-content-list-item-\d+$/);
    this.showMoreButton = page.getByRole('button', { name: 'Show more results' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto(query: string): Promise<void> {
    const params = new URLSearchParams({ [RESULT_QUERY_PARAMS.domainResults]: query });
    await this.page.goto(`${PATHS.domainResults}?${params.toString()}`);
    await this.waitForResults(query);
  }

  /** Waits for the alternatives. An empty or rejected query shows none, so this names that. */
  async waitForResults(query: string): Promise<void> {
    await this.alternativeCards
      .first()
      .waitFor({ timeout: RESULTS_TIMEOUT_MS })
      .catch((error: unknown) => {
        throw new Error(`No domain results appeared for "${query}"`, { cause: error });
      });
  }

  exactMatch(): DomainOfferCard {
    return new DomainOfferCard(this.exactMatchCard);
  }

  featured(): Promise<DomainOfferCard[]> {
    return DomainOfferCard.all(this.featuredCards);
  }

  alternatives(): Promise<DomainOfferCard[]> {
    return DomainOfferCard.all(this.alternativeCards);
  }

  /** Loads the next page of alternatives and waits for it to render. */
  async showMore(): Promise<void> {
    const shown = await this.alternativeCards.count();
    await this.showMoreButton.click();
    await this.alternativeCards.nth(shown).waitFor();
  }
}
