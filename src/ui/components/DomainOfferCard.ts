import type { Locator } from '@playwright/test';
import { DOMAIN_PATTERN } from '../../utils/domain';

/** A domain offered for purchase, with its prices and a Get It button. */
export class DomainOfferCard {
  readonly domain: Locator;
  /** The original price first, then the price after discount. */
  readonly prices: Locator;
  readonly originalPrice: Locator;
  readonly discountedPrice: Locator;
  readonly getItButton: Locator;

  constructor(readonly root: Locator) {
    // The card also holds a hidden copy of the domain, used to measure it for truncation.
    this.domain = root.getByText(DOMAIN_PATTERN).filter({ visible: true });
    this.prices = root.getByText(/\/yr$/);
    this.originalPrice = this.prices.first();
    this.discountedPrice = this.prices.nth(1);
    this.getItButton = root.getByRole('button', { name: 'Get It' });
  }
}
