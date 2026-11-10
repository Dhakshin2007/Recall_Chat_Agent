# Verification record

Executed in the build environment on 10 November 2026 using Node v20.20.1.

| Check | Actual result |
| --- | --- |
| npm install --ignore-scripts --offline --no-audit --no-fund | PASS; zero third-party dependencies |
| npm run check | PASS; server and browser JS syntax checked |
| npm test | PASS; 30 tests, 0 failures (21 top-level tests including 9 HTTP subtests) |
| Real local HTTP server | PASS; started by test/http.test.js in an isolated temp data directory |
| Persistence and session ownership | PASS in automated local tests |
| Origin rejection, input timezone validation, static allowlist | PASS in automated local tests |
| NDJSON progress/final response and history export/delete | PASS using explicitly offline DEMO_MODE |
| Gemini request/response shape | PASS using a mocked fetch response only |
| Real Gemini API / real Google Search | NOT RUN: no user API key supplied |
| Real claim accuracy / then-vs-now research quality | NOT MEASURED |
| Browser visual, accessibility, and search-widget rendering | NOT RUN in a browser |
| Docker image build / deployment | NOT RUN |
| Sustained load, power-loss durability, penetration test | NOT RUN |

The offline demo does not simulate web evidence or prove model quality. Provider wire-contract tests are mocks, not live integration tests. npm install had no dependency download to perform.

## Captured test output

```text
> recall-web-agent@1.0.0 test
> node --test

TAP version 13
# Subtest: date resolution: last Tuesday is previous week, not today
ok 1 - date resolution: last Tuesday is previous week, not today
  ---
  duration_ms: 14.913508
  ...
# Subtest: Monday reference resolves most recent previous Monday
ok 2 - Monday reference resolves most recent previous Monday
  ---
  duration_ms: 0.573404
  ...
# Subtest: named calendar dates retain requested day
ok 3 - named calendar dates retain requested day
  ---
  duration_ms: 1.2153
  ...
# Subtest: timezone calendar day differs near UTC midnight
ok 4 - timezone calendar day differs near UTC midnight
  ---
  duration_ms: 0.268968
  ...
# Subtest: invalid timezone rejected
ok 5 - invalid timezone rejected
  ---
  duration_ms: 0.415019
  ...
# Subtest: yesterday wraps month boundaries
ok 6 - yesterday wraps month boundaries
  ---
  duration_ms: 0.265387
  ...
# Subtest: no date reference stays null
ok 7 - no date reference stays null
  ---
  duration_ms: 0.220054
  ...
# Subtest: retrieves prior-day evidence and adjacent assistant baseline across conversations
ok 8 - retrieves prior-day evidence and adjacent assistant baseline across conversations
  ---
  duration_ms: 2.044064
  ...
# Subtest: missing dated memory is explicit
ok 9 - missing dated memory is explicit
  ---
  duration_ms: 0.547855
  ...
# Subtest: lexical entity recall finds older messages
ok 10 - lexical entity recall finds older messages
  ---
  duration_ms: 0.420762
  ...
# Subtest: citations inserted only from real support segments, including Unicode
ok 11 - citations inserted only from real support segments, including Unicode
  ---
  duration_ms: 0.422364
  ...
# Subtest: unmatched support cannot fabricate citation
ok 12 - unmatched support cannot fabricate citation
  ---
  duration_ms: 0.176141
  ...
# Subtest: unsafe source schemes are rejected
ok 13 - unsafe source schemes are rejected
  ---
  duration_ms: 0.124967
  ...
# Subtest: duplicate source URLs deduplicate without losing citation mapping
ok 14 - duplicate source URLs deduplicate without losing citation mapping
  ---
  duration_ms: 0.211273
  ...
# Subtest: missing API key fails honestly
ok 15 - missing API key fails honestly
  ---
  duration_ms: 0.814709
  ...
# Subtest: store persists atomic pairs and serializes concurrent writers
ok 16 - store persists atomic pairs and serializes concurrent writers
  ---
  duration_ms: 34.913805
  ...
# Subtest: failed transaction does not poison later writes
ok 17 - failed transaction does not poison later writes
  ---
  duration_ms: 2.23479
  ...
# Subtest: demo is labelled and persists real history without fake search results
ok 18 - demo is labelled and persists real history without fake search results
  ---
  duration_ms: 7.769574
  ...
# Subtest: HTTP lifecycle, ownership, security, streaming and deletion
    # Subtest: health never reveals credentials
    ok 1 - health never reveals credentials
      ---
      duration_ms: 6.003125
      ...
    # Subtest: create conversation returns protected session cookie
    ok 2 - create conversation returns protected session cookie
      ---
      duration_ms: 10.42173
      ...
    # Subtest: cross-origin write is blocked
    ok 3 - cross-origin write is blocked
      ---
      duration_ms: 6.785153
      ...
    # Subtest: other session cannot read conversation ID
    ok 4 - other session cannot read conversation ID
      ---
      duration_ms: 3.590162
      ...
    # Subtest: invalid timezone rejected before generation
    ok 5 - invalid timezone rejected before generation
      ---
      duration_ms: 19.092817
      ...
    # Subtest: chat emits progress and labelled answer events
    ok 6 - chat emits progress and labelled answer events
      ---
      duration_ms: 10.269942
      ...
    # Subtest: history persists successful user-assistant pair and exports
    ok 7 - history persists successful user-assistant pair and exports
      ---
      duration_ms: 6.201205
      ...
    # Subtest: static traversal is not served
    ok 8 - static traversal is not served
      ---
      duration_ms: 2.90962
      ...
    # Subtest: history deletion removes conversations
    ok 9 - history deletion removes conversations
      ---
      duration_ms: 5.049884
      ...
    1..9
ok 19 - HTTP lifecycle, ownership, security, streaming and deletion
  ---
  duration_ms: 181.770249
  ...
# Subtest: provider wire contract uses server header and only Google Search
ok 20 - provider wire contract uses server header and only Google Search
  ---
  duration_ms: 22.261169
  ...
# Subtest: provider does not leak an upstream error body
ok 21 - provider does not leak an upstream error body
  ---
  duration_ms: 1.630314
  ...
1..21
# tests 30
# suites 0
# pass 30
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 434.603521
```
