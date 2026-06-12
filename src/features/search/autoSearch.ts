/**
 * Auto-fallback search chain (inspired by openHanako).
 *
 * Tries configured API providers first, then falls back to AnySearch Free.
 */

import {
  searchTavily,
  searchSerper,
  searchBrave,
  searchAnySearchFree,
  API_PROVIDERS,
  SearchRateLimitError,
  type SearchResult,
  type SearchProviderKey,
} from "./providers";

export interface SearchConfig {
  provider: "auto" | SearchProviderKey;
  apiKeys: Record<string, string>;
  maxResults?: number;
  locale?: string;
}

export interface SearchPayload {
  query: string;
  results: SearchResult[];
  provider: string;
  diagnostics: { attempts: SearchAttempt[] };
}

interface SearchAttempt {
  provider: string;
  status: "ok" | "empty" | "error";
  resultCount?: number;
  error?: string;
}

function runProvider(
  provider: SearchProviderKey,
  query: string,
  maxResults: number,
  apiKeys: Record<string, string>,
  locale: string,
): Promise<SearchResult[]> {
  switch (provider) {
    case "tavily":
      return searchTavily(query, maxResults, apiKeys.tavily || "");
    case "serper":
      return searchSerper(query, maxResults, apiKeys.serper || "");
    case "brave":
      return searchBrave(query, maxResults, apiKeys.brave || "");
    case "anysearch_free":
      return searchAnySearchFree(query, maxResults, locale);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function providerRequiresKey(provider: SearchProviderKey): boolean {
  return provider !== "anysearch_free";
}

/**
 * Auto mode: try all configured API providers, then AnySearch Free.
 */
async function doAutoSearch(
  query: string,
  maxResults: number,
  apiKeys: Record<string, string>,
  locale: string,
): Promise<SearchPayload> {
  const attempts: SearchAttempt[] = [];

  // Build chain: providers with valid keys first, then AnySearch Free
  const configuredApis = API_PROVIDERS.filter((p) => !!apiKeys[p]);
  const chain: SearchProviderKey[] = [...configuredApis, "anysearch_free"];

  for (const provider of chain) {
    if (providerRequiresKey(provider) && !apiKeys[provider]) {
      continue;
    }

    const attempt: SearchAttempt = { provider, status: "error" };
    try {
      const results = await runProvider(provider, query, maxResults, apiKeys, locale);
      if (results.length === 0) {
        attempt.status = "empty";
        attempts.push(attempt);
        continue;
      }
      attempt.status = "ok";
      attempt.resultCount = results.length;
      attempts.push(attempt);
      return { query, results, provider, diagnostics: { attempts } };
    } catch (err) {
      attempt.status = "error";
      attempt.error = err instanceof Error ? err.message : String(err);
      attempts.push(attempt);

      // If rate limited, skip this provider but continue chain
      if (err instanceof SearchRateLimitError) {
        continue;
      }
    }
  }

  return { query, results: [], provider: "none", diagnostics: { attempts } };
}

/**
 * Main search entry point.
 */
export async function autoSearch(
  query: string,
  config: SearchConfig,
): Promise<SearchPayload> {
  const maxResults = config.maxResults ?? 10;
  const locale = config.locale ?? "en";

  if (config.provider === "auto") {
    return doAutoSearch(query, maxResults, config.apiKeys, locale);
  }

  // Single provider mode
  const provider = config.provider;
  const attempts: SearchAttempt[] = [];

  // For anysearch_free, no key needed; for others, fall back to auto if no key
  if (providerRequiresKey(provider) && !config.apiKeys[provider]) {
    // No key configured, fall back to auto
    return doAutoSearch(query, maxResults, config.apiKeys, locale);
  }

  const attempt: SearchAttempt = { provider, status: "error" };
  try {
    const results = await runProvider(provider, query, maxResults, config.apiKeys, locale);
    attempt.status = results.length > 0 ? "ok" : "empty";
    attempt.resultCount = results.length;
    attempts.push(attempt);
    return { query, results, provider, diagnostics: { attempts } };
  } catch (err) {
    attempt.status = "error";
    attempt.error = err instanceof Error ? err.message : String(err);
    attempts.push(attempt);

    // On failure, try AnySearch Free as fallback
    if (provider !== "anysearch_free") {
      const fallbackAttempt: SearchAttempt = { provider: "anysearch_free", status: "error" };
      try {
        const results = await searchAnySearchFree(query, maxResults, locale);
        fallbackAttempt.status = results.length > 0 ? "ok" : "empty";
        fallbackAttempt.resultCount = results.length;
        attempts.push(fallbackAttempt);
        return { query, results, provider: "anysearch_free", diagnostics: { attempts } };
      } catch (fallbackErr) {
        fallbackAttempt.error = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        attempts.push(fallbackAttempt);
      }
    }

    return { query, results: [], provider: "none", diagnostics: { attempts } };
  }
}

/**
 * Verify a search API key by doing a test query.
 */
export async function verifySearchKey(
  provider: SearchProviderKey,
  apiKey: string,
): Promise<boolean> {
  if (provider === "anysearch_free") return true;
  try {
    await runProvider(provider, "test", 1, { [provider]: apiKey }, "en");
    return true;
  } catch {
    return false;
  }
}
