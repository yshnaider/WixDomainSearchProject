import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const envFile = resolve(__dirname, '../../.env');

const apiEnvSchema = z.object({
  BASE_URL: z.url(),
  API_KEY: z.string().min(1),
  WIX_ACCOUNT_ID: z.string().min(1),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function getApiEnv(): ApiEnv {
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
  const result = apiEnvSchema.safeParse(process.env);
  if (!result.success) {
    // Name the variables only: the values are secrets.
    const names = result.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Missing or invalid environment variables: ${names.join(', ')}`);
  }
  return result.data;
}
