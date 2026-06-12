/**
 * Web search module for KUI agent.
 *
 * Usage:
 *   import { webSearch, getSearchConfig } from "../search";
 *   const payload = await webSearch("some query", { maxResults: 10 });
 */

import { autoSearch, type SearchConfig, type SearchPayload } from "./autoSearch";
import { getAllSettings } from "../../db/repos/settings";

export type { SearchConfig, SearchPayload };
export { verifySearchKey } from "./autoSearch";
export type { SearchResult, SearchProviderKey } from "./providers";

/**
 * Read search configuration from app settings.
 */
export async function getSearchConfig(): Promise<SearchConfig> {
  const settings = await getAllSettings();
  return {
    provider: settings.search_provider ?? "auto",
    apiKeys: settings.search_api_keys ?? {},
  };
}

/**
 * Perform a web search using the auto-fallback chain.
 */
export async function webSearch(
  query: string,
  opts?: { maxResults?: number; locale?: string },
): Promise<SearchPayload> {
  const config = await getSearchConfig();
  return autoSearch(query, {
    ...config,
    maxResults: opts?.maxResults ?? 10,
    locale: opts?.locale ?? "en",
  });
}
