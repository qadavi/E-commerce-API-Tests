# E-commerce API Tests

## Status

Work in progress. First critical scenarios (order creation, retrieval,
cross-customer access, missing auth) are implemented and passing. Full
prioritization write-up, coverage summary and next steps will be filled in
as the suite grows.

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

## Findings

- **Bug - missing ownership check on GET /api/orders/:id.** DELETE
  /api/orders/:id and PUT /api/orders/:id/status both check that the caller
  is the order owner or an admin. GET /api/orders/:id does not: any
  authenticated user (customer1, customer2, or admin) can read the full
  details of any order, including items, total value and the owner's
  username, as long as they know or guess the order id. Order ids are random
  UUIDs, so this is not trivially exploitable by guessing, but it is an
  inconsistent authorization pattern versus the other two endpoints and a
  real information disclosure gap between customers. Suggested fix: apply
  the same ownership check used in the DELETE handler to this route. Not
  covered by an automated test yet; the critical-path suite tests
  cross-customer authorization through DELETE instead, where the check does
  exist. This file is server.js, the mock API under test - left unmodified
  on purpose, since patching the system under test is out of scope for a
  testing exercise; documenting it here instead.

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
- Wrote the first 4 critical scenarios (create order, get order,
  cross-customer cancel, no-auth) and their step definitions from a
  priority list I provided; ran the suite myself to confirm all pass before
  accepting them; the missing-ownership-check-on-GET finding came out of
  that review, which I asked to be documented rather than silently patched.

## License
This project was developed as part of a technical test and does not have a license defined for commercial use.