# Browser tests

Run `pnpm test:e2e` for all browser coverage. It runs the general suite and then
Opening Stock with separate disposable databases. Arguments such as a spec path,
`--grep`, `--list`, and `--reporter` are forwarded to both configurations. A filter
matching just one suite runs that suite; matching neither fails normally. When
`MASANAO_E2E_DATABASE_PATH` is supplied, the runner appends `.general.db` and
`.opening-stock.db` so the suites still use separate databases. An explicit
`--config` invocation retains Playwright's original database-path behavior.

- `pnpm test:e2e:general`: general receiving, issuance, catalog and planning tests.
- `pnpm test:e2e:opening-stock`: all starting-count and correction journeys together.

Opening Stock is a one-time application setup. Its dedicated suite uses one worker
and restores its own seeded database rows before each test, before the spec's seed
hook. New journeys import `test` and `expect` from `./fixture` and seed their
scenario in `test.beforeEach`. This includes retries and each viewport case. It keeps the SQLite file open
for the app and creates no application reset endpoint. General-suite fixtures are
never reset by these journeys. Run this suite with its dedicated configuration and
one worker; the fixture rejects other configurations or parallel overrides.

Both configurations retain failure traces. Journey screenshots use Playwright's
output directory. Use `--output <directory>` to keep evidence outside the checkout.
