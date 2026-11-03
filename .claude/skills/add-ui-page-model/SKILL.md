---
name: add-ui-page-model
description: Build a Page Object for a page or component by inspecting the live page with the Playwright MCP, then verify it with 2 or 3 sanity tests in a loop of at most 5 runs.
argument-hint: <page or component name> <url>
disable-model-invocation: true
---

# Add UI Page Model

Page or component, and URL: $ARGUMENTS

Follow `.claude/rules/ui-rules.md`.

If the Playwright MCP tools aren't available, stop and tell the user to enable the `playwright` server in `.mcp.json`.

1. Open the URL with the Playwright MCP, and take a snapshot. If the URL is missing, ask for it.
2. Interact only as much as needed to see each state. Don't sign in, buy anything, or select **Get it**. Use only non-hostile input.
3. Note each element's role, accessible name, and changing states.
4. Put page models in `src/ui/pages/` and shared components in `src/ui/components/`. Reuse existing components.
5. Write a class that takes a `Page`, with `readonly` locators set in the constructor, role-based where possible, and methods named after user actions. After navigation or rendering, wait on a unique locator to confirm the page has loaded. Don't add assertions or fixed waits.
6. Add the model to `src/fixtures/ui.fixture.ts`. Create the fixture file if it's missing.
7. Create `tests/ui/<name>.spec.ts` with only 2 or 3 `@sanity` tests.
8. Run `npm run typecheck`, `npm run lint`, and `npm run format:check`, and fix any problems.
9. Run the loop below.
10. Run the tests once more. The model is verified only when both runs pass.
11. Report the files, locators, actions, test results, and any differences from `ARCHITECTURE.md`.

## Loop

Repeat at most 5 times:

1. Run `npx playwright test tests/ui/<name>.spec.ts`.
2. If every remaining failure is a real product issue or needs confirmation, end the loop.
3. Compare each failure with the live DOM through the Playwright MCP, and fix the model or the test. If the page itself looks wrong, use the triage-test-failures skill.

If model or test bugs remain after 5 runs, stop and report them.
