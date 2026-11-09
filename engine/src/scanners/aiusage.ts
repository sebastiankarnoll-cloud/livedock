import { importsModule, isRoute, moduleName } from "./access.ts";
import type { Src } from "./load.ts";

// Shared by areas 3 and 4: where is an AI service called, from which provider,
// and which API routes lead to such a call.

export type Provider = "openai" | "anthropic" | "google" | "mistral" | "unknown";

export const AI_CALL =
  /\.chat\.completions\.create\(|\.messages\.create\(|\.chat\.complete\(|\.chat\.stream\(|\bgenerateText\(|\bstreamText\(|\bgenerateObject\(|\.generateContent\(|\.responses\.create\(/;

const NON_EU: Provider[] = ["openai", "anthropic", "google"];
/** Signs that a region or an own endpoint is configured; then we do not claim "outside the EU". */
const REGION_HINT = /baseURL|AzureOpenAI|azure|\beu\b|europe|eu-|\.eu\./i;

export function providerOf(text: string): Provider {
  if (/from\s+["']openai["']|@ai-sdk\/openai|require\(\s*["']openai["']\s*\)/.test(text)) return "openai";
  if (/@anthropic-ai\/sdk|@ai-sdk\/anthropic/.test(text)) return "anthropic";
  if (/@mistralai\/mistralai|@ai-sdk\/mistral/.test(text)) return "mistral";
  if (/@google\/generative-ai|@google\/genai|@ai-sdk\/google/.test(text)) return "google";
  return "unknown";
}

export interface AiFile extends Src {
  provider: Provider;
  /** true if provider is outside the EU and no region/endpoint hint is present */
  outsideEu: boolean;
}

export interface AiRoute {
  route: Src;
  /** AI files this route leads to (itself, or imported modules) */
  via: AiFile[];
}

export function analyzeAiUsage(sources: Src[]): { aiFiles: AiFile[]; aiRoutes: AiRoute[] } {
  const aiFiles: AiFile[] = sources
    .filter((s) => AI_CALL.test(s.text))
    .map((s) => {
      const provider = providerOf(s.text);
      return { ...s, provider, outsideEu: NON_EU.includes(provider) && !REGION_HINT.test(s.text) };
    });
  const aiRoutes: AiRoute[] = [];
  for (const s of sources) {
    if (!isRoute(s.rel, s.text)) continue;
    const via = aiFiles.filter((a) => a.rel === s.rel || importsModule(s.text, moduleName(a.rel)) >= 0);
    if (via.length) aiRoutes.push({ route: s, via });
  }
  return { aiFiles, aiRoutes };
}
