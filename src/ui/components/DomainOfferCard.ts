import type { Locator } from '@playwright/test';
import { DOMAIN_PATTERN } from '../../utils/domain';

/** A domain offered for purchase, with its prices and a purchase button. */
export class DomainOfferCard {
  /** Each card shows the original price and the price after discount. */
  static readonly PRICES_SHOWN = 2;
  /** Follows each price, as in "₪27.44/yr". */
  static readonly PRICE_SUFFIX = '/yr';

  readonly domain: Locator;
  /** The original price first, then the price after discount. */
  readonly prices: Locator;
  readonly originalPrice: Locator;
  readonly discountedPrice: Locator;
  /** "Get It" on list cards, "Make It Yours" on featured and exact-match cards. */
  readonly purchaseButton: Locator;

  constructor(readonly root: Locator) {
    // The card also holds a hidden copy of the domain, used to measure it for truncation.
    this.domain = root.getByText(DOMAIN_PATTERN).filter({ visible: true });
    this.prices = root.getByText(new RegExp(`${DomainOfferCard.PRICE_SUFFIX}$`));
    this.originalPrice = this.prices.first();
    this.discountedPrice = this.prices.nth(1);
    this.purchaseButton = root.getByRole('button', { name: /^(Get It|Make It Yours)$/ });
  }

  /** One card per element the locator matches, in page order. */
  static async all(cards: Locator): Promise<DomainOfferCard[]> {
    const count = await cards.count();
    return Array.from({ length: count }, (_, index) => new DomainOfferCard(cards.nth(index)));
  }
}
