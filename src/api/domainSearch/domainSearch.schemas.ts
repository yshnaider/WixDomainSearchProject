import { z } from 'zod';

export const domainSchema = z.string().includes('.', { message: 'domain must include a TLD' });

export const suggestionSchema = z.object({
  domain: domainSchema,
  premium: z.boolean(),
});

export const pagingMetadataSchema = z.object({
  // The number of suggestions on this page, not the total across pages.
  count: z.number().int().nonnegative(),
  cursors: z.object({
    next: z.string().min(1).optional(),
    prev: z.string().min(1).optional(),
  }),
  hasNext: z.boolean(),
});

export const suggestDomainsResponseSchema = z.object({
  suggestions: z.array(suggestionSchema),
  pagingMetadata: pagingMetadataSchema,
});

// Documented codes, returned in the top-level `message`. INVALID_QUERY hasn't been seen in a
// real response yet (inferred): queries with `$`, `_`, `!`, Unicode, or emoji all return 200.
export const suggestDomainsErrorCodeSchema = z.enum([
  'INVALID_QUERY',
  'INVALID_TLD_FORMAT',
  'TLD_NOT_SUPPORTED',
]);

export const domainAvailabilitySchema = z.object({
  domain: domainSchema,
  available: z.boolean(),
  premium: z.boolean(),
  // Only UNKNOWN_PREMIUM_TYPE has been seen so far; other values are inferred.
  premiumType: z.string().min(1),
});

export const checkDomainAvailabilityResponseSchema = z.object({
  availability: domainAvailabilitySchema,
});

// Seen in real responses, not in the published contract. INVALID_DOMAIN (missing or invalid TLD)
// is in `message`; DOMAINS_UNSUPPORTED_TLD (a TLD Wix doesn't sell, such as .gov) is in
// `details.applicationError.code`.
export const checkDomainAvailabilityErrorCodeSchema = z.enum([
  'INVALID_DOMAIN',
  'DOMAINS_UNSUPPORTED_TLD',
]);

export const fieldViolationSchema = z.object({
  field: z.string(),
  description: z.string(),
  violatedRule: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// The error code is in `message` for most application errors, and in
// `details.applicationError.code` for some, with free text in `message`. Validation errors,
// such as an empty query, have free text in `message`.
export const apiErrorSchema = z.object({
  message: z.string().min(1),
  details: z.object({
    validationError: z
      .object({
        fieldViolations: z.array(fieldViolationSchema),
      })
      .optional(),
    applicationError: z
      .object({
        code: z.string().min(1),
        description: z.string(),
      })
      .optional(),
  }),
});

export type Suggestion = z.infer<typeof suggestionSchema>;
export type PagingMetadata = z.infer<typeof pagingMetadataSchema>;
export type SuggestDomainsResponse = z.infer<typeof suggestDomainsResponseSchema>;
export type SuggestDomainsErrorCode = z.infer<typeof suggestDomainsErrorCodeSchema>;
export type DomainAvailability = z.infer<typeof domainAvailabilitySchema>;
export type CheckDomainAvailabilityResponse = z.infer<typeof checkDomainAvailabilityResponseSchema>;
export type CheckDomainAvailabilityErrorCode = z.infer<
  typeof checkDomainAvailabilityErrorCodeSchema
>;
export type FieldViolation = z.infer<typeof fieldViolationSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
