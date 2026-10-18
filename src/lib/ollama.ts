const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen-local:latest';

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '');
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
}

export interface OllamaHealth {
  running: boolean;
  ollama_running: boolean;
  model_available: boolean;
  model_name: string;
  error?: string;
}

export interface GenerateCompletionOptions {
  timeout?: number;
  format?: string;
}

interface OllamaTagModel {
  name: string;
  model: string;
}

interface OllamaTagsResponse {
  models?: OllamaTagModel[];
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export async function checkOllamaHealth(): Promise<OllamaHealth> {
  const baseUrl = getOllamaBaseUrl();
  const modelName = getOllamaModel();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        running: false,
        ollama_running: false,
        model_available: false,
        model_name: modelName,
        error: `Ollama responded with HTTP status ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as OllamaTagsResponse;
    const models = data.models || [];

    const isAvailable = models.some((m) => {
      const name = m.name?.toLowerCase() || '';
      const target = modelName.toLowerCase();
      return (
        name === target ||
        name === `${target}:latest` ||
        target === `${name}:latest` ||
        name.startsWith(`${target}:`)
      );
    });

    return {
      running: true,
      ollama_running: true,
      model_available: isAvailable,
      model_name: modelName,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      running: false,
      ollama_running: false,
      model_available: false,
      model_name: modelName,
      error: errorMessage,
    };
  }
}

export async function generateCompletion(
  prompt: string,
  options?: GenerateCompletionOptions
): Promise<string> {
  const baseUrl = getOllamaBaseUrl();
  const modelName = getOllamaModel();
  const defaultTimeout = process.env.OLLAMA_TIMEOUT ? Number(process.env.OLLAMA_TIMEOUT) : 90000;
  const timeoutMs = options?.timeout ?? defaultTimeout;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload: {
      model: string;
      prompt: string;
      stream: boolean;
      format?: string;
    } = {
      model: modelName,
      prompt,
      stream: false,
    };

    if (options?.format) {
      payload.format = options.format;
    }

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(
        `Ollama generation request failed (${res.status} ${res.statusText}): ${errorText}`
      );
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    if (typeof data.response !== 'string') {
      throw new Error('Invalid response structure from Ollama API: missing "response" string field.');
    }

    return data.response;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Ollama generation timed out after ${timeoutMs}ms.`);
    }
    throw err;
  }
}
