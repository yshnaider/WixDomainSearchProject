import { z } from 'zod';

// Responses of the www.wix.com serverless endpoints the doors call, built from real responses
// seen in the browser on 2026-11-03.

export const tldDisplayPriceSchema = z.object({
  tld: z.string().min(1),
  pricing: z.object({
    /** The price after discount, such as "₪0.00". */
    price: z.string().min(1),
    originalPrice: z.string().min(1),
    pricingStrategy: z.string().min(1),
    renewalPrice: z.string().min(1),
  }),
});

export const suggestedTldDisplayPricesResponseSchema = z.object({
  displayPrices: z.array(tldDisplayPriceSchema),
  pricesExcludeTax: z.boolean(),
});

/**
 * Shared by `parse-rdap` (the parsed WHOIS sections) and `structured-domain-info/whois` (the raw
 * WHOIS data). Fields absent from either response are optional.
 */
export const structuredDomainInfoResponseSchema = z.object({
  info: z.object({
    id: z.string().min(1),
    domainInfo: z.object({
      name: z.string().min(1),
      created: z.string().optional(),
      updated: z.string().optional(),
      expires: z.string().optional(),
      nameservers: z.array(z.string()),
      status: z.array(z.unknown()),
    }),
    registrant: z.object({
      name: z.string().optional(),
      org: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      redacted: z.boolean().optional(),
    }),
    registrar: z.object({ name: z.string().optional(), url: z.string().optional() }),
    raw: z.object({ registry: z.string(), registrar: z.string() }).optional(),
    source: z.enum(['RDAP', 'WHOIS']),
  }),
});

export type TldDisplayPrice = z.infer<typeof tldDisplayPriceSchema>;
export type SuggestedTldDisplayPricesResponse = z.infer<
  typeof suggestedTldDisplayPricesResponseSchema
>;
export type StructuredDomainInfoResponse = z.infer<typeof structuredDomainInfoResponseSchema>;
