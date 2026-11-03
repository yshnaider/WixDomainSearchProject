export type QueryValue = string | number | boolean | (string | number)[] | undefined;

/**
 * Builds a query string, skipping undefined values and repeating the key for each array item.
 * Keys are left unencoded because the API ignores `tlds%5B%5D`: `tlds[]` must keep its raw
 * brackets, which rules out URLSearchParams.
 */
export function toQueryString(params: Record<string, QueryValue>): string {
  return Object.entries(params)
    .flatMap(([key, value]) => {
      if (value === undefined) {
        return [];
      }
      const values = Array.isArray(value) ? value : [value];
      return values.map((item) => `${key}=${encodeURIComponent(item)}`);
    })
    .join('&');
}
