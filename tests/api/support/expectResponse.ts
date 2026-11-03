import { expect, type APIResponse } from '@playwright/test';
import { z } from 'zod';
import { apiErrorSchema, type ApiError } from '../../../src/api/domainSearch/domainSearch.schemas';
import { parseResponse } from '../../../src/api/parseResponse';

export const describeResponse = async (response: APIResponse) =>
  `got ${response.status()}: ${(await response.text()) || '(empty body)'}`;

/** Expects a 200 and returns the body parsed with the success schema. */
export async function expectSuccess<T extends z.ZodType>(
  response: APIResponse,
  schema: T,
): Promise<z.infer<T>> {
  expect(response.status(), `expected 200, ${await describeResponse(response)}`).toBe(200);
  return parseResponse(response, schema);
}

/** Expects a 4xx and returns the body parsed with the error schema. */
export async function expectClientError(response: APIResponse): Promise<ApiError> {
  const status = response.status();
  expect(status >= 400 && status < 500, `expected 4xx, ${await describeResponse(response)}`).toBe(
    true,
  );
  return parseResponse(response, apiErrorSchema);
}

/** Accepts a success or a 4xx body, for rows where both outcomes are allowed. */
export async function expectNoServerError<T extends z.ZodType>(
  response: APIResponse,
  schema: T,
): Promise<z.infer<T> | ApiError> {
  expect(response.status(), `expected no 5xx, ${await describeResponse(response)}`).toBeLessThan(
    500,
  );
  return parseResponse(response, z.union([schema, apiErrorSchema]));
}

export const violatedFields = (error: ApiError) =>
  error.details.validationError?.fieldViolations.map((violation) => violation.field) ?? [];
