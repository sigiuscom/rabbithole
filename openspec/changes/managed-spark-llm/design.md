## Boundaries and data flow

The managed esbuild flag selects fixed browser settings and read-only model controls. Existing OpenAI-compatible streaming adapters remain in use. nginx forwards only the chat path to a Node sidecar bound to loopback. The sidecar uses Node's HTTP/fetch/stream primitives, projects validated text messages and temperature into a fixed LiteLLM request, and adds its server credential. No user-supplied forwarding headers or URL are reused.

Keep nginx as the static server. A raw nginx-to-LiteLLM proxy was rejected because arbitrary JSON could override routing or provider parameters. Replacing all static serving with a custom server adds unrelated behavior. The sidecar source is packaged once as a Helm ConfigMap file.

## Security and failure handling

NPM host 25 gets Glance host 18's client-certificate policy. The public TLS certificate remains unchanged. The oracle2 probe uses a new `https_mtls_gate_public_ca` module, because Glance's existing private-CA module skips chain validation. This probe requires HTTP 400 and the missing-certificate body. It measures the public gate; Kubernetes probes retain application-health coverage. Deploy the VM configuration and verify `probe_success=1` and absence of the firing alert. Pod ingress is limited to the existing Tailscale router; port 8081 listens only on loopback. The dedicated team key permits only the Spark model. Input is bounded, the upstream destination is deployment-owned, and errors are generic. Abort and timeout stop upstream streaming. Missing credentials prevent sidecar startup.

## Compatibility, rollout and rollback

The outer NPM host uses `proxy_read_timeout 610s`, `proxy_buffering off` and `client_max_body_size 2m`. These match inner nginx; the sidecar has a 600-second overall deadline. The previous NPM default of 60 seconds was insufficient for Spark generation.

The managed flag is enabled only in Docker. Browser settings are ignored for LLM routing, without deleting documents or user keys from local storage. Infisical stores `/rabbithole/LITELLM_API_KEY`; ESO owns the Kubernetes secret. First provision the key and certificate policy, then publish the reviewed source/chart through normal GitOps when explicitly authorized. Until that publication the live app remains the old build behind mTLS. Roll back the image/chart together; keep mTLS and revoke the dedicated key if abandoning the integration.

## Verification

Add a focused Node/Playwright check for fresh/stale settings, all three generation operations, strict request validation, secret isolation, SSE, failure and cancellation. Run it red before implementation. Run types, purity, build and the existing staged suite; lint/render the Helm chart and inspect its secret references and security context. Verify the live restricted key against Spark and denial for another model; verify NPM rejection without a certificate and success with the existing client certificate. Obtain independent review of the exact diff before completion.

## Least Confident Decisions

- Spark's home uplink affects latency; allow a bounded long streaming timeout and surface failures without fallback.
- Tailscale ingress source was verified as the router pod IP. A routing change that removes SNAT requires revisiting the selector.
- Infisical's ESO identity is read-only; provisioning uses the documented operator identity. LiteLLM forbids admin personal keys, so the new credential belongs to the dedicated `rabbithole` team. Both team and key allow only Spark.
- Current vLLM accepts `reasoning_effort=none`, not the historical `off` spelling. The proxy does not accept that browser parameter and uses the model default.
