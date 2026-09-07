## Why

Rabbithole currently answers from model knowledge and document context. Users need current internet facts with sources, without changing the fixed Spark model or reintroducing hidden reasoning delays.

## What Changes

- Give DeepSeek server-owned web search and page-reading tools, with the current UTC date.
- Reuse Vane's existing SearXNG JSON API directly. Vane's answer API uses another LLM by default; direct retrieval preserves Spark-only generation.
- Bound research to two planning rounds and four tool calls, then stream the answer with source links.
- Plan searches from a separate explicit question field without document context. After search results arrive, permit only source-ID reads.
- Read only search-result URLs, pin validated public IPv4 addresses and restrict outbound network access. No browser key or tool definitions are accepted.
- Show an explicit notice when online evidence could not be obtained. Pure document rewriting can skip web research.

## Capabilities

### Modified Capabilities
- `managed-llm`: web-grounded answers, provenance and bounded server tool execution.

## Impact

Changes stay in the managed client adapter, sidecar, chart and tests. No new service, dependency or credentials. Existing browser/MCP builds, documents and mTLS remain compatible. Older browser requests without the optional question field retain their previous answer-only behavior. Publishing the client and chart enables tools; rollback restores the prior sidecar and NetworkPolicy together.

## Workflow Profile

- Profile: feature
- Artifact depth: Standard
- Verification depth: Comprehensive
- Walking skeleton: Required; the sole implementation outcome proves search, page reading, Spark synthesis, citations and deployment end to end.
- Rationale: External content and public outbound requests create a new trust boundary.
