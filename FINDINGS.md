# Findings

These are the bugs I found while running the tests in [TEST_PLAN.md](TEST_PLAN.md). Each one links back to the test that caught it.

| ID | Area | Finding | Severity | Caught by |
| --- | --- | --- | --- | --- |
| F-1 | Domain Storefront | A search made only of spaces returns results | Low | SF-09 |
| F-2 | API: `suggest-domains` | No API key is required | High (if unintended) | SD-21 |
| F-3 | API: `suggest-domains` | `hasNext` reports no next page when more results exist | Medium | SD-18 |

## F-1: A search made only of spaces returns results

**Area:** Domain Storefront

**Steps:**

1. On the landing page, type a name made only of spaces, followed by a TLD (for example, three spaces and `.com`), and press Enter.
2. On the results page, clear the search box, type only spaces, and press Enter.

**Expected:** a clean rejection, as described in TEST_PLAN.md: no results, a clear message, and the user's text kept. A spaces-only input (B2) has no domain name to search for. Clean rejection is my proposed behavior, and it still needs confirming with the team.

**Actual:** both searches return results.

**Impact:** the user gets suggestions for a name they never typed, and every such search is a wasted request.

**Notes:** I haven't yet captured the `query` the page sends. If it sends the spaces as they are, the API is also accepting a spaces-only query, and SD-07 fails too.

## F-2: No API key is required

**Area:** API, `suggest-domains`

**Steps:**

1. Send the SD-01 request (`query=sunnybakery&paging.limit=10`) with no API key.
2. Send the same request with a fake API key.

**Expected:** a 4xx response with no suggestions, because the documentation requires an account-level API key.

**Actual:** both requests return 200 with suggestions. SD-21 fails on every run.

**Impact:** anyone can call the endpoint without an account, which bypasses per-account rate limits and usage tracking. I've rated it High on the assumption that it's unintended. If the endpoint is meant to be public, the documentation is wrong instead, and this becomes a documentation bug.

## F-3: `hasNext` reports no next page when more results exist

**Area:** API, `suggest-domains`

**Steps:**

1. Send `query=bakery&paging.limit=5`.
2. Send `query=bakery` with no `paging.limit`.
3. Send `query=bakery&paging.limit=20`.

**Expected:** in step 1, `hasNext` says there's a next page, because steps 2 and 3 show that the same query has more than 5 results.

**Actual:** step 1 returns `hasNext` saying there's no next page. Step 2 returns 7 results, and step 3 returns 20.

**Impact:** any client that relies on `hasNext` stops after the first page and misses at least 15 of the results.

**Notes:** this affects item 11 in TEST_PLAN.md's Before I Start (how the last page is signaled). SD-18 should also check `hasNext` against the number of results actually available, not only `pagingMetadata.cursors.next`.
