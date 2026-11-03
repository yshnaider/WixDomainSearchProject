import type { Locator, Page } from '@playwright/test';
import { DomainOfferCard } from '../components/DomainOfferCard';
import { DomainSearchBox } from '../components/DomainSearchBox';
import { PATHS, RESULT_QUERY_PARAMS } from '../paths';

/** WHOIS results for a registered domain: its WHOIS sections, then alternatives to buy. */
export class WhoisResultsPage {
  /** What a WHOIS field shows when it has no value. */
  static readonly MISSING_VALUE = '—';

  readonly heading: Locator;
  readonly noDomainMessage: Locator;
  readonly search: DomainSearchBox;
  readonly domainInformation: Locator;
  readonly registrarInformation: Locator;
  readonly registrantContactInformation: Locator;
  /** Each section: its heading and its label/value rows. */
  readonly domainSection: Locator;
  readonly registrarSection: Locator;
  readonly registrantSection: Locator;
  readonly rawRegistryData: Locator;
  readonly rawRegistrarData: Locator;
  readonly brokerBanner: Locator;
  readonly alternativesHeading: Locator;
  readonly offerCards: Locator;
  /** No error message has been seen on this page yet, so this locator is inferred. */
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'WHOIS search results' });
    this.noDomainMessage = page.getByText('No domain specified.');
    this.search = new DomainSearchBox(page);
    this.domainInformation = page.getByRole('heading', { name: 'Domain Information' });
    this.registrarInformation = page.getByRole('heading', { name: 'Registrar Information' });
    this.registrantContactInformation = page.getByRole('heading', {
      name: 'Registrant Contact Information',
    });
    this.domainSection = this.domainInformation.locator('..');
    this.registrarSection = this.registrarInformation.locator('..');
    this.registrantSection = this.registrantContactInformation.locator('..');
    this.rawRegistryData = page
      .getByTestId('accordion-item')
      .filter({ hasText: 'Raw Registry WHOIS Data' });
    this.rawRegistrarData = page
      .getByTestId('accordion-item')
      .filter({ hasText: 'Raw Registrar WHOIS Data' });
    this.brokerBanner = page.getByTestId('searched-domain-broker');
    this.alternativesHeading = page.getByRole('heading', {
      name: 'Explore these great alternatives',
    });
    this.offerCards = page.getByTestId(/^undefined-item-\d+$/);
    this.errorMessage = page.getByRole('alert');
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
    return DomainOfferCard.all(this.offerCards);
  }
}
