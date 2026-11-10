# Upstream API assumptions

The adapter calls the native Gemini REST `v1beta/models/{model}:generateContent` endpoint, authenticates using the `x-goog-api-key` header, and sends `tools: [{google_search: {}}]`. There is no separate search API key. It reads candidate text and `groundingMetadata.groundingChunks`, `groundingSupports`, `webSearchQueries`, and `searchEntryPoint.renderedContent` when supplied.

References consulted while building:
- https://ai.google.dev/gemini-api/docs/google-search
- https://googleapis.github.io/js-genai/release_docs/interfaces/types.GroundingMetadata.html
- https://ai.google.dev/gemini-api/docs/structured-output

The project does not combine JSON response schemas with grounding, does not use the OpenAI-compatible endpoint, and does not add unsupported custom tool combinations. Model version is a configuration setting, not a claim that this default is the newest or fastest model.

Grounding availability, billing, attribution, and Search-suggestion display requirements can change. Review Google's current terms for your model/account and inspect the sandboxed widget in a live browser before public launch. No third-party search snippets are invented when metadata is absent. The response may be memory-only even though the tool was available.
