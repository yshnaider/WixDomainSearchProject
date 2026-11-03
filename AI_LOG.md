# AI Log

How I used AI on this project: which tools, what I asked for, where the AI went wrong, and what I kept for myself.

## Tools

- **Claude Code** in VS Code, running Claude Opus 5.5. It wrote the documents, the test code, and the project configuration.
- **Playwright MCP server** (`@playwright/mcp`, pinned in `.mcp.json`). This let the AI open the live Wix pages, read their structure and network traffic, and build page models from what it saw rather than from guesses.
- **My own agent configuration**, committed in the repo:
  - `CLAUDE.md`: the project layout, the required code checks, code style, and error handling.
  - `.claude/rules/api-rules.md` and `ui-rules.md`: test rules, such as no fixed waits, no hard-coded test data, no secrets in logs, and never weakening a failing test.
  - `.claude/skills/`: five workflows. These add an API endpoint, cover an endpoint with tests, build a UI page model, add UI tests, and triage failures. Each test loop runs at most 5 times and stops when only real product issues remain.

## Key Prompts

I worked in steps, each with a detailed prompt that set the facts, the rules, and the limits. These three shaped the whole project. Each is shown in full, exactly as I sent it; click a prompt to expand it.

1. **Architecture:** the facts about the four services, what to label inferred, and the structure of ARCHITECTURE.md, including a Mermaid diagram that must parse.

<details>
<summary>ARCHITECTURE.md prompt</summary>

```text
Please create`ARCHITECTURE.md`file with an architecture overview of four Wix platform services that help users find and evaluate domain names. Write for engineers who need an overview of these services.

## Rules

- Cover components, responsibilities, and how they interact. Don't include JSON samples or response field tables. Those live in a separate `API.md`, so link to it instead.
- Purchase flows are out of scope.
- Use only the facts in this prompt. Don't invent endpoints, fields, or behavior.
- Label anything marked "inferred" below as inferred in the document.
- Don't add an Open Questions section.

## Services

### Domain Storefront (frontend door)

1. The user types a domain name, including a TLD. The page offers a list of clickable suggested TLDs, or the user can enter their own. These likely come from `tld-promotions?limit={limit}` (inferred). When the user clicks one it adds this tld to the domain the user typed or change the tld typed by the user.
2. The user presses Enter.
3. The page checks the domain with `check-domain-availability`. This step's position in the flow is inferred.
4. The page displays a paginated list of suggestions from `suggest-domains`, with an option to load more at the bottom(if there are more results).
5. Two of the results appear first, labeled **Best match** and **Great alternative**.

Every result shows its original price and discount.

### Business Name Generator (frontend door)

1. The user describes their business in a text box and selects **Generate names**.
2. The page sends the description as the query in a POST request to `business-names/generate`, which returns a list of business names for the domains. Its a clickable list.
3. For each name, the page calls `suggest-domains` with the generated `name` value as `query`.
4. The page displays the names, and the user can navigate between them.
5. Each name shows a list of paginated domain suggestions for this name(domain + tld). Each suggestion shows its original price and price after discount, and has a **Get it** button for purchasing the domain.

Example: "grocery store" can produce the theme Groovory, with the suggestions `groovory.co.il` and `thegroovory.net` and also the theme harvest with the suggestions of harvest.com and the healthyharvest.net.

This flow is confirmed.

### WHOIS Lookup (frontend door)

The user enters a domain name or URL to check the domain's owner, availability, and registration info.

1. The page checks the domain with `check-domain-availability`.
2. The `available` field determines the result:
   - `available: false`: the domain doesn't exist. Show the exact match first, followed by a paginated list of priced alternatives.
   - `available: true`: the domain exists. Show its owner and registration info from `structured-domain-info/whois`, plus a list of available alternatives to purchase.


### Public Domain Search API (API layer)

This is the logical name for the endpoints below, which are served under several path prefixes on `https://www.wix.com`.

## Endpoints

| Endpoint | Description | Used by |
| --- | --- | --- |
| `/_serverless/premium-domains-serverless/domain-tlds/list-tlds` | Returns all TLDs | All doors |
| `/_serverless/domains-serverless-services/v1/suggested-tld-display-prices` | Returns suggested TLDs and their prices | All doors |
| `/domain-search/v2/suggest-domains?query={query}&paging.limit={limit}` | Returns paginated domain suggestions for `query`, without prices | All doors |
| `/_serverless/domains-serverless-services/v1/tld-promotions?limit={limit}` | Returns the TLDs the system promotes | All doors |
| `/_serverless/domains-serverless-services/v1/business-names/generate` | POST request that returns generated business names for a description | Business Name Generator |
| `/domain-search/v2/check-domain-availability?domain={domain}` | Returns a domain's availability and premium status | Domain Storefront, WHOIS Lookup |
| `/_serverless/domains-serverless-services/v1/structured-domain-info/whois?domain={domain}&parse={bolean}` | Returns a domain's parsed and raw WHOIS data | WHOIS Lookup (inferred) |

## Pricing

`suggest-domains` doesn't return prices. The doors get all prices from `suggested-tld-display-prices`, which covers every TLD that `suggest-domains` can return. Each suggestion's price comes from its TLD.

## Tag Manager

All three doors also call `/_api/tag-manager/api/v1/tags/hosts/PREMIUM_DOMAINS`. It isn't part of the domain logic, so document it as a platform dependency, not as part of the Public Domain Search API.

Its response suggests that it provides tag manager configuration for the `PREMIUM_DOMAINS` host, and that the doors use it to decide which tracking and marketing tags they can load (inferred). Link to `API.md#tag-manager` for the sample response.

## Document structure

1. **Title and introduction:** State that purchase flows are out of scope. Add a table with each service's type and purpose, and a short summary of which endpoints the doors share and which are door-specific.
2. **System Diagram:** Add a Mermaid `flowchart TD` that shows:
   - The user connecting to each door, grouped in a "Frontend doors" subgraph.
   - A "Public Domain Search API" subgraph with a nested "Shared by all doors" subgraph.
   - A "Platform dependencies" subgraph with the Tag Manager.
   - One edge from each door to the shared subgraph, one edge from the doors subgraph to the Tag Manager, and individual edges for the door-specific endpoints.
3. **Frontend Doors:** Describe each door's flow. Link to the Pricing section for how prices are added.
4. **Public Domain Search API:** Include the Endpoints table and the Pricing section.
5. **Platform Dependencies:** Add a Tag Manager subsection.

Check that the Mermaid diagram parses before you finish.
```

</details>

2. **Test plan:** the interview brief, the facts to follow, the API contracts, the "no magic numbers" rule, the document structure, the areas to cover, and the safety rules for test data and production.

<details>
<summary>TEST_PLAN.md prompt</summary>

```text
Create TEST_PLAN.md for the services described in ARCHITECTURE.md. Treat ARCHITECTURE.md as the source of truth, and read it before you start.

## Context

This is an interview task with this brief:

"Write the test plan you'd want before owning these surfaces. Your scope, your approach, your format. Explain what you prioritized and why, and what you deliberately left out."

The task should take about 40 minutes, and I'll need to stand behind every line afterwards. Write it in the first person, as my own work. Keep it short and easy to read, with no filler. Use shared test data tables instead of repeating inputs.

## Facts to Follow

- Purchase flows are out of scope. Only check that the Get it button appears.
- Label anything marked as inferred in ARCHITECTURE.md as inferred in the plan.
- Use only documented behavior. Don't invent endpoints, fields, status codes, or limits.
- Error behavior and any input limits not listed under API Endpoints aren't documented. For bad input, use a proposed "clean rejection": no 500 error, a clear message, the user's text kept, and no price or Get it on an invalid domain. In the API, that means a 4xx response. Say that this needs confirming with the team.

## API Endpoints

For these two endpoints, use the details below instead of the ones in ARCHITECTURE.md.

### Suggest Domains

GET https://www.wixapis.com/domain-search/v2/suggest-domains

Query parameters:

- query (string): required, and can't be empty. Min: 1 characters Max: 100 characters.
- tlds[] (string, repeated once per TLD): TLDs without the dot, such as tlds[]=com&tlds[]=net. Send the brackets unencoded, because the API ignores tlds%5B%5D.
- limit (number): 20 or less.
- maxLength (number). Maximum number of characters for the domain name, excluding the TLD.
- paging.limit (number): 1 to 50.
- paging.cursor (string): the cursor for the next page, taken from pagingMetadata.cursors.next.

### Check Domain Availability

GET https://www.wixapis.com/domain-search/v2/check-domain-availability

Query parameter:

- domain (string). Min: 3 characters Max: 63 characters.

## No Magic Numbers

Numbers such as 10 results or 6 suggested TLDs aren't requirements, so expected results must not depend on them. Instead, expect:

- At least 1 result.
- No more results than the requested limit.
- The load more option only when pagingMetadata.count field of the response exceed the paging.limit request param of domain-search/v2/ endpoint.
- There should be data integrity between the api results and the ui. Call the relevant api, compare the results with the ui.

Numbers that a test chooses as inputs are fine.

## Document Structure

Start with:

1. What I Prioritized, with the reasons.
2. What I Left Out, with the reasons.
3. Before I Start: assumptions and things to confirm.
4. How the Tests Run: when the Smoke, Sanity, Regression, and Security suites run.
5. Test Data: shared Known Domains and Bad and Unusual Input tables.

Then group all tests into these sections:

1. UI Tests: a subsection for each door. These check only what the page shows. Use API calls for data integrity between UI and API.
3. UI Cross-Door Tests: check that the doors agree with each other, and the results for same input is the same(domain suggestions, prices, availability).
4. API Tests: a subsection for each endpoint. Every parameter should be covered(valid, edge, out of range) values. Pagination if exists. A request without api key to test security.
5. Security Tests(not many).

End with Done When: the exit criteria.

In every table except Security, add a Type column with Smoke, Sanity, Edge, or Failure.

## Test Requirements

Follow UI and API testing best practices, and cover smoke, sanity, regression, edge case, and failure testing.

Every test must be specific: give the exact input, prompt, request, and a clear expected result.

Cover these areas:

- Basic user flow(must), e.g.: The user enters a string for the domain name in storefront searchbox, presses enter, the page shows results and pricing policy for each result, user enters another string and gets results again.
- Search boxes and text boxes: empty input, spaces only, trimming, letter case, pasted text, long input, line breaks, and non-English text.
- Bad input: random strings, numbers, special characters, emoji, hidden characters, illegal domain names, label length limits, fake or reserved TLDs, and IP addresses. Include legal but unusual domains that must be accepted.
- Known existing domains: confirm that each is registered with a public source, and state the date you checked. Include different registries, multi-level TLDs, a Unicode domain, and a restricted TLD. Check the domain's state and the sections shown, not values that change.
- Prices: suggest-domains has no prices, so check that prices are matched by TLD, that every suggested TLD has a price, that multi-level TLDs such as co.il use the right price, that each door shows the same price, that discounts display correctly, and how premium domains are priced.
- Availability: check the available field against an independent RDAP source. An invalid domain must never look buyable.
- Business Name Generator: one suggest-domains call per theme, no mixing between themes, a separate load more for each theme, and special characters encoded correctly in theme names.
- Timing: late responses must not replace newer results.
- Failures: 500, 429, timeouts, invalid JSON, a missing price, partial WHOIS data, one theme failing, and load more failing.
- Security: XSS through all three inputs, WHOIS data, and theme names; internal URLs in WHOIS Lookup; command injection; parameter injection; and personal data leaking to the URL or third parties.
- SQL injection: include it at low priority, and explain why. List the exact payloads, and don't use time-delay payloads.
- Prompt injection: the document doesn't say whether the generator uses an LLM, so say so. List the exact prompts, including one sent through the excluding field.

## Test Data and Safety Rules

- Don't hard-code unregistered domains. Generate a new one each run, such as qa-test-7x2k9q4m.com, and confirm it with RDAP.
- Don't assert exact generated names. "pet store" can produce FurryNest, but it doesn't have to.
- Only Smoke tests run on production, at a low rate. Other live tests need staging, and security tests also need written permission.
- Don't send test traffic to Wix while writing this plan.

Before you finish, check that every table is well formed, every internal link works, and no expected result contradicts ARCHITECTURE.md.
```

</details>

3. **Project rules:** `CLAUDE.md` and the API and UI rules files, which every later session followed.

<details>
<summary>Project rules prompt</summary>

```text
Create the project rules. Don't use the paths frontmatter, so that every rule is active from the start of each session.

## CLAUDE.md

Create this file in the project root, covering:

- This is a Playwright and TypeScript project for e2e and API tests. src/ holds API clients, schemas, fixtures, and config. tests/api/ holds API tests. tests/ui/ holds e2e tests.
- ARCHITECTURE.md describes the system under test, and TEST_PLAN.md is the test plan. Use them when generating test cases.
- The project has ESLint and Prettier configs. After generating or changing code, run npm run typecheck, npm run lint, and npm run format:check, and fix any problems.
- Use best code practices, such as SOLID. Use design patterns only when they bring value.
- Keep the code simple and self-explanatory.
- Add comments only when the code is too complex to explain itself. Don't comment on obvious things.

## .claude/rules/api-rules.md

Apply these when writing or changing API tests, API modules, or schemas:

- Tag every test with @smoke, @sanity, or @edge, matching the Type column in TEST_PLAN.md.
- Keep tests independent, with no shared state or dependence on test order.
- Don't assert numbers that aren't requirements. Check rules instead, such as at least 1 result and no more than the requested limit.
- API methods only send requests and return responses. Assertions belong in the tests, so negative tests can receive 4xx responses.
- Keep Zod schemas next to their API module, and derive types with z.infer.
- Check real responses before writing a schema. Label anything unconfirmed as inferred.
- Run new API tests against the real API. A pass against a stub is weak evidence.
- Never weaken a test to make it pass. If a test finds a real problem, leave it failing and report it.
- Never print, log, or commit .env values.
- Keep traces off for API tests, because traces record request headers.
- Run only Smoke tests and non-hostile input on production. Security tests need staging or written permission.

## .claude/rules/ui-rules.md

Apply these when writing or changing UI tests or page objects:

- Tag every test with @smoke, @sanity, @edge, or @failure, matching the Type column in TEST_PLAN.md.
- Keep tests independent, with no shared state or dependence on test order.
- Don't assert numbers that aren't requirements. Check rules instead.
- Use Page Objects, prefer playwright built in locators, and web-first assertions.
- Use unique locators or loading element to wait for the page to load/render.
- Don't use fixed waits.
- Never weaken a test to make it pass. If a test finds a real problem, leave it failing and report it.
- Never print, log, or commit .env values.
- Run only Smoke tests and non-hostile input on production. Security tests need staging or written permission.
```

</details>

After that, I built the tests by invoking the skills, such as `/add-api-endpoint`, `/cover-api-endpoint-with-tests`, and `/add-ui-page-model`. When I had a new requirement, I added it to the rules, for example "use error handling where needed" and "don't hard-code strings or numbers in tests".

## Where the AI Was Wrong, and How I Caught It

I caught these by reviewing the generated code, and corrected them by giving the AI explicit instructions:

| What the AI did | What I did |
| --- | --- |
| It hard-coded test parameters and inputs directly in the tests. | I told it not to use hard-coded values, so all test data and constants now live in shared, named places. |
| It relied too much on mocked tests. | I told it to prioritize testing the real system's behavior. |
| It didn't use Playwright's built-in locators enough. | I told it to prefer them over other locators. |
| It didn't wait on unique locators to confirm that a page had loaded or rendered. | I told it to use unique locators for load and render checks. |

## What I Changed or Threw Away

- **Removed tests:** the tests for the deprecated `limit` parameter. I left out SD-08 because suggestions change between calls, so "same results" can't be checked.
- **Refactored:** every hard-coded value moved into shared test data, API constants, and schema enums. To prove the refactor changed nothing, I recorded every request against a local server before and after: all 77 were identical.
- **Restructured:** CA-03 changed from one test with steps to one test per domain, so one failure can't hide the others. The registry lookup moved from RDAP-only to RDAP or WHOIS, because `.il` has no RDAP.
- **Deleted:** all temporary verification tests, and the network captures that contained session tokens.

## What I Chose Not to Hand to AI

- **Exploratory testing.** The bugs in FINDINGS.md (spaces-only search, no API key required, wrong `hasNext`) came from my own hands-on testing.
- **Judgment calls about the product.** I decided:
  - whether `.gov` should be rejected,
  - whether to accept the WHOIS redirect,
  - how to tag failure tests,
  - and what counts as a real bug versus a plan mistake.
- **Permission to touch production.** The coverage skills make the AI ask before running non-Smoke tests against production, and I decided each time.
- **Secrets.** The API key stays in my `.env`. The AI was only allowed to check that the variables exist, never to read their values.
- **Commits and pushes.** I reviewed the changes and committed them myself.
