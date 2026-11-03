import type { APIRequestContext, APIResponse } from '@playwright/test';
import { toQueryString } from '../queryString';

const SUGGEST_DOMAINS_PATH = '/domain-search/v2/suggest-domains';

export interface SuggestDomainsParams {
  query: string;
  /** TLDs without the dot, such as `com`. */
  tlds?: string[];
  /** Maximum length of the domain name, excluding the TLD. */
  maxLength?: number;
  paging?: {
    limit?: number;
    /** Taken from `pagingMetadata.cursors.next` of the previous page. */
    cursor?: string;
  };
}

export class DomainSearch {
  constructor(private readonly request: APIRequestContext) {}

  suggestDomains(params: SuggestDomainsParams): Promise<APIResponse> {
    const query = toQueryString({
      query: params.query,
      'tlds[]': params.tlds,
      maxLength: params.maxLength,
      'paging.limit': params.paging?.limit,
      'paging.cursor': params.paging?.cursor,
    });
    return this.request.get(`${SUGGEST_DOMAINS_PATH}?${query}`);
  }
}
