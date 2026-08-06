# E-commerce API Tests

## Status

11 scenarios implemented and passing: critical order flows, key business
rules, rate limiting, 404 edge cases and admin product authorization.

## Stack

- Cucumber.js as the BDD runner (Gherkin scenarios)
- Playwright APIRequestContext as the HTTP client

## Prerequisites

- Node.js 20, 22 or 24+ (cucumber@^12.9.0 requires one of these; tested
  on Node 20.15.0) and npm.
- `npm install` installs @playwright/test like any other devDependency;
  no extra step is needed. Unlike typical Playwright projects, you do
  NOT need to run `npx playwright install` (browser binaries) - this
  suite only uses Playwright APIRequestContext as an HTTP client, never
  a real browser.

## How to run

```bash
npm install
npm start        # starts the API under test on http://localhost:3000
npm test         # runs the Cucumber suite
```

HTML report: reports/cucumber-report.html.

Warning: always run `npm install` before testing. A same-named, unscoped
`cucumber-js` package exists on the public npm registry (not
`@cucumber/cucumber`) as a dependency-confusion placeholder. `npm test`
is safe (it resolves the local binary), but running `npx cucumber-js`
directly on a machine with no prior install can silently fetch that
unrelated package instead.

## Scenarios (11)

features/orders.feature
- Placing an order with sufficient stock (@critical)
- Retrieving my own order (@critical)
- A different customer cannot cancel my order (@critical)
- Placing an order without authentication is rejected (@critical)
- Placing an order that exceeds available stock is rejected (@business-rule)
- Exceeding the order-creation rate limit is rejected (@rate-limit)
- An admin can update the order status (@business-rule)
- Retrieving a non-existent order returns 404 (@edge-case)
- Retrieving a non-existent product returns 404 (@edge-case)

features/products.feature
- A customer cannot create a product (@admin)
- Admin creating a product without a price is rejected (@admin)

## Prioritization strategy

Decision weights, highest to lowest: protects revenue/the core business
flow, named explicitly in the brief, protects security/data, cheap to
build reliably, flaky risk, setup complexity.

| Phase | Scenarios | Status |
|---|---|---|
| Mandatory (business-critical) | create order, get order, cross-customer 403, no-auth 401, insufficient stock | done |
| High priority (named in the brief, cheap) | rate limit 429, 404s (order, product) | done |
| If time allowed | admin order status update | done |
| If time allowed | admin product create (403 for customer, 400 validation) | done |
| Dropped | async notification polling, pagination/filter coverage | bugs documented instead, see Findings |

Admin product coverage is create only; PUT /api/products/:id (edit) was
skipped to protect review time. Picked over pagination/notifications for
this slot because it reuses the existing auth/World patterns almost
entirely, so it was the cheapest remaining item, not because it is the
single highest-risk one left.

Principle: test what protects the business first, then what the brief
explicitly asks for, then whatever is fast and safe. Skip what is risky or
complex. In three words: Business -> Brief -> Cost-benefit.

## Technical decisions

- Cucumber.js over playwright-bdd: no compile step, and playwright-bdd's
  browser-oriented features (parallel workers, trace viewer) add nothing
  for API-only testing.
- Suite runs sequentially, not in parallel: server.js keeps all state
  (products, orders, rate-limit log) in memory and global, and the order
  creation rate limit is shared across all users.
- Every scenario resets server state via POST /api/__reset in a Before
  hook, so scenarios stay independent regardless of run order.
- A BeforeAll hook checks the API is reachable and fails fast with a
  clear message instead of letting every scenario time out individually.
- Negative-path scenarios (cross-customer cancel, insufficient stock) also
  assert the side effect did not happen (order still "pending", stock
  unchanged), not just the HTTP response, to catch a check-after-mutation
  ordering bug a response-only assertion would miss.
- Async notification polling and orders pagination/filtering were left
  untested: the former needs a real polling loop against a 2s delay
  (flaky risk for the time available), the latter needs multi-order,
  multi-status seed data. The pagination code path was still read and a
  bug found in it (see Findings) instead of testing around it.
- Retry (cucumber.js) is scoped to @rate-limit only, not the whole suite:
  it is the one scenario with a real timing dependency (6 sequential
  calls must land in the same 10s window). Every other scenario has run
  green on the first try every time in this session, so a blanket retry
  would just risk hiding a future real, deterministic bug as "flaky".
  Safe even for @rate-limit because every attempt goes through the same
  Before-hook reset, so a retry cannot pass by accident on leftover state.

## Findings

Severity is my own read, not a formal triage; both would be a ticket, not
a release blocker, given this is a mock/take-home API.

- **Bug - missing ownership check on GET /api/orders/:id.** (Severity:
  medium - real data exposure between customers, but not guessable.)
  DELETE
  /api/orders/:id and PUT /api/orders/:id/status check that the caller is
  the order owner or an admin; GET /api/orders/:id does not. Any
  authenticated user can read any order's full details (items, total,
  owner) by id. Not trivially guessable (random UUID), but an
  inconsistent authorization pattern and a real information disclosure
  gap. Suggested fix: reuse the DELETE handler's ownership check here.
  server.js is the system under test and was left unmodified on purpose;
  documenting instead of patching it.
- **Bug - GET /api/orders pagination.totalCount is wrong.** (Severity:
  low - wrong number shown to the client, no data exposure or data loss.)
  It is set to
  orders.length, the raw count of every order for every user, ignoring
  both the ownership and ?status= filters just applied to build data.
  Client-side pagination built on this value would be wrong. Suggested
  fix: compute it from filtered.length instead.
- Session tokens never expire (in-memory map, no TTL or logout endpoint).
  Not a bug for this exercise's scope, but worth flagging for a real
  system.

## Next steps

With 2 more hours:
- Automate the async notification flow properly, with a real polling
  helper (timeout + interval) instead of a fixed wait.
- Automate GET /api/orders pagination/status filtering, including a
  regression test for the totalCount bug found above.
- Add PUT /api/products/:id (edit) coverage and an invalid-status
  negative case for PUT /api/orders/:id/status.
- Add an invalid/malformed-token auth case (only "missing token" is
  covered today).

With 4 more hours:
- Concurrency beyond the rate limiter: two customers racing to buy the
  last units of a low-stock product, to check for overselling.
- Response schema validation (ajv/zod) instead of ad hoc property checks,
  so a shape change anywhere fails loudly.
- Negative tests for malformed request bodies (wrong types, extra
  fields, oversized payloads).

With 8 more hours:
- Full endpoint x role x edge-case coverage matrix.
- Contract testing against an OpenAPI spec, if one existed.
- CI wiring (explicitly out of scope for this exercise) and a basic
  load/performance check around the rate limiter.

## AI Usage Log

This section is necessarily self-reported (the brief asks for a summary,
not a transcript). Where a claim below is checkable against the repo
itself rather than taken on faith, the file/artifact is named.

- Architecture: Cucumber.js + Playwright APIRequestContext over
  playwright-bdd. Checkable: package.json has @cucumber/cucumber and
  @playwright/test only, no playwright-bdd dependency or bddgen step.
- Read server.js in full rather than trusting the README's endpoint
  list. Checkable: both Findings entries (ownership check, totalCount)
  are code-reading bugs with no corresponding automated test, which is
  consistent with being found by reading, not by black-box probing.
- Scaffolded the project structure. Checkable: @cucumber/cucumber is
  pinned to ^12.9.0 in package.json (12.x supports Node 20, 13.x needs
  22+), and cucumber.js has no --publish-quiet flag (not a valid option
  on this version).
- Wrote the first critical scenarios from a priority list. Checkable:
  features/orders.feature @critical tag covers exactly create/get/
  cross-customer/no-auth.
- Added side-effect assertions to the negative-path scenarios after a
  requested self-review. Checkable: the cross-customer-cancel and
  insufficient-stock scenarios both assert post-attempt state, not just
  the HTTP response.
- Closed the admin-product gap. Checkable: features/products.feature and
  step_definitions/products.steps.js.
- Moved login/product-lookup into World methods for reuse. Checkable:
  support/world.js has loginAs and findProductByName; auth.steps.js has
  no local login function anymore.
- Scoped retry to the one timing-sensitive scenario. Checkable:
  cucumber.js has --retry-tag-filter @rate-limit, not a blanket retry.
- Not independently checkable from the repo, taken on my word: that a
  notification-polling test was written and then removed for being too
  timing dependent (no trace of it remains by definition), and the
  back-and-forth on prioritization ordering (rate limit vs admin vs
  pagination) before landing on the final scope.

## License
This project was developed as part of a technical test and does not have a license defined for commercial use.
