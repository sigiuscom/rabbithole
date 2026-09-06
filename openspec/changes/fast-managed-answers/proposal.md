## Why

Managed Spark requests can spend minutes on hidden reasoning while the browser displays only Thinking. The observed public request completed in 128.170 seconds. A controlled short request used all 256 output tokens for reasoning with no answer; the same request with `reasoning_effort=none` produced answer text after 0.17 seconds.

## What Changes

The managed proxy explicitly requests `reasoning_effort=none`. Preserve the fixed Spark model, request validation, key isolation, streaming and existing timeouts. No browser settings or infrastructure-wide model changes.

## Capabilities

### Modified Capabilities
- `managed-llm`: interactive generation starts directly with answer text.

## Impact

Only the managed sidecar and its regression check change. Roll out its ConfigMap through GitOps and verify real browser time to visible text. Revert this request parameter to restore the previous model behavior. Reasoning-heavy tasks can lose quality; this deployment prioritizes interactive document exploration over an invisible deliberation phase.

## Workflow Profile

- Profile: bugfix
- Artifact depth: Minimal
- Verification depth: Comprehensive
- Walking skeleton: N/A (Bugfix)
- Rationale: Reproduced latency defect in the production LLM request boundary; requires a measured live check and independent review.
