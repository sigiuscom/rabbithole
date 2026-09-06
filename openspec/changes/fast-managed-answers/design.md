## Decision and evidence

Add the model-supported `reasoning_effort: 'none'` to the existing server-owned LiteLLM payload for all three generation operations. The current vLLM accepts `none`; `off` is invalid. Omitting the field enables reasoning and does not disable it. Continue withholding reasoning fields from browser responses.

This is a request configuration defect, not a network failure: the public request returned HTTP 200 after 128.170 seconds, Spark had no queued requests, and a direct comparison isolated the reasoning parameter. Do not replace the model, weaken mTLS, expose reasoning, or add a new provider abstraction.

## Verification and rollback

First make the existing proxy integration test fail when the upstream request omits `reasoning_effort=none`. Check all generation paths, managed browser behavior, types, build and Helm. Obtain independent review. Publish the ConfigMap change, verify deployment readiness, and time first visible text and completion through the certificate-authenticated website. On an idle Spark, a short explainer should show text within 15 seconds; this is a smoke-test threshold, not a guarantee under load. Preserve model/key restrictions and the external probe. Revert the parameter if quality or protocol compatibility regresses.

## Least Confident Decisions

Disabling reasoning trades some complex-task quality for interactive latency. The measured short request confirms protocol support and speed; live root/branch checks must confirm usable document generation before completion.
