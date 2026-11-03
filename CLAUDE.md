# Wix Domain Search Tests

Playwright and TypeScript project for end-to-end and API tests of Wix domain search.

## Layout

- `src/`: API clients, schemas, fixtures, and config.
- `tests/api/`: API tests.
- `tests/ui/`: end-to-end tests.
- `ARCHITECTURE.md`: the system under test.
- `TEST_PLAN.md`: the test plan. Use it, with `ARCHITECTURE.md`, when generating test cases.

## Checks

The project has ESLint and Prettier configs. After generating or changing code, run these and fix any problems they report in the changed files:

```sh
npm run typecheck
npm run lint
npm run format:check
```

## Code Style

- Follow good practices such as SOLID. Use a design pattern only when it brings clear value.
- Keep code simple and self-explanatory.
- Comment only code that's too complex to explain itself. Don't comment on obvious things.
