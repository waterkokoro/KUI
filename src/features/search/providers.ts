/**
 * Search provider implementations.
 * Each function returns a unified SearchResult[] format.
 */

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface SearchProviderId {
  tavily: true;
  serper: true;
  brave: true;
  anysearch_free: true;
}

export type SearchProviderKey = keyof SearchProviderId;

export const API_PROVIDERS: SearchProviderKey[] = ["tavily", "serper", "brave"];

const SEARCH_TIMEOUT = 30_000;

// ──────────────────────────────────────────
// Tavily — AI-native search API
// ──────────────────────────────────────────
export async function searchTavily(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: Math.min(maxResults, 20),
      search_depth: "basic",
    }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT),
  });

  if (res.status === 429 || res.status === 402) {
    throw new SearchRateLimitError(`Tavily API ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`Tavily API ${res.status}`);
  }

  const data = await res.json();
  return (data.results || []).map(
    (r: { title?: string; url?: string; content?: string }) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
    }),
  );
}

// ──────────────────────────────────────────
// Serper — Google Search API
// ──────────────────────────────────────────
export async function searchSerper(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SearchResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT),
  });

  if (res.status === 429 || res.status === 402) {
    throw new SearchRateLimitError(`Serper API ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`Serper API ${res.status}`);
  }

  const data = await res.json();
  return (data.organic || [])
    .slice(0, maxResults)
    .map(
      (r: { title?: string; link?: string; snippet?: string }) => ({
        title: r.title || "",
        url: r.link || "",
        content: r.snippet || "",
      }),
    );
}

// ──────────────────────────────────────────
// Brave Search — Independent index
// ──────────────────────────────────────────
export async function searchBrave(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: String(maxResults),
  });

  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT),
    },
  );

  if (res.status === 429 || res.status === 402) {
    throw new SearchRateLimitError(`Brave API ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`Brave API ${res.status}`);
  }

  const data = await res.json();
  return (data.web?.results || [])
    .slice(0, maxResults)
    .map(
      (r: { title?: string; url?: string; description?: string }) => ({
        title: r.title || "",
        url: r.url || "",
        content: r.description || "",
      }),
    );
}

// ──────────────────────────────────────────
// AnySearch Free — Anonymous, no API key
// ──────────────────────────────────────────
const ANYSEARCH_URL = "https://api.anysearch.com/v1/search";

export async function searchAnySearchFree(
  query: string,
  maxResults: number,
  locale = "en",
): Promise<SearchResult[]> {
  const language = locale.startsWith("zh")
    ? "zh-CN"
    : locale.startsWith("ja")
      ? "ja"
      : locale.startsWith("ko")
        ? "ko"
        : "en";

  const res = await fetch(ANYSEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      max_results: Math.min(maxResults, 100),
      language,
    }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT),
  });

  if (res.status === 429 || res.status === 402) {
    throw new SearchRateLimitError(`AnySearch API ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`AnySearch API ${res.status}`);
  }

  const data = await res.json();

  // Handle envelope error
  if (data && typeof data === "object" && data.code !== undefined && data.code !== 0) {
    const msg = typeof data.message === "string" ? data.message : `code ${data.code}`;
    throw new Error(`AnySearch API: ${msg}`);
  }

  const rawResults = Array.isArray(data?.data?.results)
    ? data.data.results
    : Array.isArray(data?.results)
      ? data.results
      : [];

  return rawResults
    .slice(0, maxResults)
    .map(
      (r: { title?: string; url?: string; content?: string; description?: string; snippet?: string }) => ({
        title: r.title || "",
        url: r.url || "",
        content: r.content || r.description || r.snippet || "",
      }),
    );
}

// ──────────────────────────────────────────
// Error types
// ──────────────────────────────────────────
export class SearchRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchRateLimitError";
  }
}
