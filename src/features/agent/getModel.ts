import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getProvider } from "../../db/repos/providers";
import type { LanguageModel } from "ai";

export function parseModelRef(ref: string): { providerId: string; modelId: string } {
  const idx = ref.indexOf(":");
  if (idx < 0) return { providerId: ref, modelId: "" };
  return { providerId: ref.slice(0, idx), modelId: ref.slice(idx + 1) };
}

export async function resolveModel(modelRef: string): Promise<LanguageModel> {
  const { providerId, modelId } = parseModelRef(modelRef);
  const provider = await getProvider(providerId);
  if (!provider) throw new Error(`Provider not found: ${providerId}`);
  if (!modelId) throw new Error("Model id missing in modelRef");
  if (!provider.api_key) {
    throw new Error(
      `Provider "${provider.name}" has no API key. Set it in Settings → Models & APIs.`
    );
  }
  if (provider.kind === "openai") {
    const client = createOpenAI({
      apiKey: provider.api_key,
      baseURL: provider.base_url,
    });
    return client(modelId);
  }
  const client = createAnthropic({
    apiKey: provider.api_key,
    baseURL: provider.base_url,
    headers: { "anthropic-dangerous-direct-browser-access": "true" },
  });
  return client(modelId);
}
