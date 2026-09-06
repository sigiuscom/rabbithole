## Why

The Sigius deployment requires every browser to configure its own LLM. It must use the existing Spark DeepSeek deployment automatically, with a dedicated server credential.

## What Changes

- Docker builds use a managed provider and ignore saved provider/model/key choices.
- A loopback Node sidecar validates chat requests and streams only the configured Spark model through LiteLLM. No secret reaches browser assets, settings, exports or responses.
- The Helm chart supplies the key through Infisical/ESO and restricts ingress to the existing Tailscale route.
- NPM requires the same step-ca client certificate as Glance. This access policy was explicitly requested by the user.
- The user also requested fixing the resulting external probe alert. Update the oracle2 probe in `observability` to expect the mTLS rejection while preserving public server-certificate validation.

## Capabilities

### New Capabilities
- `managed-llm`: automatic fixed-model generation and certificate-protected deployment.

## Impact

Existing local documents remain readable. Upstream npm builds and MCP retain their current behavior; the Docker build opts into managed mode. No additional npm dependency, Git publication or application rollout is authorized. Key provisioning and NPM certificate protection are authorized. Rollout requires publishing the reviewed code through the existing release flow; revert the chart/image to roll back, retaining mTLS.

## Workflow Profile

- Profile: feature
- Artifact depth: Standard
- Verification depth: Comprehensive
- Walking skeleton: Required; the single implementation outcome covers browser, streaming proxy, restricted key and rendered chart.
- Rationale: Changes the LLM trust boundary and deployment configuration.
