---
name: cover-api-endpoint-with-tests
description: Cover an existing API endpoint with a test for every row of its TEST_PLAN.md subsection, validate every response with its Zod schemas, and fix test and code bugs in a loop of at most 5 runs.
argument-hint: <endpoint-name, for example suggest-domains>
disable-model-invocation: true
---

# Cover API Endpoint with Tests

Endpoint: $ARGUMENTS

Follow `.claude/rules/api-rules.md`.

1. If `src/api/domainSearch/DomainSearch.ts` has no method for this endpoint, stop and tell the user to run `/add-api-endpoint` first.
2. Read the endpoint's subsection under API Tests in `TEST_PLAN.md`, plus Test Data. If there's no subsection, stop and say so. Don't cover Security Tests.
3. If `BASE_URL` points to production, say how many non-Smoke tests would run there, and wait for confirmation. Ask if you can't tell.
4. Add a test for every plan row to `tests/api/<endpoint-name>.spec.ts`, tagged from the row's Type column. Validate every response body with `parseResponse` and the endpoint's Zod schemas: the success schema for 2xx responses and the error schema for 4xx responses. Don't check only the status. If a row can't be automated, leave it out and note why.
5. Run `npm run typecheck`, `npm run lint`, and `npm run format:check`, and fix any problems.
6. Run the loop below.
7. Run the tests once more to confirm the results are stable. If any result changes, treat that test as flaky and find the cause.
8. Report the pass and fail counts, real product issues with evidence, rows left out and why, and any schema or client changes.

## Loop

Repeat at most 5 times:

1. Run `npx playwright test tests/api/<endpoint-name>.spec.ts --workers=1`.
2. If every remaining failure is a real product issue or needs confirmation, end the loop.
3. Use the triage-test-failures skill, and fix the test and code bugs it finds. If it finds an environment problem, stop and report it.

If test or code bugs remain after 5 runs, stop and report them.
