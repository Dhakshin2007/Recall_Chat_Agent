# Recall — answers with a timeline

A focused submission for the Minimi chat-agent challenge: a Node.js chat agent with one external tool, **Google Search**, accessed through Gemini. Its central idea is not “a chat UI with search.” It is **historical conversation evidence + current web evidence**, with their dates and provenance kept separate.

> Built to be understandable and reviewable. Production-minded single-instance implementation, not a claim of production certification or guaranteed selection. Read the limitations before deploying publicly.

## Quick start

Requires Node.js **20.12+** (Node 22 recommended), npm, and a Gemini API key with access to the configured model and Google Search grounding.

```bash
npm install
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
# Edit .env: GEMINI_API_KEY=your_key_here
npm run dev
```

Open **http://localhost:3000**. Use this exact origin by default; `127.0.0.1` is a different browser origin. No frontend build, database server, Python, search-provider account, or second API key is required. `npm install` succeeds with zero third-party dependencies.

```dotenv
GEMINI_API_KEY=your_actual_key
GEMINI_MODEL=gemini-flash-lite-latest
```

Get a key in Google AI Studio. Availability, quotas, pricing, and grounding support depend on your account/model; this project makes no free-tier promise. Model ID is configurable because models change over time. A missing key leaves the UI usable but real chat returns a clear configuration error. The key never goes into browser JavaScript, HTML, chat prompts, history, or logs.

For an honest offline preview, set `DEMO_MODE=true` in `.env`, then restart. Offline replies are visibly labelled **OFFLINE DEMO** and contain no fabricated research or citations. Disable demo mode before submitting.

## Why this architecture fits the challenge

The brief emphasizes architecture and examples that revisit previous decisions: Monday's five CRMs, a question from 3 November, and last Tuesday's Postgres hosting comparison. The important problem is preserving the original entities and assumptions, not simply running today's question through a search model.

```text
Browser (session cookie, browser IANA timezone)
    │ POST /api/chat              ◄── NDJSON progress + final answer
    ▼
HTTP boundary: exact origin • validation • size/rate limits • session isolation
    ▼
Temporal retrieval (deterministic, local, no external tool)
    ├── dated user messages + adjacent assistant baseline
    ├── lexical entity matching + recent conversational context
    └── cross-conversation recall inside the same browser session
    ▼
Gemini generateContent (one generation; one bounded retry for 429/5xx)
    └── ONLY external tool: Google Search grounding
    ▼
Grounding adapter: actual provider sources + segment-to-source mappings
    ▼
Atomic commit: user + assistant pair + evidence trace
    ▼
Safe text UI + citations + isolated search-suggestions widget
```

Memory retrieval is application infrastructure, not another model tool. No shell, code execution, arbitrary URL fetcher, embeddings service, or extra search API is exposed to the agent. Gemini decides whether to use its search tool. The UI never calls “tool available” a completed search.

### The distinctive behavior

- **Then vs now:** the instruction policy explicitly separates an old quoted price from a freshly checked price and from evidence that a change actually happened. A current page alone does not prove when a change occurred.
- **No invented history:** a missing target date is marked explicitly in the context. Missing shortlists should trigger a focused clarification rather than imagined entities. This is a model behavior requirement, not a formal guarantee.
- **Dates with a timezone:** UTC persistence, browser IANA timezone for calendar-day matching. “Last Tuesday” on Tuesday means the previous Tuesday. Bare weekdays mean the most recent preceding occurrence. Day-month names infer the current local year unless provided. ISO dates are accepted. Ambiguous numeric dates such as `11/03` are intentionally not silently parsed.
- **Inspectable evidence:** request ID, model, date interpretation, selected memory IDs, latency, query metadata, sources, finish reason, and token-usage metadata are available in each assistant message's evidence trail.
- **Grounding, not decoration:** source links come from provider metadata; inline citation labels are inserted only when returned support text matches the answer. This avoids trusting model-invented URLs or citation IDs. Missing support is labelled, not hidden.
- **One key:** Gemini supplies both generation and the Google Search tool. See `docs/API_NOTES.md` for upstream documentation.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `src/server.js` | HTTP boundary, sessions, limits, request lifecycle, NDJSON |
| `src/agent.js` | Retrieval → generation → atomic persistence orchestration |
| `src/memory.js` | Timezone-aware date interpretation and deterministic retrieval |
| `src/gemini.js` | Gemini REST adapter, system policy, timeout-aware retry |
| `src/grounding.js` | Safe source normalization and citation insertion |
| `src/store.js` | Single-process serialized writes and atomic file replacement |
| `src/config.js` | Server-only configuration and .env loading |
| `public/` | Responsive vanilla-JS UI; no frontend toolchain |
| `test/` | Offline deterministic unit/integration tests |
| `evals/` | Manual model-quality rubric; no invented benchmark score |
| `DESIGN.md` | Short architecture rationale, trade-offs, rejected alternatives |
| `docs/` | API references, deployment and explanation notes, verification record |

## API

All private endpoints are scoped to a random server-created `HttpOnly; SameSite=Strict` cookie. A conversation ID alone never grants access.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Configuration status; never the key |
| GET / POST | `/api/conversations` | List / create conversations |
| GET | `/api/conversations/:id` | Session-owned messages |
| POST | `/api/chat` | `{conversationId, text, timezone}` → NDJSON events |
| GET | `/api/export` | Export this session as JSON |
| DELETE | `/api/history` | Delete this session's conversations |

Write requests require an `Origin` exactly matching `PUBLIC_ORIGIN`; POST requires JSON. For curl, include `-H 'Origin: http://localhost:3000'`, save cookies with `-c`, and resend with `-b`. Exported JSON is sensitive: it contains your conversations, not credentials.

NDJSON events: `progress`, then `answer` or `error`. HTTP validation failures use a JSON error and a non-200 status. Once streaming headers have been sent, upstream errors are represented by an `error` event, not a changed HTTP status. This is **stage streaming**, not token streaming: no fake typewriter animation and no claim that incomplete citations are final.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `GEMINI_API_KEY` | empty | Only required external API credential |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Search-capable model available to your account |
| `PORT` | `3000` | HTTP port |
| `HOST` | `127.0.0.1` | Use `0.0.0.0` inside containers |
| `DATA_DIR` | `./data` | Persistent local directory; keep out of Git |
| `PUBLIC_ORIGIN` | `http://localhost:3000` | Exact browser origin, no trailing slash |
| `COOKIE_SECURE` | `false` | Set true behind HTTPS |
| `DEMO_MODE` | `false` | Explicit offline, non-research preview |

`.env` is ignored by Git and Docker. Existing environment variables override `.env`. Use simple `NAME=value` lines; shell interpolation and multiline dotenv values are not implemented. Production secrets should be environment variables supplied by your deployment, not baked into images.

## Tests and evaluation

```bash
npm run check
npm test
```

Offline tests cover date resolution, timezone boundaries, date and entity retrieval, missing memories, Unicode-safe citation insertion, source URL filtering, duplicate sources, missing-key handling, persistence, concurrent writes, transaction recovery, and clearly labelled offline behavior. HTTP smoke checks were also run; see `docs/VERIFICATION.md` for actual results and untested areas.

Read `evals/README.md` and run the behavioral cases with a real key before submission. Test fluent-but-wrong answers, absent baselines, billing assumptions, sources that do not entail claims, and ambiguous dates. A green unit test suite does not establish real research accuracy.

## A short review demo

1. Start with a real API key and `DEMO_MODE=false`.
2. Ask: “Compare Neon, Supabase, and Render for a small Postgres app. Verify official pricing and state currency, billing period, and plan assumptions.”
3. Open the evidence trail; verify links and whether claim-level supports were returned.
4. Start a new conversation in the same browser and ask: “Which options did we compare? Is that advice still correct today? Separate confirmed changes from things you cannot establish.”
5. Open a fresh private browser window and ask about the same shortlist. It should acknowledge the missing baseline rather than pretend it remembers.
6. Ask about a date with no history: “What did I ask on 3 November?” It should not fabricate historical messages.
7. Export history, reload, and verify persistence; delete history and verify it is gone from this session.

Do not preseed fake “real” conversations to impress reviewers. Unit fixtures use historical timestamps only for deterministic tests.

## Production-minded safeguards (implemented)

- Server-side key only; no key logs or query-string credential.
- Exact write-origin checks, HttpOnly SameSite cookies, optional Secure cookie.
- Session ownership checks for conversation reads and writes.
- 8,000-character message limit and 24 KB request-body limit.
- 12 chat attempts/minute/session and 30 new sessions/minute/remote-IP.
- One in-flight generation per session; bounded 60-second generation deadline.
- One retry only for provider 429/5xx; no retry amplification loop.
- User/assistant pairs commit together only after success.
- Fixed public asset allowlist, security headers, restrictive script CSP.
- Model/user messages use DOM text nodes, not raw HTML or unsanitized Markdown.
- Provider Search markup lives in a sandboxed iframe without script permission.
- Structured logs omit prompt text, credentials, and upstream response bodies.
- Export/delete controls and bounded per-session conversation/message counts.

## Deliberate limits — read before public deployment

This implementation is designed for a hiring evaluation or small, trusted, **single-process** deployment. Its JSON store rewrites the entire state per transaction. Atomic rename protects against partial replacement; it is not a distributed database, does not use fsync for power-loss durability, and cannot coordinate multiple processes. No data-at-rest encryption, account authentication, session rotation, admin console, scheduled retention, global storage quota, or automated backups is implemented. Old anonymous sessions remain stored until removed administratively; cookie expiry is not data deletion.

Browser cookie possession is the identity boundary. Clearing cookies loses access; this is not cross-device memory. There is no import endpoint. Prompt-injection resistance is instruction-level separation plus limited tools, not a guarantee. Search results can still be wrong or malicious. The code never performs arbitrary server-side URL fetches from model output.

Retrieval is lexical + dates + recent context, bounded to 24,000 characters of historical text and 12 high-scoring historical user turns plus adjacent messages/current context. It is not semantic search. References to several similar topics, multiple date phrases, synonyms, very long histories, and full natural-language calendar expressions may be missed or need clarification. `matchedDay` means some stored user message exists that day, not that the requested subject was found. Dates without years use the current year, not a smart historical year inference.

Search is model-managed and cannot be forced by this adapter. Citation mappings are provider evidence, not independent fact checking. When support text repeats, the adapter cites its last exact occurrence; it does not solve full claim attribution. Grounding support absence is not a measure of answer falsity. API behavior, entitlement, charges, and Search-suggestion rendering should be verified with your key. The Google widget is isolated for safety; a browser/CSP or provider markup change could affect appearance.

Stage streaming starts quickly, but final answer latency depends on Gemini and search. No response cache is used: fresh comparisons should not accidentally reuse stale prices. The Node request deadline does not provide distributed cancellation or exactly-once provider billing. A disconnected request may finish a local commit; reload history before resubmitting. Truncation (`MAX_TOKENS`) is visible in the evidence trail but not automatically repaired.

Before a public production launch: authenticated accounts, Postgres transactions, managed secrets, HTTPS, global/IP/tenant quotas at an edge proxy, bounded storage/retention, backup/restore tests, load testing, privacy review, and adversarial live evaluations are required. See `docs/DEPLOYMENT.md`.

