# E-commerce API Tests

## Status

11 scenarios implemented and passing: critical order flows, key business
rules, rate limiting, 404 edge cases and admin product authorization.

## Stack

- Cucumber.js as the BDD runner (Gherkin scenarios)
- Playwright APIRequestContext as the HTTP client

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
skipped to protect review time.

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

## Findings

- **Bug - missing ownership check on GET /api/orders/:id.** DELETE
  /api/orders/:id and PUT /api/orders/:id/status check that the caller is
  the order owner or an admin; GET /api/orders/:id does not. Any
  authenticated user can read any order's full details (items, total,
  owner) by id. Not trivially guessable (random UUID), but an
  inconsistent authorization pattern and a real information disclosure
  gap. Suggested fix: reuse the DELETE handler's ownership check here.
  server.js is the system under test and was left unmodified on purpose;
  documenting instead of patching it.
- **Bug - GET /api/orders pagination.totalCount is wrong.** It is set to
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

- Compared Cucumber.js + Playwright APIRequestContext against
  playwright-bdd and chose the former for API-only testing.
- Read server.js in full instead of trusting the README's endpoint list;
  cross-checked its findings against the source myself.
- Scaffolded the project (package.json, cucumber.js, support/, step
  definitions); fixed two issues it introduced (cucumber 13 needing Node
  22+, an invalid --publish-quiet flag).
- Wrote the first 4 critical scenarios from a priority list I gave it;
  its review of that work surfaced the GET ownership-check bug, which I
  asked it to document rather than silently patch into server.js.
- Asked for a self-review of scenario assertions; it correctly flagged
  that negative-path scenarios only checked the HTTP response, not the
  resulting state, and added side-effect checks.
- It proposed a plan for the remaining time; I overrode it with my own
  risk/effort/time table, cutting notification and pagination tests in
  favor of documenting the underlying bugs.
- It had written a notification test that only checked the immediate
  "pending" state; I judged that timing dependent and had it removed
  rather than keep a flaky test.
- Closed the admin product gap it had flagged as skipped, reusing the
  existing World/step patterns.
- During a "fresh clone" review, it found (by accident, deleting
  node_modules) that npx cucumber-js can resolve to an unrelated public
  package if run before npm install; asked it to document the risk. It
  also caught a real fragility: one scenario verified order state by
  reading as a user who should not have access, which only worked
  because of the documented GET bug - fixed to read as the actual owner.
- With ~20 minutes left, asked it to move login and product lookup from
  free functions into World methods (loginAs, findProductByName) for
  reuse across step files, then to re-check the write-up against the
  brief; it caught that the required "what would you do with more time"
  section was missing entirely and added it.

## License
This project was developed as part of a technical test and does not have a license defined for commercial use.