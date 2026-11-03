import { z } from 'zod';

export const suggestionSchema = z.object({
  domain: z.string().includes('.', { message: 'domain must include a TLD' }),
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

export const fieldViolationSchema = z.object({
  field: z.string(),
  description: z.string(),
  violatedRule: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// `message` holds an error code for application errors, and free text for validation errors
// such as an empty query.
export const apiErrorSchema = z.object({
  message: z.string().min(1),
  details: z.object({
    validationError: z
      .object({
        fieldViolations: z.array(fieldViolationSchema),
      })
      .optional(),
  }),
});

export type Suggestion = z.infer<typeof suggestionSchema>;
export type PagingMetadata = z.infer<typeof pagingMetadataSchema>;
export type SuggestDomainsResponse = z.infer<typeof suggestDomainsResponseSchema>;
export type SuggestDomainsErrorCode = z.infer<typeof suggestDomainsErrorCodeSchema>;
export type FieldViolation = z.infer<typeof fieldViolationSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
