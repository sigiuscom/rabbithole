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
