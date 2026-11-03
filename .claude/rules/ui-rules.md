# UI Test Rules

Apply these when writing or changing UI tests or page objects.

## Tests

- Tag every test with `@smoke`, `@sanity`, `@edge`, or `@failure`, matching the Type column in `TEST_PLAN.md`.
- Keep tests independent: no shared state, and no dependence on test order.
- Don't assert numbers that aren't requirements. Check rules instead.
- Don't hardcode strings or numbers in tests. Put test inputs in `src/fixtures/testData.ts`, and locators and page text in the page models. Test titles, tags, and assertion messages can stay inline.
- Never weaken a test to make it pass. If a test finds a real problem, leave it failing and report it.

## Page Objects and Locators

- Use Page Objects.
- Prefer Playwright's built-in locators (`getByRole`, `getByLabel`, `getByText`, `getByTestId`) and web-first assertions.
- Wait for the page to load or render by waiting on a unique locator or a loading element.
- Don't use fixed waits.
- Don't wrap locators or actions in try/catch to hide failures. If a page model can detect a failed state, such as an error message instead of results, throw an error that names that state.

## Safety

- Never print, log, or commit `.env` values.
- Run only Smoke tests and non-hostile input on production. Security tests need staging or written permission.
