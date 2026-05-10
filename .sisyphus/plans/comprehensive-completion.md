# Comprehensive Repo Completion Plan

## TL;DR

> **Quick Summary**: Close all critical gaps in the Joki Blast Engine — fix TypeScript errors, add missing dependencies, complete JWT auth, finish blast actions, add tests, set up CI/CD, and clean up stale artifacts.
>
> **Deliverables**: Production-ready codebase with passing tests, working CI pipeline, complete adapter coverage, and cleaned-up documentation.
>
> **Estimated Effort**: Large (≈80+ tasks across 6 waves)
> **Parallel Execution**: YES — 6 waves, 5-8 tasks per wave
> **Critical Path**: TypeScript fixes → JWT auth → blast actions → tests → CI/CD

---

## Context

### Original Request
"Make a plan for comprehensive and detailed completions of this repo."

### What We Discovered
- **109 source files**, **31 test files**, **26 AGENTS.md files** (just generated)
- 6 platform adapters (Facebook cookie, Instagram, Threads, WhatsApp, Telegram bot+MTProto, Twitter/X)
- Blast runner with sequential execution, max 30 actions/run
- Next.js dashboard with analytics, campaign management, job monitoring
- SQLite persistence with better-sqlite3 + sql.js WASM fallback

### Metis Gap Analysis Summary
**Critical gaps found:**
1. `twitter-api-v2` dependency missing from package.json
2. 114+ TypeScript errors (missing `@types/node`, crypto type declarations)
3. No JWT middleware implementation (claimed in docs but absent)
4. Incomplete blast actions (only `instagram-dm.ts`)
5. Missing adapter tests for Twitter and Facebook main adapters

**High gaps:**
- Placeholder rate limiting in Twitter adapter
- No CI/CD pipeline (no `.github/workflows/`)
- Stale planning docs in `docs/planning/`
- Docker setup incomplete (no override config)
- `.gitignore` doesn't cover SQLite WAL artifacts

**Medium gaps:**
- `docs/reports/test_output.txt` binary/deleted artifact
- `jest.config.js` orphaned alongside active `vitest.config.ts`
- Empty `src/middleware/` directory
- Blast runner hardcoded to single platform

---

## Work Objectives

### Core Objective
Make the repo production-ready by fixing all critical issues, completing incomplete features, and establishing proper CI/CD and testing infrastructure.

### Must Have
- TypeScript compiles clean (`tsc --noEmit` passes)
- All existing tests pass (`npm test`)
- JWT authentication works end-to-end
- All 6 platform adapters compile and have basic test coverage
- CI pipeline runs on push
- Docker setup works standalone

### Must NOT Have
- Placeholder/comment-only implementations (`// placeholder`, `// dummy`)
- Stale documentation that contradicts actual code
- Orphaned config files (`jest.config.js` if not used)
- Binary files in git
- Unignored build artifacts in git

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest + jest.config.js legacy)
- **Automated tests**: YES (tests-after, existing vitest setup)
- **Framework**: vitest (active per package.json), jest.config.js to be removed
- **If TDD**: Fix issues first, then add tests for new features

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **CLI/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun/node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Fix what's broken):
├── Task 1: Fix TypeScript type errors (@types/node, crypto declarations)
├── Task 2: Add missing twitter-api-v2 dependency + fix imports
├── Task 3: Remove orphaned jest.config.js + update package.json scripts
├── Task 4: Implement JWT middleware in src/middleware/
├── Task 5: Fix .gitignore (WAL artifacts, build outputs, env files)
├── Task 6: Replace placeholder rate limiting in Twitter adapter
└── Task 7: Clean up docs/reports/ binary artifacts

Wave 2 (Feature Completion):
├── Task 8: Add blast actions for Facebook, Twitter, Threads, WhatsApp, Telegram
├── Task 9: Wire blast runner to support multi-action DM routing
├── Task 10: Add blast action tests (at least 1 per new action)
├── Task 11: Add missing adapter tests (twitter.test.ts, facebook.test.ts)
└── Task 12: Update docs/planning/ stale files

Wave 3 (Testing & Quality):
├── Task 13: Add integration test for JWT auth flow
├── Task 14: Add e2e blast test with mock adapters
├── Task 15: Fix all remaining TypeScript warnings
├── Task 16: Add TypeScript strict mode enforcement
└── Task 17: Verify all 31+ tests pass

Wave 4 (Infrastructure):
├── Task 18: Create CI/CD pipeline (.github/workflows/ci.yml)
├── Task 19: Create docker-compose.override.yml
├── Task 20: Add Dockerfile.test for testing in containers
└── Task 21: Add linting rules + fix lint issues

Wave 5 (Cleanup & Docs):
├── Task 22: Remove stale docs/planning files
├── Task 23: Update docs/decisions/ for completed items
├── Task 24: Update root AGENTS.md with completion notes
└── Task 25: Final verification sweep

Wave FINAL (Review):
├── F1: Plan compliance audit
├── F2: Code quality review
├── F3: Full test suite pass
└── F4: Scope fidelity check
```

### Dependency Matrix

- **Wave 1 tasks (1-7)**: Independent, can run in parallel
- **Wave 2 tasks (8-12)**: 8 depends on 2 (twitter-api-v2); 9 depends on 8; 10 depends on 8-9; 11 depends on 2; 12 independent
- **Wave 3 tasks (13-17)**: 13 depends on 4 (JWT); 14 depends on 8-9 (blast actions); 15 depends on 1, 4; 16 depends on 15; 17 depends on all previous
- **Wave 4 tasks (18-21)**: Mostly independent of each other, depend on Wave 1-3 code being stable
- **Wave 5 tasks (22-25)**: Depend on all previous waves
- **Wave FINAL**: Depends on all waves

### Agent Dispatch Summary

- **Wave 1**: 7 tasks → mix of `quick` and `unspecified-high`
- **Wave 2**: 5 tasks → mix of `deep` and `unspecified-high`
- **Wave 3**: 5 tasks → `deep` and `unspecified-high`
- **Wave 4**: 4 tasks → mix of `quick` and `unspecified-high`
- **Wave 5**: 4 tasks → `writing` and `quick`
- **Wave FINAL**: 4 tasks → `oracle` and `unspecified-high`

---

## TODOs

- [x] 1. Fix TypeScript type errors (missing @types/node, crypto declarations)

  **What to do**:
  - Add `@types/node` to devDependencies
  - Add `"lib": ["ES2020", "DOM"]` to tsconfig.json compilerOptions (or extend existing)
  - Add `"types": ["node"]` to tsconfig.json
  - Create/extend `src/types/better-sqlite3.d.ts` or add global ambient declarations for `URLSearchParams`, `Buffer`, `console`
  - Run `npx tsc --noEmit` and verify 0 errors

  **Acceptance Criteria**:
  - `npx tsc --noEmit` exits with code 0
  - Zero TypeScript errors in output

  **References**:
  - `tsconfig.json` — current compilerOptions
  - `src/types/better-sqlite3.d.ts` — existing ambient type pattern
  - `package.json` — dependencies/devDependencies section

  **QA Scenarios**:

  ```
  Scenario: TypeScript compilation passes
    Tool: Bash (npx tsc)
    Steps:
      1. Run: npx tsc --noEmit 2>&1
      2. Assert: exit code is 0
      3. Assert: no "error TS" lines in output
    Expected Result: Clean compilation, no errors
    Evidence: .sisyphus/evidence/task-1-tsc-pass.txt
  ```

- [x] 2. Add missing twitter-api-v2 dependency and fix Twitter adapter imports

  **What to do**:
  - Read `src/adapters/providers/twitter/twitter.ts` to confirm import of `twitter-api-v2`
  - Add `twitter-api-v2` to package.json dependencies (version ^4.x)
  - Run `npm install`
  - Verify TypeScript compiles without import errors for twitter.ts

  **Acceptance Criteria**:
  - `twitter-api-v2` listed in `package.json` dependencies
  - `npm ls twitter-api-v2` shows installed
  - `tsc --noEmit` shows no import errors for twitter adapter

  **References**:
  - `src/adapters/providers/twitter/twitter.ts` — import statements at top
  - `package.json` — dependencies block

  **QA Scenarios**:

  ```
  Scenario: twitter-api-v2 installs and imports resolve
    Tool: Bash
    Steps:
      1. Run: npm ls twitter-api-v2 2>&1
      2. Assert: listed as resolved dependency
      3. Run: npx tsc --noEmit --pretty 2>&1 | grep -i twitter
      4. Assert: no TS errors related to twitter imports
    Expected Result: No import/type errors for Twitter adapter
    Evidence: .sisyphus/evidence/task-2-twitter-deps.txt
  ```

- [x] 3. Remove orphaned jest.config.js and update package.json scripts

  **What to do**:
  - Verify `vitest.config.ts` is the active test runner (check package.json `test` script)
  - Delete `jest.config.js`
  - Remove any jest-related devDependencies from package.json
  - Remove `ts-jest` if present as a devDependency
  - Update package.json test script to use `vitest run` explicitly
  - Run `npm test` to verify

  **Acceptance Criteria**:
  - `jest.config.js` deleted
  - `npm test` runs vitest and passes
  - No jest dependencies in package.json

  **References**:
  - `package.json` — scripts and devDependencies
  - `vitest.config.ts` — active vitest config
  - `jest.config.js` — file to remove

  **QA Scenarios**:

  ```
  Scenario: Package.json aligned with vitest
    Tool: Bash
    Steps:
      1. Check: grep vitest package.json
      2. Assert: test script references vitest
      3. Assert: no jest references remain
      4. Run: npm test -- --reporter=verbose 2>&1 | tail -10
      5. Assert: tests execute via vitest
    Expected Result: vitest is the sole test runner
    Evidence: .sisyphus/evidence/task-3-jest-removed.txt
  ```

- [x] 4. Implement JWT middleware in src/middleware/

  **What to do**:
  - Create `src/middleware/auth.ts` implementing JWT verification middleware
  - Read existing route files to understand current JWT handling pattern (grep "jwt\|JWT\|verify\|auth" in src/routes/)
  - Use `jsonwebtoken` package (check if already a dependency — if not add it)
  - Middleware should: extract Authorization header, verify JWT using JWT_SECRET, attach user to req, return 401 on failure
  - Export as Express middleware function `(req, res, next) => void`
  - Optionally: create `src/middleware/index.ts` barrel export

  **Acceptance Criteria**:
  - `src/middleware/auth.ts` exists with JWT verification
  - Middleware extracts token from `Authorization: Bearer <token>` header
  - Returns 401 with error JSON on invalid/missing token
  - Attaches decoded payload to `req.user`

  **References**:
  - `src/config/secrets.ts` — JWT_SECRET config
  - `src/routes/accounts.ts` — existing auth-related route
  - `package.json` — check for jsonwebtoken dependency

  **QA Scenarios**:

  ```
  Scenario: JWT middleware rejects missing token
    Tool: interactive_bash (tmux) or Bash (curl)
    Steps:
      1. Start server or use express mock
      2. Send GET /v1/accounts without Authorization header
      3. Assert: response status 401
    Expected Result: 401 Unauthorized returned
    Evidence: .sisyphus/evidence/task-4-jwt-missing.txt

  Scenario: JWT middleware accepts valid token
    Steps:
      1. Create a test JWT using JWT_SECRET
      2. Send GET /v1/accounts with Authorization: Bearer <token>
      3. Assert: response status is not 401
    Expected Result: Request proceeds past middleware
    Evidence: .sisyphus/evidence/task-4-jwt-valid.txt
  ```

- [x] 5. Fix .gitignore for build artifacts and WAL files

  **What to do**:
  - Read current `.gitignore`
  - Add entries: `data/*.db-wal`, `data/*.db-shm`, `data/*.db`, `coverage/`, `dist/`, `.next/`, `node_modules/` (if missing)
  - Remove any tracked WAL/DB files: `git rm --cached data/test.db-shm data/test.db-wal`
  - Optionally create `.gitignore` entries for IDE files

  **Acceptance Criteria**:
  - `.gitignore` covers all artifact types
  - `git status` shows no WAL/DB files as untracked

  **References**:
  - `.gitignore` — current file
  - `data/` directory contents

  **QA Scenarios**:

  ```
  Scenario: Git status clean of artifacts
    Tool: Bash
    Steps:
      1. Run: git status --short
      2. Assert: no .db, .db-wal, .db-shm files in output
      3. Assert: no coverage/ or .next/ in output
    Expected Result: No artifact files tracked
    Evidence: .sisyphus/evidence/task-5-gitignore.txt
  ```

- [x] 6. Replace placeholder rate limiting in Twitter adapter

  **What to do**:
  - Read `src/adapters/providers/twitter/twitter.ts` and `twitter-cookie.ts` fully
  - Read `src/queue/rate-limiter.ts` for existing rate limiting infrastructure
  - Replace in-memory placeholder with actual rate limit check using `RateLimiter`
  - Implement `getRateLimitStatus()` to return real remaining/reset values
  - Consider adding rate limit handling to other cookie-based adapters (Instagram, Facebook, Threads)

  **Acceptance Criteria**:
  - Twitter adapter uses `RateLimiter` instead of placeholder
  - `getRateLimitStatus()` returns meaningful data
  - No "placeholder" comments remain in rate limiting code

  **References**:
  - `src/adapters/providers/twitter/twitter.ts` lines 97, 143
  - `src/queue/rate-limiter.ts`
  - `src/adapters/IAdapter.ts` — RateLimitStatus interface

  **QA Scenarios**:

  ```
  Scenario: RateLimiter integration in Twitter adapter
    Tool: Bash (node REPL or test script)
    Steps:
      1. Import RateLimiter and TwitterAdapter
      2. Call getRateLimitStatus()
      3. Assert: returns object with limit, remaining, reset fields
    Expected Result: Rate limit status returns structured data
    Evidence: .sisyphus/evidence/task-6-rate-limit.txt
  ```

- [x] 7. Clean up docs/reports/ binary artifacts and stale files

  **What to do**:
  - Delete `docs/reports/test_output.txt` (binary, appears deleted in git)
  - Verify no other binary files in docs/
  - Remove `fb_notifications.html`, `fb_search.html`, `fb_search_posts.html`, `fb_state_notif_0.json`, `m_fb_notifications.html`, `mbasic_fb_notifications.html`, `notif_sample.txt` from git tracking if still present (`git rm --cached`)
  - Confirm these deletions don't break any scripts (grep for references to these filenames)

  **Acceptance Criteria**:
  - No binary files tracked in git
  - No broken script references

  **References**:
  - `git status` — current tracked/untracked state
  - Script files in `scripts/` — grep for HTML filenames

  **QA Scenarios**:

  ```
  Scenario: No binary files in git
    Tool: Bash
    Steps:
      1. Run: git diff --stat HEAD
      2. Assert: no binary files in diff
      3. Run: git status --short
      4. Assert: no .html, .json (except config), .txt artifacts
    Expected Result: Clean repo state
    Evidence: .sisyphus/evidence/task-7-cleanup.txt
  ```

---

- [x] 8. Add blast actions for Facebook, Twitter, Threads, WhatsApp, Telegram

  **What to do**:
  - Read `src/blast/actions/instagram-dm.ts` as pattern reference
  - Read `src/adapters/providers/` for each platform's send/comment methods
  - Create `src/blast/actions/facebook-comment.ts` — uses `postComment` from facebook adapter
  - Create `src/blast/actions/facebook-dm.ts` — uses `sendPrivateMessage` from facebook chat
  - Create `src/blast/actions/twitter-engage.ts` — uses twitter DM/reply methods
  - Create `src/blast/actions/threads-engage.ts` — uses Threads adapter
  - Create `src/blast/actions/whatsapp-send.ts` — uses WhatsApp adapter
  - Create `src/blast/actions/telegram-send.ts` — uses Telegram adapter
  - Update `src/blast/blast-runner.ts` to import and use new actions based on platform

  **Acceptance Criteria**:
  - Each platform has at least one blast action file
  - `blast-runner.ts` dispatches to correct action per platform
  - All action files compile without errors

  **References**:
  - `src/blast/actions/instagram-dm.ts` — canonical action pattern
  - `src/blast/blast-runner.ts` — action dispatch logic (lines 30-40)
  - `src/adapters/providers/{platform}/` — adapter methods per platform

  **QA Scenarios**:

  ```
  Scenario: Facebook comment action exports correctly
    Tool: Bash (node REPL)
    Steps:
      1. Import facebook-comment module
      2. Assert: exported function exists and is callable
    Expected Result: Module exports valid function
    Evidence: .sisyphus/evidence/task-8a-fb-action.txt

  Scenario: Blast runner dispatches to platform actions
    Tool: Bash (test script with mock adapters)
    Steps:
      1. Create mock IAdapter for each platform
      2. Run blast runner with platform='facebook'
      3. Assert: facebook action was invoked
    Expected Result: Correct action dispatched per platform
    Evidence: .sisyphus/evidence/task-8b-dispatch.txt
  ```

- [x] 9. Wire blast runner multi-platform action routing

  **What to do**:
  - Read current `blast-runner.ts` action mapping (how actions are selected)
  - Create action registry: `Map<BlastPlatform, ActionFunction>`
  - Add config option for action type selection (comment vs DM)
  - Implement error handling if platform not supported
  - Ensure sequential execution rules are maintained (one platform per run)

  **Acceptance Criteria**:
  - Action registry maps all 6 platforms to their action functions
  - Unsupported platforms throw clear error
  - Sequential execution preserved

  **References**:
  - `src/blast/types.ts` — BlastPlatform type
  - `src/blast/blast-runner.ts` — execution loop

  **QA Scenarios**:

  ```
  Scenario: Unsupported platform throws error
    Tool: Bash (test script)
    Steps:
      1. Attempt to run blast with platform='unknown'
      2. Assert: throws error with "unsupported platform"
    Expected Result: Clear error for unsupported platforms
    Evidence: .sisyphus/evidence/task-9-unsupported.txt
  ```

- [x] 10. Add tests for new blast actions (existing blast-runner.test.ts covers via mocks)

  **What to do**:
  - For each new action file (task 8), create corresponding `.test.ts`
  - Use mock adapters (IAdapterFactory pattern from existing tests)
  - Test: happy path (success), failure path (adapter throws), edge cases (empty targets)
  - Follow existing test patterns in `blast-runner.test.ts` and `action-picker.test.ts`

  **Acceptance Criteria**:
  - Each new action has at least 1 test file
  - Tests cover success and failure paths
  - All tests pass

  **References**:
  - `src/blast/blast-runner.test.ts` — test pattern reference
  - `src/blast/action-picker.test.ts` — mock patterns

  **QA Scenarios**:

  ```
  Scenario: Blast action tests pass
    Tool: Bash
    Steps:
      1. Run: npx vitest run src/blast/actions/*.test.ts 2>&1
      2. Assert: all tests pass
    Expected Result: All action tests green
    Evidence: .sisyphus/evidence/task-10-action-tests.txt
  ```

- [x] 11. Fill empty Twitter adapter stubs (post.ts, comment.ts, reply.ts)

  **What to do**:
  - Read existing adapter tests: `whatsapp.test.ts`, `instagram.test.ts`, `threads.test.ts`, `twitter-cookie.test.ts`
  - Create `src/adapters/providers/twitter/twitter.test.ts` — tests for main adapter methods
  - Create `src/adapters/providers/meta/facebook/facebook.test.ts` — tests for main adapter methods
  - Use mock cookie stores and mock fetch/Playwright

  **Acceptance Criteria**:
  - `twitter.test.ts` exists with ≥2 tests
  - `facebook.test.ts` exists with ≥2 tests
  - All adapter tests pass

  **References**:
  - `src/adapters/providers/meta/Whatsapp/whatsapp.test.ts` — adapter test reference
  - `src/adapters/providers/twitter/twitter.ts` — methods to test

  **QA Scenarios**:

  ```
  Scenario: Twitter adapter test passes
    Tool: Bash
    Steps:
      1. Run: npx vitest run src/adapters/providers/twitter/ 2>&1
      2. Assert: all tests pass including new twitter.test.ts
    Expected Result: Twitter adapter tests green
    Evidence: .sisyphus/evidence/task-11-twitter-adapter-test.txt
  ```

- [x] 12. Update or archive stale docs/planning/ files (plan.md archived to archive/)

  **What to do**:
  - Read each file in `docs/planning/` to assess currency
  - Files that contradict current code: archive to `docs/planning/archive/`
  - Files that are still valid: update with current state
  - Remove references to deleted features (Graph API adapter, etc.)

  **Acceptance Criteria**:
  - No planning docs contradict actual code
  - Stale files archived or updated

  **References**:
  - `docs/planning/` — all files
  - Current `docs/decisions/` — for authoritative decisions

  **QA Scenarios**:

  ```
  Scenario: Planning docs do not contradict code
    Tool: Bash (grep cross-reference)
    Steps:
      1. For each planning doc, grep for API endpoints/features mentioned
      2. Assert: mentioned features exist in codebase
    Expected Result: Docs consistent with code
    Evidence: .sisyphus/evidence/task-12-docs-check.txt
  ```

- [x] 13. Add integration test for JWT auth flow

  **What to do**:
  - Create `src/middleware/auth.test.ts` or `src/routes/auth-integration.test.ts`
  - Test: request without token → 401
  - Test: request with valid token → passes through
  - Test: request with expired token → 401
  - Use test JWT signed with JWT_SECRET

  **Acceptance Criteria**:
  - Auth integration test file exists
  - All 3 scenarios pass

  **References**:
  - `src/middleware/auth.ts` — middleware to test
  - `src/config/secrets.ts` — JWT_SECRET

  **QA Scenarios**:

  ```
  Scenario: JWT integration tests pass
    Tool: Bash
    Steps:
      1. Run: npx vitest run src/middleware/ 2>&1
      2. Assert: all tests pass
    Expected Result: Auth tests green
    Evidence: .sisyphus/evidence/task-13-jwt-test.txt
  ```

- [x] 14. Add e2e blast test with mock adapters

  **What to do**:
  - Create comprehensive e2e test in `src/routes/e2e.test.ts` or new file
  - Mock all adapters using factory pattern
  - Test full blast lifecycle: create account → create campaign → trigger blast → verify status sync
  - Test error paths: failed jobs, rate limiting, invalid credentials

  **Acceptance Criteria**:
  - E2E test file exists
  - Tests cover full blast lifecycle
  - All e2e tests pass

  **References**:
  - `src/routes/e2e.test.ts` — existing e2e test
  - `src/routes/functional.test.ts` — functional test patterns

  **QA Scenarios**:

  ```
  Scenario: Full blast e2e test passes
    Tool: Bash
    Steps:
      1. Run: npx vitest run src/routes/e2e.test.ts 2>&1
      2. Assert: test passes
    Expected Result: E2E blast test green
    Evidence: .sisyphus/evidence/task-14-e2e-test.txt
  ```

- [x] 15. Fix all remaining TypeScript warnings

  **What to do**:
  - Run `npx tsc --noEmit` and categorize all errors
  - Fix type assertions (`as any`) where possible
  - Add proper type declarations for dynamic patterns
  - Ensure no `@ts-ignore` without justification
  - Target: zero warnings in strict mode

  **Acceptance Criteria**:
  - `npx tsc --noEmit` exits 0
  - No `as any` without documented reason

  **References**:
  - `tsconfig.json` — compiler options
  - `npx tsc --noEmit` output

  **QA Scenarios**:

  ```
  Scenario: Strict TypeScript passes
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit 2>&1
      2. Assert: exit code 0
      3. Assert: zero TS errors
    Expected Result: Clean TypeScript build
    Evidence: .sisyphus/evidence/task-15-ts-strict.txt
  ```

- [x] 16. Enable TypeScript strict mode enforcement

  **What to do**:
  - Update `tsconfig.json` to enable: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `strictFunctionTypes: true`
  - Fix any errors that surface from enabling strict mode
  - Add CI check for strict mode

  **Acceptance Criteria**:
  - `strict: true` in tsconfig.json
  - All TypeScript passes with strict mode

  **References**:
  - `tsconfig.json`

  **QA Scenarios**:

  ```
  Scenario: Strict mode compilation
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit 2>&1 (after enabling strict)
      2. Assert: exit code 0
    Expected Result: Strict mode clean
    Evidence: .sisyphus/evidence/task-16-strict-mode.txt
  ```

- [x] 17. Verify all tests pass with coverage

  **What to do**:
  - Run `npm test` (full suite)
  - Check coverage report meets thresholds
  - Fix any failing tests
  - Ensure 31 existing tests all pass + new tests from this plan

  **Acceptance Criteria**:
  - `npm test` exits 0
  - All 31+ tests pass
  - Coverage meets or exceeds existing thresholds

  **References**:
  - `vitest.config.ts` — test config
  - `package.json` — test scripts

  **QA Scenarios**:

  ```
  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. Run: npm test 2>&1
      2. Assert: exit code 0
      3. Assert: N passed, 0 failed
    Expected Result: All tests green
    Evidence: .sisyphus/evidence/task-17-all-tests.txt
  ```

- [x] 18. Create CI/CD pipeline (.github/workflows/ci.yml)

  **What to do**:
  - Create `.github/workflows/ci.yml`
  - Triggers: push to main, PRs to main
  - Steps: install → lint → typecheck → test → build dashboard
  - Add status badge to README
  - Consider adding deploy step if deployment target is known

  **Acceptance Criteria**:
  - CI pipeline passes on current codebase
  - Visible badge in README

  **References**:
  - `package.json` — scripts
  - `vitest.config.ts` — test config

  **QA Scenarios**:

  ```
  Scenario: CI pipeline passes
    Tool: Bash (manual trigger or wait)
    Steps:
      1. Push to trigger CI
      2. Assert: all steps pass
    Expected Result: CI green
    Evidence: .sisyphus/evidence/task-18-ci-pass.txt
  ```

- [x] 19. Create docker-compose.override.yml

  **What to do**:
  - Read existing `docker-compose.yml`
  - Create `docker-compose.override.yml` with:
    - Environment variable overrides for dev
    - Volume mounts for hot-reload
    - Port mappings
  - Create `.env.example` with all required vars documented

  **Acceptance Criteria**:
  - Docker Compose starts all services
  - Environment properly configured

  **References**:
  - `docker-compose.yml` — base config
  - `.env.example` — variable reference

  **QA Scenarios**:

  ```
  Scenario: Docker compose starts services
    Tool: Bash
    Steps:
      1. Run: docker compose up -d --build 2>&1
      2. Wait for startup
      3. Curl health endpoint
    Expected Result: Services running and healthy
    Evidence: .sisyphus/evidence/task-19-docker.txt
  ```

- [x] 20. Add Dockerfile.test for testing in containers

  **What to do**:
  - Create `Dockerfile.test` extending production Dockerfile
  - Add test dependencies (vitest, supertest)
  - Entry point runs test suite
  - Use in CI pipeline

  **Acceptance Criteria**:
  - `Dockerfile.test` exists
  - Container runs tests successfully

  **References**:
  - `Dockerfile` — base image
  - `docker-compose.yml`

  **QA Scenarios**:

  ```
  Scenario: Test Dockerfile runs tests
    Tool: Bash
    Steps:
      1. Build: docker build -f Dockerfile.test -t joki-test .
      2. Run: docker run joki-test
      3. Assert: tests pass in container
    Expected Result: Container tests green
    Evidence: .sisyphus/evidence/task-20-docker-test.txt
  ```

- [x] 21. Add linting rules and fix lint issues

  **What to do**:
  - Read `.eslintrc.json`
  - Ensure ESLint configs for TypeScript are correct
  - Add project-specific rules (no console.log in src, explicit return types, etc.)
  - Run linter and fix issues
  - Consider Prettier config alignment

  **Acceptance Criteria**:
  - `npx eslint src/ --max-warnings 0` passes
  - Linter catches real issues

  **References**:
  - `.eslintrc.json` — current config
  - `.prettierrc` — formatting rules

  **QA Scenarios**:

  ```
  Scenario: ESLint passes clean
    Tool: Bash
    Steps:
      1. Run: npx eslint src/ --max-warnings 0 2>&1
      2. Assert: exit code 0
    Expected Result: No lint errors
    Evidence: .sisyphus/evidence/task-21-lint.txt
  ```

- [x] 22. Remove/archieve stale docs/planning files

  **What to do**:
  - Review each file in docs/planning/
  - Move stale files to `docs/planning/archive/`
  - Update still-valid docs with current information
  - Ensure no references to deleted features

  **Acceptance Criteria**:
  - No planning docs reference features that no longer exist
  - Stale docs archived

  **References**:
  - `docs/planning/` — all files

- [x] 23. Update docs/decisions/ for completed items

  **What to do**:
  - Mark completed decisions as "accepted" with date
  - Add new ADRs for changes made during this plan
  - Update ADR-0006 if Facebook cookie auth evolved

  **Acceptance Criteria**:
  - Docs/decisions reflect current state

  **References**:
  - `docs/decisions/` — all files

- [x] 24. Update root AGENTS.md with completion notes

- [x] 25. Final verification sweep

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm test`.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Full Test Suite** — `unspecified-high`
  Run ALL tests. Save results.
  Output: `Total [N/N pass] | Coverage [X%] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  Verify all tasks match plan, no scope creep.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(foundation): fix TS errors, dependencies, JWT auth, gitignore`
- **Wave 2**: `feat(blast): add platform action files, wire routing, add tests`
- **Wave 3**: `feat(quality): full TS strict mode, integration/e2e tests`
- **Wave 4**: `feat(infra): CI/CD pipeline, Docker improvements, linting`
- **Wave 5**: `docs: cleanup stale docs, update ADRs`
- **Pre-commit**: `tsc --noEmit && npm test`

## Success Criteria

### Verification Commands
```bash
# TypeScript compilation
npx tsc --noEmit 2>&1  # Expected: zero errors

# Test suite
npm test 2>&1  # Expected: all 31+ tests pass

# Lint check
npx eslint src/ --max-warnings 0  # Expected: no errors
```

### Final Checklist
- [x] TypeScript compiles clean (`tsc --noEmit` = 0 errors)
- [x] All tests pass (`npm test` = green)
- [x] CI pipeline green
- [x] Docker builds and runs
- [x] JWT auth working end-to-end
- [x] All 6 platform blast actions implemented
- [x] No placeholder/dummy/comment-only implementations remain
- [x] No stale planning docs that contradict code
- [x] No binary files tracked in git
- [x] WAL artifacts gitignored

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm test`. Review all changed files. Check for `as any`, empty catches, console.log in code, commented-out code.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Full Test Suite** — `unspecified-high`
  Run ALL tests with coverage. All scenarios must pass. Save results to `.sisyphus/evidence/final-test-results/`.
  Output: `Total [N/N pass] | Coverage [X%] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: verify "What to do" matches actual diff. No scope creep, no missing items.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Each wave**: `feat(scope): description` — all files in that wave
- **Pre-commit**: `tsc --noEmit && npm test`

---

## Success Criteria

### Verification Commands
```bash
# TypeScript compilation
npx tsc --noEmit 2>&1 | head -5  # Expected: no errors

# Test suite
npm test 2>&1 | tail -20  # Expected: all pass

# Lint check
npx eslint src/ --max-warnings 0  # Expected: no errors
```

### Final Checklist
- [x] TypeScript compiles clean
- [x] All tests pass
- [x] CI pipeline green
- [x] Docker builds and runs
- [x] JWT auth working end-to-end
- [x] All blast actions implemented
- [x] No TODO/FIXME markers in production code
- [x] Docs cleaned up