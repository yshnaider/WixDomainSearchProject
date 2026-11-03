---
name: add-ui-test
description: Add UI tests for a door or page from its TEST_PLAN.md subsections, using existing page models, and fix test and code bugs in a loop of at most 5 runs.
argument-hint: <door or page name, for example storefront>
disable-model-invocation: true
---

# Add UI Test

Door or page: $ARGUMENTS

Follow `.claude/rules/ui-rules.md`.

1. If a page model the tests need is missing from `src/ui/pages/` or `src/ui/components/`, stop and tell the user to run `/add-ui-page-model` first.
2. Read the door's subsections under UI Tests and UI Tests with API Recording in `TEST_PLAN.md` (if the plan has the second section), plus Test Data. Cover UI Cross-Door Tests only if the user asked. Don't cover Security Tests.
3. If live non-Smoke tests would run on production, say how many, and wait for confirmation. Mocked tests can run anywhere.
4. Put UI tests in `tests/ui/<door>.spec.ts`. Put API recording tests in `tests/ui/<door>.api-recording.spec.ts`, using `page.waitForRequest` and `page.waitForResponse`, with `page.route` only for failures and slow calls. Add a test for every plan row, tagged from the row's Type column, and note any row you leave out and why.
5. Add any missing locators or actions to the page model.
6. Run `npm run typecheck`, `npm run lint`, and `npm run format:check`, and fix any problems.
7. Run the loop below.
8. Run the tests once more to confirm the results are stable. If any result changes, treat that test as flaky and find the cause.
9. Report the pass and fail counts, real product issues with evidence, rows left out and why, and any page model changes.

## Loop

Repeat at most 5 times:

1. Run `npx playwright test tests/ui/<door>.spec.ts tests/ui/<door>.api-recording.spec.ts`.
2. If every remaining failure is a real product issue or needs confirmation, end the loop.
3. Use the triage-test-failures skill, and fix the test and code bugs it finds. If it finds an environment problem, stop and report it.

If test or code bugs remain after 5 runs, stop and report them.
