# Wix Domain Search Tests

Automated API and UI tests for the Wix domain search services: the Domain Storefront, the Business Name Generator, WHOIS Lookup, and the Public Domain Search API behind them. The system is described in [ARCHITECTURE.md](ARCHITECTURE.md), the test plan is in [TEST_PLAN.md](TEST_PLAN.md), and the bugs I found are in [FINDINGS.md](FINDINGS.md).

Built with Playwright and TypeScript, with Zod schemas validating every API response.

## How to Run the Tests

**You need:** Node.js 24 and a Wix API key.

1. Install dependencies and the browser:

   ```sh
   npm ci
   npx playwright install chromium
   ```

2. Create a `.env` file in the project root. It's git-ignored and never printed.

   ```
   BASE_URL=https://www.wixapis.com
   API_KEY=<your account-level API key>
   WIX_ACCOUNT_ID=<your account ID>
   ```

3. Run the tests:

   | Command | What it runs |
   | --- | --- |
   | `npm test` | Everything: API and UI tests |
   | `npx playwright test --project=api` | API tests only |
   | `npx playwright test --project=chromium` | UI tests only |
   | `npx playwright test --grep @smoke` | Smoke tests only (the only ones meant for production) |
   | `npm run report` | Opens the HTML report of the last run |
   | `npm run typecheck`, `npm run lint`, `npm run format:check` | Code checks |

**On CI**, the GitHub Actions workflow in `.github/workflows/tests.yml` runs the code checks and then `npm test`. It needs the repository secrets `API_KEY` and `WIX_ACCOUNT_ID`, and the variable `BASE_URL`.

**Things to know before running:**

- `BASE_URL` currently points to production, and the API rate-limits bursts. One full API run is about 110 requests. Use one worker (`--workers=1`), and pause between runs.
- Some tests fail on purpose: they found real product issues, and I leave them failing rather than weaken them. These include the ignored TLD filter, the missing API key check, and the unenforced 63-character limit.
- Every test is tagged `@smoke`, `@sanity`, `@edge`, or `@failure`, matching the Type column in the test plan.

## What's Covered

| Area | Tests | Status |
| --- | --- | --- |
| API: `suggest-domains` | 21 | All plan rows except SD-08, which can't be automated because suggestions change between calls |
| API: `check-domain-availability` | 49 | All plan rows, with availability checked against the registries' own RDAP and WHOIS servers |
| UI: WHOIS Lookup and results page models | 6 | Verified against the live site |
| UI: WHOIS Lookup door, all plan rows | 47 | Written, with one run so far (7 passed). The failures still need triage. |

Not covered yet: the Domain Storefront and Business Name Generator doors, the other API endpoints, cross-door tests, and security tests.

## What I'd Do With Another Week

- **Triage the WHOIS door run.** Separate the real product issues (no error messages on failure) from test bugs (a prices schema mismatch, reading a network call too early).
- **Cover the other two doors.** Build page models and tests for the Domain Storefront and the Business Name Generator, then add the cross-door tests that compare prices and availability between doors.
- **Cover the rest of the API.** That's `list-tlds`, `suggested-tld-display-prices`, `tld-promotions`, `business-names/generate`, and `structured-domain-info`.
- **Get a staging environment.** Then only Smoke tests would run on production, as the plan intends. I'd also pace API requests to stay under the rate limit, and set CI retries to zero so flaky tests are visible.
- **Confirm the open questions with the team.** These include the error behavior for bad input, how the 63-character limit is meant to work, how premium domains are priced, and the A/B variant that loads 50 results at once.
- **Add the issues found during automation to FINDINGS.md:**
  - The TLD filter is ignored for most suggestions.
  - `INVALID_QUERY` is never returned.
  - The 63-character limit isn't enforced.
  - The paging cursor exposes internal data.
  - The WHOIS page throws a JavaScript error on every load.
  - The WHOIS page shows no error messages when its data fails.
- **Run the security suite** with written permission.

## My Quality Strategy for Wix Domains, in 5 Lines

1. Price and availability are what users pay for, so I test them hardest, and always against an independent source: the price list, and the registry's own RDAP.
2. One API feeds three different frontends, so every UI test checks the page against the API responses it actually received.
3. Bad input must never look buyable: no price and no purchase button on a domain that can't exist.
4. Tests check rules, not snapshots (at least one result, no more than the page size), because suggestions and prices change.
5. A failing test that finds a real problem stays failing until the product is fixed. I never weaken a test to make it pass.
