import { listAgents, upsertAgent } from "./repos/agents";
import { listProviders, upsertProvider, listModels, upsertModel } from "./repos/providers";

export async function seedIfEmpty(): Promise<void> {
  const agents = await listAgents();
  if (agents.length === 0) {
    await upsertAgent({
      name: "Default",
      system_prompt:
        "You are kui, a helpful assistant for structured learning. Keep answers focused, cite sources where useful, and ask clarifying questions when needed.",
    });
    await upsertAgent({
      name: "Researcher",
      system_prompt:
        "You are a careful researcher. Break complex topics into sub-questions, surface key facts, and propose sub-topics that the user could explore deeper.",
    });
  }

  const providers = await listProviders();
  if (providers.length === 0) {
    const presets = [
      { name: "OpenAI", kind: "openai" as const, base_url: "https://api.openai.com/v1", models: [
        { model_id: "gpt-4o-mini", display_name: "GPT-4o mini" },
        { model_id: "gpt-4o", display_name: "GPT-4o" },
      ] },
      { name: "Anthropic", kind: "anthropic" as const, base_url: "https://api.anthropic.com/v1", models: [
        { model_id: "claude-3-5-sonnet-latest", display_name: "Claude 3.5 Sonnet" },
        { model_id: "claude-3-5-haiku-latest", display_name: "Claude 3.5 Haiku" },
      ] },
      { name: "DeepSeek", kind: "openai" as const, base_url: "https://api.deepseek.com/v1", models: [
        { model_id: "deepseek-chat", display_name: "DeepSeek Chat" },
        { model_id: "deepseek-reasoner", display_name: "DeepSeek Reasoner" },
      ] },
      { name: "Kimi", kind: "openai" as const, base_url: "https://api.moonshot.cn/v1", models: [
        { model_id: "moonshot-v1-8k", display_name: "Kimi 8k" },
        { model_id: "moonshot-v1-32k", display_name: "Kimi 32k" },
      ] },
    ];
    for (const p of presets) {
      const created = await upsertProvider({
        name: p.name,
        kind: p.kind,
        base_url: p.base_url,
        api_key: "",
        enabled: 1,
      });
      const existing = await listModels(created.id);
      if (existing.length === 0) {
        for (const m of p.models) {
          await upsertModel({ provider_id: created.id, model_id: m.model_id, display_name: m.display_name });
        }
      }
    }
  }
}
