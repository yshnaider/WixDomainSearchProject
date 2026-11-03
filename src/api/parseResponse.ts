import type { APIResponse } from '@playwright/test';
import { z } from 'zod';

const BODY_EXCERPT_LENGTH = 300;

/**
 * Parses a response body with a Zod schema. Fails with the status, path, and reason when the
 * body isn't JSON or doesn't match the schema.
 */
export async function parseResponse<T extends z.ZodType>(
  response: APIResponse,
  schema: T,
): Promise<z.infer<T>> {
  const source = `${response.status()} ${new URL(response.url()).pathname}`;
  const text = await response.text();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Expected a JSON body from ${source}, got: ${text.slice(0, BODY_EXCERPT_LENGTH)}`,
    );
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Body from ${source} doesn't match the schema:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
