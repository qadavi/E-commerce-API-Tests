# E-commerce API Tests

## Status

Work in progress. Prioritization, coverage summary, findings and next steps
will be filled in as the test suite is built.

## Stack

- Cucumber.js as the BDD runner (Gherkin scenarios)
- Playwright APIRequestContext as the HTTP client

## Project structure

```
features/           Gherkin feature files
step_definitions/   Step implementations
support/            World, hooks and config
  config.js         Base URL and test credentials
  world.js          Custom World wrapping Playwright APIRequestContext
  hooks.js          API reachability check and per scenario data reset
cucumber.js         Cucumber profile and formatters
```

## How to run

```bash
npm install
npm start        # starts the API under test on http://localhost:3000
npm test         # runs the Cucumber suite
```

An HTML report is written to reports/cucumber-report.html.

## Test design notes

- All server state lives in memory and is global, so every scenario resets it
  through POST /api/__reset in a Before hook to stay independent.
- The suite runs sequentially. Order creation is protected by a global rate
  limit of 5 requests per 10 second window shared by all users, so running
  scenarios in parallel would make them interfere with each other.
- A BeforeAll hook checks that the API is reachable and fails fast with a
  clear message instead of letting every scenario time out.

## AI Usage Log

Short running notes. Full write-up at the end of the exercise.

- Compared Cucumber.js + Playwright APIRequestContext against playwright-bdd
  and chose the first one: no compile step, and the browser oriented features
  of playwright-bdd add nothing for API only testing.
- Read server.js in full instead of trusting the endpoint list in the README,
  then cross-checked the findings against the source.
- Scaffolded the base project structure, fixing two issues found while
  verifying it: cucumber 13 requires Node 22+ so it was pinned to 12.9.0, and
  an invalid --publish-quiet flag had to be removed.

## License
This project was developed as part of a technical test and does not have a license defined for commercial use.