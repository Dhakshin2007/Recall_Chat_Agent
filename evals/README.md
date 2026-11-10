# Evaluation, not a fake benchmark

`npm test` checks deterministic plumbing, not model intelligence. `cases.json` is a manual behavioral rubric; no score is claimed until a real Gemini run is reviewed.

Run a real-key session, create an actual shortlist, then ask follow-ups in a new conversation in the same browser. Inspect the evidence trail and open every citation. Test dates with the unit-test fixtures rather than editing production history to misrepresent when a conversation happened.

For each case record: model, date, prompt, response, memory IDs, sources, supported segments, latency, pass/fail for every requirement, and a reviewer comment. Use 0/1 per requirement; unsupported answers fail even if fluent. Do not equate number of sources with correctness.

Compare against a stateless baseline by asking the same follow-up in a fresh private browser window. A successful memory architecture should recover entities and assumptions in the existing session and admit missing context in the fresh one.

Live review still required: real API availability, per-request billing, Search grounding quality, claim/citation entailment, malicious webpage robustness, browser layout/accessibility, and concurrency under your target deployment load.
