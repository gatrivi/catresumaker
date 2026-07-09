import { GoogleGenAI } from "@google/genai";

export type LLMProvider = "nvidia" | "freellmapi" | "gemini";

export type LLMStatus = {
  available: boolean;
  provider: LLMProvider | null;
  model: string | null;
  providers: Record<LLMProvider, boolean>;
};

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "catresumaker-job-os" } },
    });
  }
  return geminiClient;
}

export function getLLMStatus(): LLMStatus {
  const providers = {
    nvidia: !!process.env.NVIDIA_API_KEY,
    freellmapi: !!process.env.FREELLMAPI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  };
  const order: LLMProvider[] = ["nvidia", "freellmapi", "gemini"];
  const active = order.find((p) => providers[p]) ?? null;
  const model = active
    ? active === "nvidia"
      ? process.env.NVIDIA_MODEL || "z-ai/glm-5.2"
      : active === "freellmapi"
        ? process.env.FREELLMAPI_MODEL || "auto"
        : process.env.GEMINI_MODEL || "gemini-2.0-flash"
    : null;

  return {
    available: !!active,
    provider: active,
    model,
    providers,
  };
}

async function callOpenAICompatible(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const base = params.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.35,
      max_tokens: params.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LLM request failed (${response.status}). ${text.slice(0, 400)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned an empty or invalid response.");
  }
  return content;
}

async function callGeminiChat(systemPrompt: string, userPrompt: string, temperature = 0.35): Promise<string> {
  const ai = getGeminiClient();
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned empty content.");
  return text;
}

export type LLMCallResult = {
  content: string;
  provider: LLMProvider;
  model: string;
};

/**
 * Provider priority: NVIDIA → FreeLLMAPI → Gemini.
 */
export async function callLLMChat(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number; provider?: LLMProvider }
): Promise<LLMCallResult> {
  const status = getLLMStatus();
  if (!status.available) {
    throw new Error(
      "AI offline. Set NVIDIA_API_KEY, FREELLMAPI_API_KEY, or GEMINI_API_KEY in `.env`."
    );
  }

  const tryOrder: LLMProvider[] = opts?.provider
    ? [opts.provider]
    : (["nvidia", "freellmapi", "gemini"] as LLMProvider[]).filter((p) => status.providers[p]);

  let lastError: Error | null = null;

  for (const provider of tryOrder) {
    try {
      if (provider === "nvidia" && process.env.NVIDIA_API_KEY) {
        const content = await callOpenAICompatible({
          baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
          apiKey: process.env.NVIDIA_API_KEY,
          model: process.env.NVIDIA_MODEL || "z-ai/glm-5.2",
          systemPrompt,
          userPrompt,
          temperature: opts?.temperature,
          maxTokens: opts?.maxTokens,
        });
        return { content, provider, model: process.env.NVIDIA_MODEL || "z-ai/glm-5.2" };
      }

      if (provider === "freellmapi" && process.env.FREELLMAPI_API_KEY) {
        const content = await callOpenAICompatible({
          baseUrl: process.env.FREELLMAPI_BASE_URL || "http://localhost:3001/v1",
          apiKey: process.env.FREELLMAPI_API_KEY,
          model: process.env.FREELLMAPI_MODEL || "auto",
          systemPrompt,
          userPrompt,
          temperature: opts?.temperature,
          maxTokens: opts?.maxTokens,
        });
        return { content, provider, model: process.env.FREELLMAPI_MODEL || "auto" };
      }

      if (provider === "gemini" && process.env.GEMINI_API_KEY) {
        const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        const content = await callGeminiChat(systemPrompt, userPrompt, opts?.temperature);
        return { content, provider, model };
      }
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("No LLM provider available.");
}
