# Explain this confidently — after reading the code

## A 60-second walkthrough

“Recall solves temporal continuity. A dated chat record tells us what we said then; current search tells us what sources say now. I keep those evidence classes separate. A local retriever resolves calendar days in the user's timezone and brings the old question with its neighboring answer, preserving shortlist membership and billing assumptions. Gemini gets that context and Google Search as its only external tool. Citations come from the API's grounding metadata rather than model-generated links. The evidence trail lets you audit retrieval and grounding. I deliberately choose one generation, bounded context, and no stale pricing cache. The persistence implementation is a portable single-process prototype behind a replaceable boundary, not a distributed production database.”

## Questions you should answer yourself

1. Why is “the price is $20 now” insufficient proof of “the price has not changed since Tuesday”?
2. Which time zone decides whether a message belongs to 3 November? What does “last Tuesday” mean on Tuesday?
3. What does matchedDay prove and what does it not prove?
4. Why keep adjacent assistant messages with retrieved user messages?
5. What happens when lexical matching misses a synonym or several similar shortlists exist?
6. Why aren't source count and claim-level support count measures of truth?
7. Why is exact support-text matching safer than assuming API byte offsets equal JavaScript string offsets?
8. Why is one process safe enough for serialized file writes, but two processes aren't?
9. Which security properties are implemented in code and which are model instructions only?
10. Why can a request be HTTP 200 but contain a streamed error event?
11. Why stage streaming instead of token streaming here? What would correct citation-aware token streaming require?
12. What happens on disconnect, timeout, provider quota exhaustion, and MAX_TOKENS truncation?
13. Which tests ran with real external services? (None unless you run them with your own key.)

## Small ownership exercise

Add a unit test for a timezone/month-boundary date, improve one retrieval failure you can reproduce, and run the live rubric. Be ready to discuss what did not work. Do not present this scaffold as proven high-accuracy research software before you measure it.
