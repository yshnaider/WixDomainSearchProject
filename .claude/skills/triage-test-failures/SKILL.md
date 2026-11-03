---
name: triage-test-failures
description: Triage failing Playwright API or UI tests. Groups failures, gathers evidence, and classifies each cause as a test bug, code bug, environment problem, real product issue, or needs confirmation, then acts on it. Use whenever API or UI tests fail.
argument-hint: '[test file or failure output]'
---

# Triage Test Failures

Input (optional): $ARGUMENTS

If there's no input, use the failures from the latest test run.

## Categories

| Category | Action |
| --- | --- |
| Test bug | Fix the test. |
| Code bug in the client, schema, fixture, or page model | Fix the code. |
| Environment problem | Stop and report it. |
| Real product issue | Leave the test failing and report it. |
| Needs confirmation (the expected behavior isn't documented) | Leave the test failing and ask the user. |

## Steps

1. Group the failures by likely cause.
2. Get evidence for each group:
   - **API:** resend the request from a script in the scratchpad, and read the full response without printing secrets. Vary one thing at a time.
   - **UI:** read the error context and page snapshot. Use the Playwright MCP tools if they're available.
3. Compare the evidence with `ARCHITECTURE.md`, `TEST_PLAN.md`, and any contract the user gave.
4. Classify each cause, and take the action for its category.
5. Report a table with the cause, tests affected, category, evidence, and action taken.

## Rules

- Don't change an expected result just to match actual behavior.
- Don't hide failures with skips, `test.fail`, retries, or longer timeouts.
- Don't count a pass against a stub as evidence.
- If you replace bad test data that exposed a real issue, keep a test for that issue.
- If a failure message doesn't say what failed and where, treat it as a code bug: add error handling that does, following the Error Handling section of `CLAUDE.md`.
