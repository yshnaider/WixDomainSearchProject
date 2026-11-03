import type { DomainSearch } from '../../../src/api/domainSearch/DomainSearch';
import {
  suggestDomainsResponseSchema,
  type SuggestDomainsResponse,
} from '../../../src/api/domainSearch/domainSearch.schemas';
import { expectSuccess } from './expectResponse';

/** Guards against a cursor that never runs out. */
const MAX_PAGES = 20;

/** Follows `cursors.next` from the first page to the last, and returns every page. */
export async function fetchAllPages(
  domainSearch: DomainSearch,
  query: string,
  limit: number,
): Promise<SuggestDomainsResponse[]> {
  const pages: SuggestDomainsResponse[] = [];
  let cursor: string | undefined;
  do {
    const response = await domainSearch.suggestDomains({ query, paging: { limit, cursor } });
    pages.push(await expectSuccess(response, suggestDomainsResponseSchema));
    if (pages.length > MAX_PAGES) {
      throw new Error(`Stopped after ${MAX_PAGES} pages of "${query}": cursors.next never ran out`);
    }
    cursor = pages.at(-1)?.pagingMetadata.cursors.next;
  } while (cursor);
  return pages;
}
