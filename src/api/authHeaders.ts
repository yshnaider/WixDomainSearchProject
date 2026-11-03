/** Wix API authentication headers. The key is sent as is, with no `Bearer` prefix. */
export const authHeaders = (apiKey: string, accountId: string): Record<string, string> => ({
  Authorization: apiKey,
  'wix-account-id': accountId,
});
