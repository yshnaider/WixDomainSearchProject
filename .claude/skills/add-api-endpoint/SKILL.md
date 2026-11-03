---
name: add-api-endpoint
description: Add a Public Domain Search API endpoint to the API client, with Zod schemas built from real responses and 2 or 3 sanity tests.
argument-hint: <method> <path> [parameters, body, sample response, errors]
disable-model-invocation: true
---

# Add API Endpoint

Endpoint details: $ARGUMENTS

Follow `.claude/rules/api-rules.md`.

1. Gather the method, path, parameters, body, sample response, and errors from the input, `ARCHITECTURE.md`, and `TEST_PLAN.md`. Ask if the method or path is missing. Check that the endpoint is served from `BASE_URL` in `.env`, using a script that prints only whether the hosts match. If it isn't, stop and ask.
2. Send a few real requests from a script in the scratchpad: at least one valid and one invalid request. Use the exact parameter formats the client will send (for example, unencoded `tlds[]` brackets). Read credentials from `.env`, and mask them in any output.
3. Add the Zod schemas and their `z.infer` types to `src/api/domainSearch/domainSearch.schemas.ts`: a success schema built from the real responses, and an error schema for 4xx responses. Mark fields you haven't seen in a real response as inferred. Create the file if it's missing, and install `zod` as a dev dependency if it isn't installed.
4. Add the path, a params interface, and the method to `src/api/domainSearch/DomainSearch.ts`. The method sends the request and returns the response, with no assertions or parsing, and doesn't throw on 4xx or 5xx. Create the class if it's missing.
5. Create `tests/api/<endpoint-name>.spec.ts` with only 2 or 3 `@sanity` tests that validate the response body with the schemas through `parseResponse`.
6. Run `npm run typecheck`, `npm run lint`, and `npm run format:check`, and fix any problems. Then run `npx playwright test tests/api/<endpoint-name>.spec.ts --workers=1`. If a test fails, use the triage-test-failures skill.
7. Report what was added, the test results, and any differences between the real responses and the contract.
