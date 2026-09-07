# managed-llm Specification

## Purpose
Provide automatic Spark DeepSeek generation for the certificate-protected Rabbithole deployment, with a dedicated server credential and no browser configuration.

## Requirements

### Requirement: Automatic managed generation
The managed Docker build SHALL generate documents, explainers and branches through `/api/llm/chat/completions`, using only `selfhosted/deepseek-v4-flash-spark`, without requesting credentials or allowing provider/model changes.

#### Scenario: New or returning browser
- **WHEN** a browser has empty storage or stale provider/model/key settings
- **THEN** generation uses the managed route without transmitting a stored key, and settings display the fixed model.

### Requirement: Server-only restricted credential
The server SHALL use a dedicated LiteLLM virtual key restricted to the Spark model. It SHALL accept only chat messages and temperature from the browser, force streaming and the model, disable fallbacks, limit request size and concurrency, and keep credentials and upstream errors private.

#### Scenario: Provider override or invalid request
- **WHEN** a request includes another model, endpoint, provider credential, unsupported fields, malformed messages or excessive input
- **THEN** the server rejects it before contacting LiteLLM.

#### Scenario: Streaming and failure
- **WHEN** LiteLLM streams an answer, fails, times out, or the browser cancels
- **THEN** content streams incrementally, failures remain visible without secret details, and cancellation closes the upstream request.

### Requirement: Certificate access and deployment
The public site SHALL require a valid step-ca client certificate like Glance. The deployment SHALL obtain its key from Infisical through ESO and SHALL not expose the sidecar outside pod loopback.

#### Scenario: Anonymous access
- **WHEN** a public client has no valid client certificate
- **THEN** NPM rejects both the site and generation endpoint.

#### Scenario: Missing secret
- **WHEN** the deployment has no managed credential
- **THEN** generation cannot become ready; it never falls back to a browser credential or another provider.

#### Scenario: External monitoring after mTLS activation
- **WHEN** the oracle2 external probe calls Rabbithole without a client certificate
- **THEN** it requires a valid public server certificate and HTTP 400 with the missing-client-certificate message, and the reachability alert resolves.

### Requirement: Preserve upstream and documents
Unmanaged builds and MCP SHALL preserve existing behavior, and saved documents and portable snapshots SHALL remain compatible.

#### Scenario: Normal upstream build
- **WHEN** `npm run build` runs without the managed flag
- **THEN** the existing provider setup and regression tests still work.

### Requirement: Direct answer generation
The managed proxy SHALL explicitly request `reasoning_effort=none` for document, explainer and branch generation, avoiding an invisible model deliberation phase.

#### Scenario: Interactive request
- **WHEN** the browser requests managed generation
- **THEN** LiteLLM receives the fixed Spark model and server-selected `reasoning_effort=none`, and the existing answer stream reaches the browser.

#### Scenario: Browser attempts to change reasoning
- **WHEN** a caller supplies its own reasoning parameter
- **THEN** the proxy rejects the unsupported field instead of allowing the caller to restore the silent delay.

### Requirement: Current web evidence
The managed service SHALL let Spark search current web information and read discovered pages before answering factual questions that require fresh sources. It SHALL supply the current date and preserve direct answer mode.

#### Scenario: Current release question
- **WHEN** a user asks for the latest release of a product
- **THEN** Spark searches the web, can read a discovered primary source, and the answer includes links to retrieved evidence.

#### Scenario: Document-only request
- **WHEN** a request only rewrites supplied material and needs no web facts
- **THEN** Spark can finish research without contacting search engines or pages.

### Requirement: Bounded server tools
Only the server SHALL define and execute tools, with at most two planning rounds and four calls. Final generation SHALL use the existing Spark-only key, no reasoning phase and no fallback model.

#### Scenario: Private document context
- **WHEN** the application requests research for a question about a document
- **THEN** planning receives only the separately typed question, while private document messages are reserved for final synthesis without tools.

#### Scenario: Source-influenced query
- **WHEN** external search evidence has entered the planning transcript
- **THEN** the executor no longer permits free-form web searches; only server-known source IDs can be read.

#### Scenario: Legacy or document-writing request
- **WHEN** the request has no explicit research question
- **THEN** it retains the existing answer-only behavior and does not execute research.

#### Scenario: Unsupported or excessive tool call
- **WHEN** the model supplies an unknown tool, invalid arguments or excess calls
- **THEN** execution stops or returns a bounded safe error without executing arbitrary requests.

#### Scenario: Cancellation
- **WHEN** the client disconnects or the research deadline expires
- **THEN** outstanding model/search/page requests are aborted and request capacity is released.

### Requirement: Safe page reading
Page reading SHALL accept only server-known search-result URLs, validate every destination and redirect, pin public IPv4 resolution, and enforce response size, type and time limits. It SHALL never forward credentials or fetch private/platform endpoints.

#### Scenario: SSRF or DNS rebinding
- **WHEN** a URL or DNS response targets loopback, private, link-local, reserved or Azure platform addresses
- **THEN** it is rejected before connection, including after redirects.

### Requirement: Source provenance and failure disclosure
The service SHALL attach links from actual retrieved source records and treat page content as untrusted. It SHALL disclose unavailable evidence instead of silently presenting model knowledge as a verified current answer.

#### Scenario: Search unavailable
- **WHEN** research was attempted but no evidence could be retrieved
- **THEN** the answer explicitly states that current information could not be verified.

#### Scenario: Source contains instructions
- **WHEN** a source tells the assistant to ignore its instructions or open an internal address
- **THEN** source text remains data and tool destination/argument restrictions still apply.
