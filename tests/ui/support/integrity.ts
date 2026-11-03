import { expect } from '@playwright/test';
import type { SuggestedTldDisplayPricesResponse } from '../../../src/api/domainsServerless/domainsServerless.schemas';
import { DomainOfferCard } from '../../../src/ui/components/DomainOfferCard';
import { tldOf } from '../../../src/utils/domain';

/** The domains the cards show, in page order. */
export const domainsOf = (cards: DomainOfferCard[]) =>
  Promise.all(cards.map((card) => card.domain.innerText()));

/** Expects the card's prices to match the price entry for its TLD (TEST_PLAN.md's integrity check). */
export async function expectPricedByTld(
  card: DomainOfferCard,
  prices: SuggestedTldDisplayPricesResponse,
): Promise<void> {
  const domain = await card.domain.innerText();
  const tld = tldOf(domain);
  const entry = prices.displayPrices.find((price) => price.tld === tld);
  expect(entry, `a price entry for .${tld} (${domain})`).toBeDefined();
  await expect(card.originalPrice, `original price of ${domain}`).toHaveText(
    `${entry?.pricing.originalPrice}${DomainOfferCard.PRICE_SUFFIX}`,
  );
  await expect(card.discountedPrice, `discounted price of ${domain}`).toHaveText(
    `${entry?.pricing.price}${DomainOfferCard.PRICE_SUFFIX}`,
  );
  await expect(card.purchaseButton).toBeVisible();
}
