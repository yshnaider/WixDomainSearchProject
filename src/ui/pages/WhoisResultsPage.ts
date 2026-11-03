import type { Locator, Page } from '@playwright/test';
import { DomainOfferCard } from '../components/DomainOfferCard';
import { PATHS, RESULT_QUERY_PARAMS } from '../paths';

/** WHOIS results for a registered domain: its WHOIS sections, then alternatives to buy. */
export class WhoisResultsPage {
  readonly heading: Locator;
  readonly noDomainMessage: Locator;
  readonly searchBox: Locator;
  readonly domainInformation: Locator;
  readonly registrarInformation: Locator;
  readonly registrantContactInformation: Locator;
  readonly brokerBanner: Locator;
  readonly alternativesHeading: Locator;
  readonly offerCards: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'WHOIS search results' });
    this.noDomainMessage = page.getByText('No domain specified.');
    this.searchBox = page.getByTestId('module-coreDomainSearch-searchInput').getByRole('textbox');
    this.domainInformation = page.getByRole('heading', { name: 'Domain Information' });
    this.registrarInformation = page.getByRole('heading', { name: 'Registrar Information' });
    this.registrantContactInformation = page.getByRole('heading', {
      name: 'Registrant Contact Information',
    });
    this.brokerBanner = page.getByTestId('searched-domain-broker');
    this.alternativesHeading = page.getByRole('heading', {
      name: 'Explore these great alternatives',
    });
    this.offerCards = page.getByTestId(/^undefined-item-\d+$/);
  }

  domainHeading(domain: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: domain, exact: true });
  }

  async goto(domain: string): Promise<void> {
    const query = new URLSearchParams({ [RESULT_QUERY_PARAMS.whoisResults]: domain });
    await this.page.goto(`${PATHS.whoisResults}?${query.toString()}`);
    await this.waitForLoad();
  }

  /** Waits for the results page, and fails if it opened without a domain. */
  async waitForLoad(): Promise<void> {
    await this.heading.or(this.noDomainMessage).first().waitFor();
    if (await this.noDomainMessage.isVisible()) {
      throw new Error('The WHOIS results page shows "No domain specified."');
    }
  }

  /** Waits for the WHOIS sections of a registered domain to render. */
  async waitForWhoisInformation(domain: string): Promise<void> {
    await this.domainHeading(domain).waitFor();
    await this.registrarInformation.waitFor();
  }

  /** Waits for the alternatives, and returns one card per offer. */
  async offers(): Promise<DomainOfferCard[]> {
    await this.offerCards.first().waitFor();
    const count = await this.offerCards.count();
    return Array.from(
      { length: count },
      (_, index) => new DomainOfferCard(this.offerCards.nth(index)),
    );
  }
}
