import { listAgents, upsertAgent } from "./repos/agents";
import { listProviders, upsertProvider, listModels, upsertModel } from "./repos/providers";
import { getOrCreateLocalUser } from "./repos/users";
import { listProfiles, createProfile } from "./repos/profiles";
import { getAllSettings } from "./repos/settings";
import { getDb } from "./sql";

export async function seedIfEmpty(): Promise<void> {
  // --- User & Profile seeding (always run) ---
  const user = await getOrCreateLocalUser();
  const profiles = await listProfiles(user.id);
  let defaultProfileId: string;
  if (profiles.length === 0) {
    const workProfile = await createProfile({
      user_id: user.id,
      name: "工作模式",
      icon: "💼",
    });
    await createProfile({
      user_id: user.id,
      name: "生活模式",
      icon: "🏠",
    });
    defaultProfileId = workProfile.id;
  } else {
    defaultProfileId = profiles[0].id;
  }

  // Backfill existing topics/tags that have no profile_id
  const db = await getDb();
  await db.execute("UPDATE topics SET profile_id = ? WHERE profile_id IS NULL", [defaultProfileId]);
  await db.execute("UPDATE tags SET profile_id = ? WHERE profile_id IS NULL", [defaultProfileId]);

  // Check if onboarding is done; if so, seed defaults as before
  const settings = await getAllSettings();
  const onboardingDone = settings.onboarding_done;

  // --- Agent seeding ---
  const agents = await listAgents();
  if (agents.length === 0 && onboardingDone) {
    await upsertAgent({
      name: "助理小葵",
      system_prompt:
        "你是助理小葵，一个友善、专注的AI助手。保持回答简洁有条理，必要时引用来源，并在不确定时询问用户以确认意图。",
    });
    await upsertAgent({
      name: "Researcher",
      system_prompt:
        "You are a careful researcher. Break complex topics into sub-questions, surface key facts, and propose sub-topics that the user could explore deeper.",
    });
  }

  // --- Provider seeding ---
  const providers = await listProviders();
  if (providers.length === 0 && onboardingDone) {
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
