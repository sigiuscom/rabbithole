## ADDED Requirements

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
