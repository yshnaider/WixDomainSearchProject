# API Test Rules

Apply these when writing or changing API tests, API modules, or schemas.

## Tests

- Tag every test with `@smoke`, `@sanity`, or `@edge`, matching the Type column in `TEST_PLAN.md`.
- Keep tests independent: no shared state, and no dependence on test order.
- Don't assert numbers that aren't requirements. Check rules instead, such as "at least 1 result" and "no more than the requested limit".
- Run new API tests against the real API. A pass against a stub is weak evidence.
- Never weaken a test to make it pass. If a test finds a real problem, leave it failing and report it.

## API Modules and Schemas

- API methods only send requests and return responses. Assertions belong in the tests, so negative tests can receive 4xx responses.
- Keep Zod schemas next to their API module, and derive types with `z.infer`.
- Check real responses before writing a schema. Label anything unconfirmed as inferred.

## Safety

- Never print, log, or commit `.env` values.
- Keep traces off for API tests, because traces record request headers.
- Run only Smoke tests and non-hostile input on production. Security tests need staging or written permission.
