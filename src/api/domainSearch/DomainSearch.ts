import type { APIRequestContext, APIResponse } from '@playwright/test';
import { toQueryString } from '../queryString';

const SUGGEST_DOMAINS_PATH = '/domain-search/v2/suggest-domains';
const CHECK_DOMAIN_AVAILABILITY_PATH = '/domain-search/v2/check-domain-availability';

export const SUGGEST_DOMAINS_PARAMS = {
  query: 'query',
  tlds: 'tlds[]',
  maxLength: 'maxLength',
  pagingLimit: 'paging.limit',
  pagingCursor: 'paging.cursor',
} as const;

export const CHECK_DOMAIN_AVAILABILITY_PARAMS = {
  domain: 'domain',
} as const;

/** Documented input limits. */
export const SUGGEST_DOMAINS_LIMITS = {
  queryMinLength: 1,
  queryMaxLength: 100,
  pagingLimitMin: 1,
  pagingLimitMax: 50,
} as const;

/** Documented input limits. */
export const CHECK_DOMAIN_AVAILABILITY_LIMITS = {
  domainMinLength: 3,
  domainMaxLength: 63,
} as const;

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

export interface CheckDomainAvailabilityParams {
  /** Domain with its TLD, in punycode, such as `my-new-domain.com`. */
  domain: string;
}

export class DomainSearch {
  constructor(private readonly request: APIRequestContext) {}

  suggestDomains(params: SuggestDomainsParams): Promise<APIResponse> {
    return this.suggestDomainsRaw(
      toQueryString({
        [SUGGEST_DOMAINS_PARAMS.query]: params.query,
        [SUGGEST_DOMAINS_PARAMS.tlds]: params.tlds,
        [SUGGEST_DOMAINS_PARAMS.maxLength]: params.maxLength,
        [SUGGEST_DOMAINS_PARAMS.pagingLimit]: params.paging?.limit,
        [SUGGEST_DOMAINS_PARAMS.pagingCursor]: params.paging?.cursor,
      }),
    );
  }

  /** Sends a hand-built query string, for requests the typed params can't express. */
  suggestDomainsRaw(queryString: string): Promise<APIResponse> {
    return this.request.get(`${SUGGEST_DOMAINS_PATH}?${queryString}`);
  }

  checkDomainAvailability(params: CheckDomainAvailabilityParams): Promise<APIResponse> {
    return this.checkDomainAvailabilityRaw(
      toQueryString({ [CHECK_DOMAIN_AVAILABILITY_PARAMS.domain]: params.domain }),
    );
  }

  /** Sends a hand-built query string, for requests the typed params can't express. */
  checkDomainAvailabilityRaw(queryString: string): Promise<APIResponse> {
    return this.request.get(`${CHECK_DOMAIN_AVAILABILITY_PATH}?${queryString}`);
  }
}
