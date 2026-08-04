import type { AiSettings } from "../types/settings";

export interface OllamaGenerateOptions {
  baseUrl: string;
  model: string;
  prompt: string;
  system: string;
  timeoutMs: number;
  stream?: boolean;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}

export function normalizeOllamaBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function validateOllamaBaseUrl(value: string): {
  valid: boolean;
  warning?: string;
} {
  try {
    const url = new URL(normalizeOllamaBaseUrl(value));
    if (!["http:", "https:"].includes(url.protocol))
      return { valid: false, warning: "Use an http(s) URL." };
    const host = url.hostname.toLowerCase();
    if (!["localhost", "127.0.0.1", "::1"].includes(host))
      return {
        valid: true,
        warning:
          "This is not a loopback address. Confirm that sending report text there is acceptable.",
      };
    return { valid: true };
  } catch {
    return { valid: false, warning: "Enter a valid Ollama URL." };
  }
}

async function request(
  url: string,
  init: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const response = await fetch(`${normalizedBaseUrl}/api/tags`);

  if (!response.ok) {
    throw new Error(`Unable to load Ollama models: ${response.status}`);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("models" in data) ||
    !Array.isArray(data.models)
  ) {
    throw new Error("Invalid Ollama model-list response.");
  }

  const modelNames = data.models
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return "";
      }

      const record = item as Record<string, unknown>;

      if (typeof record.name === "string") {
        return record.name.trim();
      }

      if (typeof record.model === "string") {
        return record.model.trim();
      }

      return "";
    })
    .filter((value): value is string => value.length > 0);

  return Array.from(new Set(modelNames));
}

export async function generateOllamaResponse(
  options: OllamaGenerateOptions,
): Promise<string> {
  const response = await request(
    `${normalizeOllamaBaseUrl(options.baseUrl)}/api/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        prompt: options.prompt,
        system: options.system,
        stream: Boolean(options.stream),
      }),
      signal: options.signal,
    },
    options.timeoutMs,
  );
  if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
  if (!options.stream || !response.body) {
    const data = (await response.json()) as { response?: string };
    return data.response ?? "";
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    for (const line of decoder
      .decode(chunk.value, { stream: true })
      .split("\n")) {
      if (!line.trim()) continue;
      try {
        const token =
          (JSON.parse(line) as { response?: string }).response ?? "";
        output += token;
        options.onToken?.(token);
      } catch {
        // A malformed stream chunk does not expose or execute model output.
      }
    }
  }
  return output;
}

export function aiSettingsReady(settings: AiSettings): boolean {
  return (
    settings.enabled &&
    Boolean(settings.selectedModel) &&
    validateOllamaBaseUrl(settings.baseUrl).valid
  );
}
