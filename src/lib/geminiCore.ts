import { Ingredient } from '../types';

const STORAGE_KEY = 'mess_gemini_api_key';
const REJECTED_KEYS_SESSION_KEY = 'mess_rejected_gemini_keys';
const DEFAULT_REQUEST_TIMEOUT_MS = 45000;
const MODELS_DISCOVERY_TIMEOUT_MS = 10000;

export const SUSPENDED_KEY_PREFIXES = ['AQ.Ab8RN6KbKxeN', 'AQ.Ab8RN6K4x'];

export const FALLBACK_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
];

const EXCLUDED_MODEL_KEYWORDS = [
  'tts',
  'audio',
  'embed',
  'imagen',
  'image-generation',
  '-image',
  'nano-banana',
  'lyria',
  'transcribe',
  'deep-research',
  'computer-use',
  'antigravity',
  'gemma',
  'realtime',
  'whisper',
  'robotics',
];

const RETIRED_MODEL_PREFIXES = ['gemini-1.', 'gemini-2.0', 'gemini-2.5'];

const runtimeRejectedKeys = new Set<string>();

class FatalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalAuthError';
  }
}

function getRejectedKeySet(): Set<string> {
  const combined = new Set<string>(runtimeRejectedKeys);
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(REJECTED_KEYS_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const k of parsed) {
            if (typeof k === 'string' && k) combined.add(k);
          }
        }
      }
    } catch {
      // ignore storage parse issues
    }
  }
  return combined;
}

export function markKeyRejected(key?: string | null): void {
  const trimmed = key?.trim();
  if (!trimmed) return;
  runtimeRejectedKeys.add(trimmed);
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      const updated = Array.from(getRejectedKeySet());
      sessionStorage.setItem(REJECTED_KEYS_SESSION_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }
}

export function clearSessionRejectedKeys(): void {
  runtimeRejectedKeys.clear();
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(REJECTED_KEYS_SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

export function isSuspendedKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (SUSPENDED_KEY_PREFIXES.some((prefix) => trimmed.includes(prefix))) {
    return true;
  }
  return getRejectedKeySet().has(trimmed);
}

export function getDefaultGeminiApiKey(): string {
  return '';
}

/**
 * Retrieves the Gemini API key from localStorage or Vite environment variables,
 * automatically skipping suspended or session-rejected keys.
 */
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (
      saved &&
      (isSuspendedKey(saved) ||
        saved.trim() === 'undefined' ||
        saved.trim() === 'null')
    ) {
      localStorage.removeItem(STORAGE_KEY);
    } else if (saved && saved.trim()) {
      return saved.trim();
    }
  }

  try {
    const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (viteKey && typeof viteKey === 'string' && viteKey.trim() && !isSuspendedKey(viteKey)) {
      return viteKey.trim();
    }
  } catch {
    // ignore
  }

  try {
    const procKey = process.env.GEMINI_API_KEY;
    if (procKey && typeof procKey === 'string' && procKey.trim() && !isSuspendedKey(procKey)) {
      return procKey.trim();
    }
  } catch {
    // ignore
  }

  return getDefaultGeminiApiKey();
}

/**
 * Saves or clears the Gemini API key in localStorage.
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    if (trimmed) {
      // Saving an explicit key lets a user retry if they intentionally re-entered it
      runtimeRejectedKeys.delete(trimmed);
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

function inferMimeType(file: File | Blob): string {
  if (file.type && file.type.trim()) return file.type;
  if ('name' in file && typeof file.name === 'string') {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
  }
  return 'image/jpeg';
}

/**
 * Converts a raw File or Blob into base64.
 */
export async function fileToBase64(
  file: File | Blob
): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Failed to read file as data URL'));
        return;
      }
      const base64Data = result.substring(commaIndex + 1);
      resolve({ base64Data, mimeType: inferMimeType(file) });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes, downsizes, and compresses photos to max 1200px JPEG.
 * Non-image files (e.g. PDF) are encoded directly as base64.
 */
export async function optimizeImageForOcr(
  file: File | Blob
): Promise<{ base64Data: string; mimeType: string }> {
  const detectedMime = inferMimeType(file);
  if (!detectedMime.startsWith('image/')) {
    return fileToBase64(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fileToBase64(file).then(resolve).catch(reject);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const commaIndex = dataUrl.indexOf(',');
      const base64Data = dataUrl.substring(commaIndex + 1);
      resolve({ base64Data, mimeType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      fileToBase64(file).then(resolve).catch(reject);
    };
    img.src = url;
  });
}

/**
 * Resolves an extracted packaging unit against an ingredient's registered units.
 */
export function resolveBestUnit(
  extractedUnit: string | undefined,
  ingredient: Ingredient
): string {
  const availableUnits = [
    ingredient.unit,
    ...(ingredient.conversions?.map((c) => c.unit_name) || []),
  ];

  if (!extractedUnit || !extractedUnit.trim()) {
    return ingredient.conversions?.[0]?.unit_name || ingredient.unit;
  }

  const rawU = extractedUnit.toLowerCase().trim();
  const exact = availableUnits.find((u) => u.toLowerCase() === rawU);
  if (exact) return exact;

  if (rawU.includes('bag')) {
    const bagUnit = availableUnits.find((u) => u.toLowerCase().includes('bag'));
    if (bagUnit) return bagUnit;
  }
  if (rawU.includes('tin')) {
    const tinUnit = availableUnits.find((u) => u.toLowerCase().includes('tin'));
    if (tinUnit) return tinUnit;
  }
  if (rawU.includes('pack') || rawU.includes('pkt') || rawU.includes('pouch')) {
    const pktUnit = availableUnits.find(
      (u) => u.toLowerCase().includes('packet') || u.toLowerCase().includes('pouch')
    );
    if (pktUnit) return pktUnit;
  }
  if (rawU.includes('quintal') || rawU.includes('qntl')) {
    const qUnit = availableUnits.find((u) => u.toLowerCase().includes('quintal'));
    if (qUnit) return qUnit;
  }

  if (rawU === 'kg' || rawU === 'kgs' || rawU === 'kilo') {
    if (ingredient.unit.toLowerCase() === 'kg') return ingredient.unit;
  }
  if (rawU === 'l' || rawU === 'ltr' || rawU === 'litre' || rawU === 'liter') {
    if (ingredient.unit.toLowerCase().includes('l')) return ingredient.unit;
  }

  return ingredient.conversions?.[0]?.unit_name || ingredient.unit;
}

export function scoreGeminiVisionModel(modelName: string): number {
  const lower = modelName.toLowerCase();
  if (lower === 'gemini-flash-lite-latest') return 100;
  if (lower === 'gemini-3.5-flash-lite') return 98;
  if (lower === 'gemini-3.1-flash-lite') return 92;
  if (lower.includes('flash-lite') && !lower.includes('preview')) return 90;
  if (lower.includes('flash-lite')) return 86;
  if (lower === 'gemini-flash-latest') return 84;
  if (lower === 'gemini-3.8-flash') return 82;
  if (lower === 'gemini-3.7-flash') return 80;
  if (lower === 'gemini-3.6-flash') return 78;
  if (lower === 'gemini-3.5-flash') return 76;
  if (lower.includes('flash')) return 70;
  if (lower === 'gemini-4-hydrogen' || lower === 'gemini-4-neon') return 60;
  if (lower.includes('pro')) return 40;
  return 10;
}

export function filterAndRankModels(rawModels: any[]): string[] {
  const discovered = rawModels
    .filter(
      (m: any) =>
        Array.isArray(m?.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
    )
    .map((m: any) => String(m.name || '').replace(/^models\//, '').trim())
    .filter((name: string) => {
      if (!name) return false;
      const lower = name.toLowerCase();
      if (EXCLUDED_MODEL_KEYWORDS.some((kw) => lower.includes(kw))) return false;
      if (RETIRED_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix))) return false;
      return true;
    });

  if (discovered.length === 0) return [];

  const unique = Array.from(new Set(discovered));
  unique.sort((a, b) => scoreGeminiVisionModel(b) - scoreGeminiVisionModel(a));
  return unique.slice(0, 6);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function handleFatalKeyResponse(
  status: number,
  errMsg: string,
  apiKey: string
): never | void {
  if (status === 403) {
    markKeyRejected(apiKey);
    setGeminiApiKey('');
    throw new FatalAuthError(
      `Gemini API key rejected (403): ${errMsg}. Stale cached key has been cleared.`
    );
  }
  if (status === 400 && errMsg.includes('API_KEY_INVALID')) {
    markKeyRejected(apiKey);
    setGeminiApiKey('');
    throw new FatalAuthError(
      'Invalid Gemini API Key. Please verify your key from Google AI Studio.'
    );
  }
}

export interface GeminiVisionRequest {
  apiKey: string;
  systemPrompt: string;
  mimeType: string;
  base64Data: string;
  actionLabel: string;
  onProgress?: (message: string) => void;
  requestTimeoutMs?: number;
}

/**
 * Discovers active Gemini Vision models on the user's account and invokes generateContent
 * with structured retry + fallback across healthy models, immediately aborting on 403/invalid keys.
 */
export async function callGeminiVisionJson({
  apiKey,
  systemPrompt,
  mimeType,
  base64Data,
  actionLabel,
  onProgress,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: GeminiVisionRequest): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error(
      'Gemini API Key is not configured. Please enter your free Gemini API Key from Google AI Studio.'
    );
  }

  onProgress?.('Checking active Gemini Vision models on your account...');

  let candidateModels: string[] = [];
  try {
    const listRes = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`,
      { method: 'GET' },
      MODELS_DISCOVERY_TIMEOUT_MS
    );

    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData?.models)) {
        candidateModels = filterAndRankModels(listData.models);
      }
    } else if (listRes.status === 403 || listRes.status === 400) {
      const errJson = await listRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || listRes.statusText || `HTTP ${listRes.status}`;
      handleFatalKeyResponse(listRes.status, errMsg, cleanKey);
    }
  } catch (err: any) {
    if (err instanceof FatalAuthError) throw err;
    // Network blip or timeout during discovery — fall back to curated list
  }

  if (candidateModels.length === 0) {
    candidateModels = [...FALLBACK_GEMINI_MODELS];
  }

  let rawResponseText = '';
  let lastError: Error | null = null;
  let sawRateLimit = false;
  let sawOverload = false;

  for (const model of candidateModels) {
    onProgress?.(`${actionLabel} using ${model}...`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        };

        const response = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          },
          requestTimeoutMs
        );

        if (response.status === 429) {
          sawRateLimit = true;
          lastError = new Error(
            'Google Gemini free tier request limit reached (15 requests/minute). Please wait 15–20 seconds and try again.'
          );
          if (attempt === 0) {
            onProgress?.(`Rate limit reached on ${model}. Pausing 3.5s before automatic retry...`);
            await new Promise((r) => setTimeout(r, 3500));
            continue;
          } else {
            onProgress?.(`Switching to backup model...`);
            await new Promise((r) => setTimeout(r, 1200));
            break;
          }
        }

        if (response.status === 503 || response.status === 500 || response.status === 504) {
          sawOverload = true;
          if (attempt === 0) {
            onProgress?.(`Model ${model} is busy (${response.status} High Demand). Retrying in 1.8s...`);
            await new Promise((r) => setTimeout(r, 1800));
            continue;
          } else {
            onProgress?.(`Model ${model} is at capacity. Switching to backup model...`);
            lastError = new Error(`Model ${model} temporarily unavailable (${response.status})`);
            await new Promise((r) => setTimeout(r, 800));
            break;
          }
        }

        if (response.status === 404) {
          break;
        }

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || response.statusText || `HTTP ${response.status}`;

          handleFatalKeyResponse(response.status, errMsg, cleanKey);

          if (
            response.status === 400 &&
            (errMsg.includes('modality') ||
              errMsg.includes('not enabled') ||
              errMsg.includes('not supported') ||
              errMsg.includes('JSON mode'))
          ) {
            lastError = new Error(`Model ${model} does not accept images/JSON: ${errMsg}`);
            break;
          }

          throw new Error(`Gemini API error (${response.status}): ${errMsg}`);
        }

        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (candidateText) {
          rawResponseText = candidateText;
          break;
        }

        lastError = new Error(`Empty AI response from ${model}`);
        break;
      } catch (err: any) {
        if (err instanceof FatalAuthError) {
          throw err;
        }
        if (err?.name === 'AbortError') {
          sawOverload = true;
          lastError = new Error(`Request to ${model} timed out. Switching model...`);
          if (attempt === 0) {
            onProgress?.(`Model ${model} timed out. Retrying...`);
            continue;
          }
          break;
        }
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === 1) break;
      }
    }

    if (rawResponseText) break;
  }

  if (!rawResponseText) {
    if (sawRateLimit && !sawOverload) {
      throw new Error(
        'Google Gemini free tier request limit reached (15 requests/minute). Please wait 15–20 seconds for the quota to reset, then try again.'
      );
    }
    if (sawOverload) {
      throw new Error(
        'Google Gemini Vision servers are temporarily busy (503 High Demand) across backup models. Please wait a few seconds and try again.'
      );
    }
    throw (
      lastError ||
      new Error('Failed to extract text from the image. Please try a clearer photo.')
    );
  }

  return rawResponseText;
}

/**
 * Parses raw text from Gemini into a JSON object, tolerating optional markdown code fences.
 */
export function parseGeminiJsonResponse<T = any>(rawResponseText: string): T {
  const cleaned = rawResponseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error('AI response was not valid JSON. Please try scanning again.');
  }
}
