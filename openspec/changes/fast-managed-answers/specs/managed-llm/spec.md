## ADDED Requirements

### Requirement: Direct answer generation
The managed proxy SHALL explicitly request `reasoning_effort=none` for document, explainer and branch generation, avoiding an invisible model deliberation phase.

#### Scenario: Interactive request
- **WHEN** the browser requests managed generation
- **THEN** LiteLLM receives the fixed Spark model and server-selected `reasoning_effort=none`, and the existing answer stream reaches the browser.

#### Scenario: Browser attempts to change reasoning
- **WHEN** a caller supplies its own reasoning parameter
- **THEN** the proxy rejects the unsupported field instead of allowing the caller to restore the silent delay.
