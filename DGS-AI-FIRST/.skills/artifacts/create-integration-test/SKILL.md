# SKILL: create-integration-test

## Metadata

```yaml
name: create-integration-test
type: artifact
level: artifact
version: 1.0.0
owner: QA Team
project: NovaTech Assistant
repository: db1/novatech-assistant
created: 2026-06-18
applies-to:
  - GitHub Copilot
  - Claude Code
  - Claude Desktop
```

---

## Purpose

This skill generates integration tests for NovaTech Assistant HTTP endpoints (Azure Functions). It produces Vitest test files that follow the project's mandatory Testing Standards, use MSW for HTTP interception, employ factories and fixtures with realistic logistics domain data, and assert observable business behavior — not implementation details.

**This skill guarantees:**
- Every generated test follows AAA (Arrange / Act / Assert) with explicit inline comments.
- Every generated test mocks Azure AI Search and Azure OpenAI via MSW — no real HTTP traffic.
- Every generated test for a query endpoint asserts the `source_document` field.
- Every generated test uses domain-realistic NovaTech data (no generic strings).
- Every generated test is traceable to a Verification Criterion from `requirements.md`.

**When to use this skill:**
- When generating tests for any endpoint in `/src/functions/`.
- When creating regression tests for a bug fix in the query pipeline.
- When scaffolding test coverage for a new Azure Function before implementation (TDD).
- When a code review requests additional test scenarios for an existing endpoint.

**When NOT to use this skill:**
- Unit tests for pure utility functions (use `testing-fundamentals` skill directly).
- End-to-end tests targeting a deployed environment (out of scope for Vitest).
- Performance load tests (use k6 scripts in `/tests/performance/`).

---

## Activation Phrase

```
Use create-integration-test when generating integration tests for NovaTech Assistant APIs.
```

Secondary activation phrases recognized by agents:

```
Generate an integration test for the [endpoint name] endpoint.
Write a Vitest integration test following NovaTech standards for [module].
Create test coverage for [VC-XX] using the project's testing patterns.
```

---

## Dependencies

### Foundation Skills (MUST be read before generating)

| Skill | Path | Reason |
|---|---|---|
| `testing-fundamentals` | `.skills/foundation/testing-fundamentals/SKILL.md` | Provides AAA structure, naming conventions, lifecycle hooks (`beforeAll`/`afterEach`/`afterAll`), and the prohibition list for generic assertions. Without this, agents generate `toBeDefined()` and unnamed tests. |
| `mocking-patterns` | `.skills/foundation/mocking-patterns/SKILL.md` | Defines MSW setup, handler structure, `onUnhandledRequest: 'error'` requirement, and the ban on `vi.mock` for HTTP. Without this, agents intercept HTTP incorrectly or allow real calls through. |

### Domain Skills (MUST be read before generating)

| Skill | Path | Reason |
|---|---|---|
| `rag-domain-testing` | `.skills/domain/rag-domain-testing/SKILL.md` | Defines how RAG-specific behaviors are tested: chunk scoring thresholds, `source_document` assertion requirements, `low_confidence_warning` validation, and document conflict detection. Without this, agents omit RAG-specific assertions. |
| `logistics-domain-rules` | `.skills/domain/logistics-domain-rules/SKILL.md` | Provides the NovaTech domain vocabulary: dangerous cargo classification (ANTT classes 1–6), customer tiers (Gold/Silver/Standard only), freight multipliers, SLA definitions. Without this, agents use generic data or invent invalid tiers like "Platinum". |

---

## Preconditions

Before invoking this skill, verify that ALL of the following exist:

1. **`requirements.md` is available** at `/docs/specs/[module]/requirements.md` and contains `Verification Criteria` (VC-XX entries).
2. **The endpoint signature is known**: HTTP method, path, request body schema, and response body schema are defined (either in `plan.md` or the source file's Zod schema).
3. **Factories exist** in `/tests/factories/` for all types involved: at minimum `createQueryRequest()`, `createSearchResult()`, `createAssistantResponse()`.
4. **Fixtures exist** in `/tests/fixtures/` with domain-realistic data. At minimum: `QUERIES`, `CHUNKS`, and `EXPECTED_RESPONSES` exports.
5. **MSW setup file exists** at `/tests/setup/msw.ts` with `server` exported and lifecycle configured.
6. **`vitest.config.ts`** references the setup file via `setupFiles: ['./tests/setup/msw.ts']`.
7. **The dangerous cargo guardrail list is known** (ANTT classes 1–6, lithium batteries, flammable materials, chemical products) — required for VC-03 coverage.

If any precondition is missing, halt and request the missing artifact before generating tests.

---

## Generation Workflow

Execute these steps sequentially. Do not skip steps.

**Step 1 — Read requirements.md**
Open `/docs/specs/[module]/requirements.md`. Extract: Outcomes, Scope Boundaries, Constraints, and all Verification Criteria (VC-XX). Map each VC to a testable behavior statement.

**Step 2 — Identify observable behaviors per VC**
For each VC, list the observable outputs that a test can assert: HTTP status codes, response body fields, specific field values, absent fields, and error messages. Do not list internal implementation steps.

**Step 3 — Define scenario set per VC**
For every VC, define at minimum: one Happy Path scenario, one Edge Case scenario, and one Error Case scenario. For VC-03 (dangerous cargo), define one scenario per input variant (class 3, lithium battery, flammable, chemical product).

**Step 4 — Select fixtures and factories per scenario**
For each scenario, identify which fixture entries (`QUERIES.*`, `CHUNKS.*`) and which factory functions (`createQueryRequest`, `createSearchResult`, `createAssistantResponse`) will be used. Never construct raw object literals inline for objects with more than 3 fields.

**Step 5 — Configure MSW handlers per scenario**
For each scenario, define the exact MSW handlers required:
- Azure OpenAI embedding endpoint: `POST https://*.openai.azure.com/openai/deployments/*/embeddings`
- Azure AI Search endpoint: `POST https://*.search.windows.net/indexes/*/docs/search`
- Azure OpenAI completion endpoint: `POST https://*.openai.azure.com/openai/deployments/*/chat/completions`

Handlers MUST return deterministic responses. Use `delay()` from `msw` only when testing timeout behavior — never as a workaround.

**Step 6 — Write the Arrange section**
Instantiate: the request object (via factory), the mocked search results (via factory + `server.use()`), and any override values specific to this scenario. Add `// Arrange` comment.

**Step 7 — Write the Act section**
Call the handler under test exactly once. Capture the return value. Parse `response.body` if it is a JSON string. Add `// Act` comment.

**Step 8 — Write the Assert section**
Assert: HTTP status code, complete payload shape via `toMatchObject`, specific field values via `toStrictEqual` or `toContain`, and `source_document` (mandatory for all query response tests). Add `// Assert` comment.

**Step 9 — Scan for anti-patterns**
Before finalizing the test, check the generated code against the AI Anti-Patterns list in this skill. If any anti-pattern is detected, rewrite the affected assertion or structure.

**Step 10 — Validate traceability**
Add a JSDoc comment at the top of each `it` block: `// @vc VC-XX`. Confirm the scenario ID exists in `/tests/specs/[module]/test-plan.md` traceability matrix.

**Step 11 — Validate Output Checklist**
Run through the Output Validation checklist in this skill. Every item must be `PASS` before the test file is considered complete.

**Step 12 — Name the file and export**
Save as `/tests/integration/[module]/[module].test.ts`. Ensure the file has no default exports; all test suites use `describe` blocks at module level.

---

## Rules

**RULE-01 — AAA is mandatory in every `it` block.**
Every test body MUST contain `// Arrange`, `// Act`, and `// Assert` comments, each followed by at least one line of code in that section. A test without all three sections MUST NOT be committed.

**RULE-02 — Test names MUST follow `should [behavior] when [condition]`.**
The `it` string must start with `should`, describe an observable business behavior, and include a condition clause. `describe` MUST use the exact module name in PascalCase.

**RULE-03 — Assertions MUST be specific to business behavior.**
Use `toMatchObject`, `toStrictEqual`, `toEqual`, `toContain`, or `toThrow` with explicit values. `toBeDefined()`, `toBeTruthy()`, and `not.toBeNull()` are FORBIDDEN as sole assertions. Every assertion must answer: "What business rule does this verify?"

**RULE-04 — MSW is the only permitted mechanism for HTTP mocking.**
All calls to `*.openai.azure.com`, `*.search.windows.net`, and `*.confluence.*` MUST be intercepted by MSW handlers. `vi.mock`, monkey-patching, and `jest.spyOn` on HTTP clients are FORBIDDEN for HTTP-level mocking.

**RULE-05 — `server.listen({ onUnhandledRequest: 'error' })` is mandatory.**
The MSW server MUST be configured to error on unhandled requests. This prevents real HTTP calls from silently passing through.

**RULE-06 — Factories MUST be used for all objects with more than 3 fields.**
Request payloads, search results, and assistant responses MUST be created via `createQueryRequest()`, `createSearchResult()`, or `createAssistantResponse()`. Inline object literals with more than 3 fields are FORBIDDEN in test bodies.

**RULE-07 — Fixtures MUST supply all domain data.**
Question strings, document IDs, section references, and expected values MUST come from `/tests/fixtures/`. Strings `"test"`, `"hello"`, `"foo"`, `"bar"`, `"sample"`, `"example"`, `"placeholder"` are FORBIDDEN as domain values.

**RULE-08 — `source_document` MUST be asserted in every query response test.**
Any test that invokes `QueryHandler`, `AssistantService`, or any function returning `AssistantResponse` MUST include `expect(body.source_document).toMatch(...)` or `expect(body.source_document).toContain(...)`. Omitting this assertion is a FAIL in code review.

**RULE-09 — Every VC MUST have at minimum one Happy Path and one Edge Case.**
A test suite that covers only the success path does not satisfy coverage requirements. Edge cases include: empty search results, below-threshold scores, conflicting document versions, and ambiguous input.

**RULE-10 — Error cases MUST cover Azure service failures.**
At minimum: Azure AI Search returning HTTP 503 (mocked), Azure OpenAI returning HTTP 429 (rate limit, mocked). Assert that the handler returns a safe error response without leaking stack traces.

**RULE-11 — Dangerous cargo denial MUST be asserted via the deterministic flag.**
Tests for VC-03 MUST assert `body.dangerous_cargo_denial === true`, not just check that the answer text contains a negation. The flag validates the deterministic post-processing layer independently of the LLM's probabilistic output.

**RULE-12 — Tests MUST be independent and order-agnostic.**
No test may depend on state left by another test. `beforeEach` MUST call `server.resetHandlers()`. No shared mutable variables may be mutated inside `it` blocks.

**RULE-13 — MSW handlers MUST be deterministic.**
A handler registered for a specific test MUST always return the same response for the same request. Non-deterministic handlers (random values, counters, stateful closures) are FORBIDDEN.

**RULE-14 — Customer tier values MUST be within `['Gold', 'Silver', 'Standard']`.**
Tests MUST NOT reference `'Platinum'`, `'Bronze'`, `'Premium'`, or any tier not defined in the NovaTech domain glossary.

**RULE-15 — Prompt injection scenarios MUST assert the deterministic layer, not text content.**
For QRY-028 through QRY-033 class tests, assert `body.dangerous_cargo_denial`, `body.source_document` being empty or absent, and `statusCode`. Do not rely on string matching of injection phrases in the response body.

**RULE-16 — `low_confidence_warning` MUST be asserted when score threshold is below 0.75.**
Any test with a mocked chunk `score < 0.75` MUST assert `body.low_confidence_warning === true`.

**RULE-17 — Document conflict tests MUST assert `document_conflict_detected` flag and the winning document ID.**
Per ADR-0003, tests for conflicting document scenarios MUST verify: the newer `vigencia_date` document is cited in `source_document`, and `document_conflict_detected === true`.

---

## Template

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'
import { handler } from '../../../src/functions/<module>/handler'
import { create<RequestType> } from '../../factories/<request-factory>'
import { create<ResultType> } from '../../factories/<result-factory>'
import { QUERIES, CHUNKS, EXPECTED_RESPONSES } from '../../fixtures'

// MSW server — configured once per file, reset between tests
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('<ModuleName>', () => {

  // ─── Happy Path ───────────────────────────────────────────────────

  it('should <expected behavior> when <condition>', async () => {
    // @vc VC-XX

    // Arrange
    const request = create<RequestType>({ <override field>: QUERIES.<FIXTURE_KEY> })
    const chunk = create<ResultType>({
      document_id: '<DOCUMENT_ID>',
      section: '<seção X.X>',
      score: <0.85_or_higher>,
      content: '<realistic content from NovaTech domain>',
      vigencia_date: '<YYYY-MM-DD>',
    })
    server.use(
      http.post('https://*.search.windows.net/indexes/*/docs/search', () =>
        HttpResponse.json({ value: [chunk] })
      ),
      http.post('https://*.openai.azure.com/openai/deployments/*/embeddings', () =>
        HttpResponse.json({ data: [{ embedding: Array(1536).fill(0) }] })
      ),
      http.post('https://*.openai.azure.com/openai/deployments/*/chat/completions', () =>
        HttpResponse.json({
          choices: [{ message: { content: EXPECTED_RESPONSES.<FIXTURE_KEY> } }],
        })
      )
    )

    // Act
    const response = await handler(request)
    const body = JSON.parse(response.body as string)

    // Assert
    expect(response.statusCode).toBe(200)
    expect(body).toMatchObject({
      answer: expect.stringContaining('<key phrase from expected response>'),
      source_document: expect.stringContaining('<DOCUMENT_ID>'),
      confidence: expect.any(Number),
      low_confidence_warning: false,
    })
    expect(body.source_document).toMatch(/<DOCUMENT_ID>/)
  })

  // ─── Edge Case ────────────────────────────────────────────────────

  it('should <fallback behavior> when <edge condition>', async () => {
    // @vc VC-XX

    // Arrange
    const request = create<RequestType>({ <override field>: QUERIES.<EDGE_FIXTURE_KEY> })
    server.use(
      http.post('https://*.search.windows.net/indexes/*/docs/search', () =>
        HttpResponse.json({ value: [] })  // empty result set
      ),
      http.post('https://*.openai.azure.com/openai/deployments/*/embeddings', () =>
        HttpResponse.json({ data: [{ embedding: Array(1536).fill(0) }] })
      )
    )

    // Act
    const response = await handler(request)
    const body = JSON.parse(response.body as string)

    // Assert
    expect(response.statusCode).toBe(200)
    expect(body).toMatchObject({
      source_document: expect.any(String),  // present but may be empty
      low_confidence_warning: true,
    })
    expect(body.answer).not.toMatch(/<numeric SLA pattern, e.g., \d+ horas>/)
  })

  // ─── Error Case ───────────────────────────────────────────────────

  it('should return safe error response when <Azure service> returns <error code>', async () => {
    // @vc VC-XX

    // Arrange
    const request = create<RequestType>({ <override field>: QUERIES.<FIXTURE_KEY> })
    server.use(
      http.post('https://*.search.windows.net/indexes/*/docs/search', () =>
        HttpResponse.json({ error: { code: 'ServiceUnavailable' } }, { status: 503 })
      )
    )

    // Act
    const response = await handler(request)
    const body = JSON.parse(response.body as string)

    // Assert
    expect(response.statusCode).toBe(503)
    expect(body).toMatchObject({
      error: expect.any(String),
    })
    expect(body).not.toHaveProperty('stack')
    expect(body).not.toHaveProperty('message', expect.stringContaining('at Object.'))
  })

})
```

---

## DO Example

```typescript
// ✅ DO — Correct integration test for QueryHandler (VC-02 + VC-03)

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { handler } from '../../../src/functions/query/handler'
import { createQueryRequest } from '../../factories/query-request'
import { createSearchResult } from '../../factories/search-result'
import { QUERIES, CHUNKS } from '../../fixtures'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('QueryHandler', () => {
  it('should return source_document and explicit denial when attendant asks about dangerous cargo return', async () => {
    // @vc VC-03

    // Arrange
    const request = createQueryRequest({
      question: QUERIES.RETURN_DANGEROUS_CARGO,
      session_id: 'session-dc-001',
      attendant_id: 'att-0055',
    })
    const chunk = createSearchResult({
      document_id: 'PROC-042',
      section: 'seção 5.1',
      score: 0.97,
      content: 'Cargas perigosas (classes 1-6 ANTT) não estão sujeitas ao processo padrão de devolução.',
      vigencia_date: '2024-03-01',
    })
    server.use(
      http.post('https://*.openai.azure.com/openai/deployments/*/embeddings', () =>
        HttpResponse.json({ data: [{ embedding: Array(1536).fill(0) }] })
      ),
      http.post('https://*.search.windows.net/indexes/*/docs/search', () =>
        HttpResponse.json({ value: [chunk] })
      ),
      http.post('https://*.openai.azure.com/openai/deployments/*/chat/completions', () =>
        HttpResponse.json({
          choices: [{
            message: {
              content: 'Cargas perigosas (classes 1 a 6 da ANTT) não podem ser devolvidas pelo processo padrão. Acione o setor de Compliance.',
            },
          }],
        })
      )
    )

    // Act
    const response = await handler(request)
    const body = JSON.parse(response.body as string)

    // Assert
    expect(response.statusCode).toBe(200)
    expect(body).toMatchObject({
      source_document: expect.stringContaining('PROC-042'),
      dangerous_cargo_denial: true,
      low_confidence_warning: false,
    })
    expect(body.answer).toMatch(/não (podem|é possível|está sujeita)/i)
    expect(body.answer).not.toMatch(/prazo de \d+ dias/i)
    expect(body.answer).not.toMatch(/formulário de devolução/i)
  })
})
```

---

## DON'T Example

```typescript
// ❌ DON'T — This test will be REJECTED in code review

test('query endpoint works', async () => {
  const result = await handler({ body: '{"question":"test"}' });
  expect(result).toBeDefined();
});
```

**Rejection reasons — point by point:**

| Problem | Line | Why It Fails |
|---|---|---|
| Name `'query endpoint works'` | `test(...)` | Does not follow `should [behavior] when [condition]`. Two engineers cannot determine what broke from the name alone. |
| No `describe` block | entire file | `describe` is mandatory; it groups related scenarios and labels the module under test. |
| No AAA sections | body | `// Arrange`, `// Act`, `// Assert` are absent. The reader cannot identify what is being set up, invoked, or verified. |
| `body: '{"question":"test"}'` | Arrange | `"test"` is a forbidden generic string. No `createQueryRequest()` factory used. Raw string passed instead of typed object. |
| No MSW handler | missing | `handler` will attempt real HTTP to Azure AI Search and Azure OpenAI. CI will fail with network error or `onUnhandledRequest: 'error'`. |
| `expect(result).toBeDefined()` | Assert | `toBeDefined()` alone has zero business meaning. It passes even if `result` is `{ statusCode: 500 }` or `null`. |
| No `source_document` assertion | Assert | Mandatory for every QueryHandler test (RULE-08). |
| No VC traceability | missing | No `@vc` comment; this test cannot be mapped to any Verification Criterion. |

---

## AI Anti-Patterns

### AP-01 — Happy Path Only

**Description:** Agent generates one test that covers the success case and considers the suite complete.

**Example:**
```typescript
it('should return answer', async () => { ... }) // only test in file
```

**Correction:** Every VC requires at minimum: Happy Path + Edge Case + Error Case. Prompt the agent explicitly: "Also generate edge cases for empty search results and Azure service failure."

---

### AP-02 — Generic Assertion (`toBeDefined` / `toBeTruthy`)

**Description:** Agent asserts existence instead of value.

**Example:**
```typescript
expect(response.body).toBeDefined()
expect(result).toBeTruthy()
```

**Correction:** Replace with `toMatchObject({ source_document: expect.stringContaining('PROC-042') })`.

---

### AP-03 — Generic Test Data

**Description:** Agent uses `"test"`, `"hello"`, `"question 1"` as domain inputs.

**Example:**
```typescript
const request = { body: '{"question":"test question"}' }
```

**Correction:** Use `QUERIES.SLA_GOLD` or `QUERIES.RETURN_DANGEROUS_CARGO` from fixtures. Never accept generic strings as question values.

---

### AP-04 — Real HTTP Calls (No MSW)

**Description:** Agent calls `handler()` without registering MSW handlers, allowing real network traffic.

**Example:**
```typescript
// No server.use() before calling handler
const response = await handler(request)
```

**Correction:** Always register MSW handlers before `// Act`. Verify `onUnhandledRequest: 'error'` is set so real calls throw immediately.

---

### AP-05 — Inline Raw Object Literals

**Description:** Agent constructs large payload objects directly in the test body.

**Example:**
```typescript
const chunk = {
  document_id: 'SLA-2024', section: 'seção 2', score: 0.9,
  content: '...', vigencia_date: '2024-01-15', index_date: '2024-01-16',
  source_type: 'pdf', page_number: 3, char_offset: 142
}
```

**Correction:** Use `createSearchResult({ document_id: 'SLA-2024', score: 0.9 })`. Objects with more than 3 fields require a factory (RULE-06).

---

### AP-06 — Status Code Only Assertion

**Description:** Agent asserts only `statusCode: 200` and considers the test complete.

**Example:**
```typescript
expect(response.statusCode).toBe(200)
// nothing else
```

**Correction:** Always follow status code assertion with payload shape assertion: `expect(body).toMatchObject({ source_document: ... })`.

---

### AP-07 — Shared Mutable State Between Tests

**Description:** Agent declares a shared variable at `describe` scope and mutates it inside `it` blocks.

**Example:**
```typescript
describe('QueryHandler', () => {
  let lastResponse: any  // ← shared mutable state
  it('first test', async () => { lastResponse = await handler(req) })
  it('second test', async () => { expect(lastResponse.body).toBeDefined() })
})
```

**Correction:** Each `it` is fully self-contained. `lastResponse` does not exist. Every test arranges its own inputs and asserts its own outputs.

---

### AP-08 — Missing MSW Lifecycle Hooks

**Description:** Agent calls `setupServer()` but omits `beforeAll`/`afterEach`/`afterAll`.

**Example:**
```typescript
const server = setupServer()
// no beforeAll, no afterEach, no afterAll
```

**Correction:**
```typescript
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

### AP-09 — Asserting LLM Text for Safety Rules

**Description:** Agent asserts dangerous cargo denial by checking if the answer string contains "não".

**Example:**
```typescript
expect(body.answer).toContain('não')  // passes even for unrelated negations
```

**Correction:** Assert the deterministic flag: `expect(body.dangerous_cargo_denial).toBe(true)`. The flag is set by post-processing code, not the LLM, and is the only reliable signal for safety rule enforcement.

---

### AP-10 — Missing `source_document` Assertion

**Description:** Agent generates a complete AAA test for `QueryHandler` but omits `source_document` assertion entirely.

**Example:**
```typescript
expect(response.statusCode).toBe(200)
expect(body.answer).toContain('4 horas')
// no source_document assertion
```

**Correction:** Add `expect(body.source_document).toMatch(/SLA-2024/)` as a mandatory assertion (RULE-08).

---

### AP-11 — Non-Deterministic MSW Handler

**Description:** Agent generates a handler that returns different values on each call.

**Example:**
```typescript
http.post('...', () => HttpResponse.json({ value: [{ score: Math.random() }] }))
```

**Correction:** All handler return values MUST be static or constructed from deterministic factories. `Math.random()`, `Date.now()`, and counter variables are forbidden inside handlers.

---

### AP-12 — Invented Customer Tiers

**Description:** Agent uses `'Platinum'`, `'Bronze'`, or `'Enterprise'` as customer tier values.

**Example:**
```typescript
createQueryRequest({ question: 'Qual o SLA para clientes Platinum?' })
```

**Correction:** Only `'Gold'`, `'Silver'`, and `'Standard'` are valid NovaTech customer tiers. Replace with `QUERIES.SLA_GOLD` or equivalent fixture.

---

### AP-13 — `vi.mock` for HTTP Mocking

**Description:** Agent uses `vi.mock` to mock the Azure SDK client instead of MSW.

**Example:**
```typescript
vi.mock('@azure/search-documents', () => ({ SearchClient: vi.fn() }))
```

**Correction:** MSW intercepts at network level without mocking the SDK. This validates that the actual SDK client serializes requests correctly. Use MSW (RULE-04).

---

### AP-14 — Test Depends on Execution Order

**Description:** A test assumes a previous test populated shared state (module-level array, singleton, etc.).

**Example:**
```typescript
// Test 2 passes only if Test 1 ran first and populated 'cachedSession'
it('should use cached session', async () => {
  expect(cachedSession).not.toBeNull()
})
```

**Correction:** Each test sets up all its own state in `// Arrange`. `beforeEach` resets any shared infrastructure. Tests MUST pass in any order.

---

### AP-15 — Missing Edge Case for Empty Search Results

**Description:** Agent generates tests only for scenarios where Azure AI Search returns results, ignoring the empty result case (VC-04).

**Example:**
```typescript
// All tests mock server.use(http.post('...search...', () => HttpResponse.json({ value: [chunk] })))
// No test exists for { value: [] }
```

**Correction:** Add a dedicated test for `{ value: [] }` that asserts: `low_confidence_warning: true`, `source_document: ''`, and that no numeric values (SLAs, prazos) appear in `body.answer`.

---

## Output Validation

After generating the test file, the agent MUST evaluate each item and output `PASS` or `FAIL`:

```
[ ] OV-01 — Every `it` block has // Arrange, // Act, // Assert comments
[ ] OV-02 — Every `it` name starts with "should" and includes "when [condition]"
[ ] OV-03 — `describe` uses PascalCase module name matching the source file
[ ] OV-04 — `server.listen({ onUnhandledRequest: 'error' })` is present in `beforeAll`
[ ] OV-05 — `server.resetHandlers()` is present in `afterEach`
[ ] OV-06 — `server.close()` is present in `afterAll`
[ ] OV-07 — Every query response test asserts `body.source_document`
[ ] OV-08 — No raw object literal with more than 3 fields in any `it` body
[ ] OV-09 — No fixture string equals "test", "hello", "foo", "bar", "sample", "example"
[ ] OV-10 — No customer tier outside ['Gold', 'Silver', 'Standard']
[ ] OV-11 — Every `it` has at least one assertion beyond `toBeDefined` or `toBeTruthy`
[ ] OV-12 — Every VC covered has at minimum one Happy Path + one Edge Case
[ ] OV-13 — VC-03 tests assert `dangerous_cargo_denial: true` (not text string matching)
[ ] OV-14 — Low-confidence tests (score < 0.75) assert `low_confidence_warning: true`
[ ] OV-15 — No real HTTP calls (verified by `onUnhandledRequest: 'error'` + no unregistered endpoints)
```

If any item is `FAIL`, fix before delivering the test file.

---

## Review Checklist

| # | Check | PASS | FAIL |
|---|---|---|---|
| 1 | Every `it` block contains `// Arrange`, `// Act`, `// Assert` comments with code in each section | All three present with code | Any section missing or combined |
| 2 | Test name follows `should [behavior] when [condition]` pattern | Starts with "should", includes "when" or context clause | Uses "works", "runs", "test", or implementation detail |
| 3 | `source_document` is asserted in every test that invokes `QueryHandler` or returns `AssistantResponse` | `expect(body.source_document).toMatch(...)` present | Field not asserted |
| 4 | All HTTP is intercepted via MSW with `onUnhandledRequest: 'error'` | MSW lifecycle hooks present; no unregistered endpoint | Missing hooks or missing handler for any Azure endpoint |
| 5 | Factories used for all request/response objects with more than 3 fields | `createQueryRequest()`, `createSearchResult()`, `createAssistantResponse()` used | Inline object literal with more than 3 fields in test body |
| 6 | All fixture strings are logistics-domain realistic | `QUERIES.*`, `CHUNKS.*`, document IDs like `SLA-2024`, `PROC-042` | Any string `"test"`, `"hello"`, `"foo"`, `"bar"` |
| 7 | VC-03 dangerous cargo tests assert deterministic flag | `body.dangerous_cargo_denial === true` asserted | Only text string checked via `toContain` |
| 8 | Each VC has at least one Edge Case scenario | Empty result, low score, ambiguous input, or conflict scenario present | Only happy path tests exist |
| 9 | Tests are independent: no shared mutable state, no order dependency | Each `it` self-contained; `afterEach` resets state | Variable mutated across `it` blocks |
| 10 | Error cases assert absence of stack traces | `expect(body).not.toHaveProperty('stack')` present for error scenarios | Error response not tested or stack trace not checked |

---

## Related Skills

- `.skills/foundation/testing-fundamentals/SKILL.md`
- `.skills/foundation/mocking-patterns/SKILL.md`
- `.skills/domain/rag-domain-testing/SKILL.md`
- `.skills/domain/logistics-domain-rules/SKILL.md`
- `.skills/domain/azure-functions-endpoint/SKILL.md`
- `.skills/artifacts/create-rag-endpoint/SKILL.md`

## Related Specs

- `/tests/specs/query-endpoint/test-plan.md`
- `/docs/specs/query-endpoint/requirements.md`
- `/docs/adr/0002-context-budget-strategy.md`
- `/docs/adr/0003-contradictory-documents.md`
- `/AGENTS.md#testing-standards`
