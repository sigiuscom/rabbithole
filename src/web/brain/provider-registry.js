export const PROVIDERS = Object.freeze({
  openrouter: Object.freeze({
    id: "openrouter",
    aliases: Object.freeze(["anthropic", "openai"]),
    label: "OpenRouter",
    recommended: true,
    model_source: "catalog",
    base_url: "https://openrouter.ai/api/v1",
    kind: "openai-compatible",
    requires_key: true,
    author_model: "anthropic/claude-sonnet-5",
    answer_model: "anthropic/claude-sonnet-5",
  }),
  custom: Object.freeze({
    id: "custom",
    label: "Local",
    model_source: "custom",
    endpoint_editable: true,
    base_url: "http://localhost:11434/v1",
    kind: "openai-compatible",
    requires_key: false,
    supports_key: true,
    author_model: "llama3.2",
    answer_model: "llama3.2",
  }),
  "azure-foundry": Object.freeze({
    id: "azure-foundry",
    label: "Azure AI Foundry",
    model_source: "manual",
    endpoint_editable: true,
    base_url: "https://g42-openai-sweden-central.openai.azure.com/openai/v1",
    endpoint_hint: "Use the Azure OpenAI v1 endpoint, ending in /openai/v1.",
    kind: "openai-compatible",
    auth: "api-key",
    requires_key: true,
    author_model: "gpt-5.6-terra",
    answer_model: "gpt-5.6-terra",
  }),
});

export function resolveProviderId(id) {
  if (PROVIDERS[id]) return id;
  return Object.values(PROVIDERS).find((provider) => provider.aliases?.includes(id))?.id || "openrouter";
}

export function providerFor(id) {
  return PROVIDERS[resolveProviderId(id)];
}

export function defaultBrainSettings() {
  const provider = PROVIDERS.openrouter;
  return {
    preset: provider.id,
    base_url: provider.base_url,
    author_model: provider.author_model,
    answer_model: provider.answer_model,
    fetch_proxy_url: "",
    session_only: false,
  };
}

export function settingsForProvider(id, current = {}) {
  const provider = providerFor(id);
  return {
    ...current,
    preset: provider.id,
    base_url: provider.base_url,
    author_model: provider.author_model,
    answer_model: provider.answer_model,
  };
}
