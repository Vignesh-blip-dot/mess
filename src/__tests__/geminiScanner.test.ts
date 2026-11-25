import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SUSPENDED_KEY_PREFIXES,
  isSuspendedKey,
  markKeyRejected,
  clearSessionRejectedKeys,
  getGeminiApiKey,
  setGeminiApiKey,
  resolveBestUnit,
  filterAndRankModels,
  parseGeminiJsonResponse,
  callGeminiVisionJson,
} from '../lib/geminiCore';
import type { Ingredient } from '../types';

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe('Gemini Key Management & Security', () => {
  beforeEach(() => {
    clearSessionRejectedKeys();
    const localMock = createStorageMock();
    const sessionMock = createStorageMock();
    vi.stubGlobal('window', { localStorage: localMock, sessionStorage: sessionMock });
    vi.stubGlobal('localStorage', localMock);
    vi.stubGlobal('sessionStorage', sessionMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('flags known suspended prefixes and runtime-rejected keys', () => {
    for (const prefix of SUSPENDED_KEY_PREFIXES) {
      expect(isSuspendedKey(`${prefix}123456`)).toBe(true);
    }
    expect(isSuspendedKey('AQ.Ab8RN6L7ActiveValidKey')).toBe(false);

    markKeyRejected('AQ.Ab8RN6_runtime_suspended');
    expect(isSuspendedKey('AQ.Ab8RN6_runtime_suspended')).toBe(true);
  });

  it('auto-purges suspended keys from localStorage when reading', () => {
    localStorage.setItem('mess_gemini_api_key', 'AQ.Ab8RN6K4xSuspendedOldKey');
    const retrieved = getGeminiApiKey();
    expect(localStorage.getItem('mess_gemini_api_key')).toBeNull();
    expect(isSuspendedKey(retrieved)).toBe(false);
  });

  it('persists and clears custom keys via setGeminiApiKey', () => {
    setGeminiApiKey('AQ.Ab8RN6L7NewKey123');
    expect(getGeminiApiKey()).toBe('AQ.Ab8RN6L7NewKey123');

    setGeminiApiKey('');
    expect(localStorage.getItem('mess_gemini_api_key')).toBeNull();
  });
});

describe('Model Discovery & Ranking', () => {
  it('excludes non-OCR, retired, TTS, and image-gen models and prioritizes flash-lite', () => {
    const rawModels = [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.5-flash-tts', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.5-transcribe', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/lyria-3.5', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemma-4-31b-it', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
    ];

    const ranked = filterAndRankModels(rawModels);
    expect(ranked[0]).toBe('gemini-flash-lite-latest');
    expect(ranked[1]).toBe('gemini-3.5-flash-lite');
    expect(ranked).not.toContain('gemini-2.5-flash');
    expect(ranked).not.toContain('gemini-2.5-flash-image');
    expect(ranked).not.toContain('gemini-3.5-flash-tts');
    expect(ranked).not.toContain('gemini-3.5-transcribe');
    expect(ranked).not.toContain('lyria-3.5');
    expect(ranked).not.toContain('gemma-4-31b-it');
    expect(ranked).not.toContain('gemini-embedding-001');
  });
});

describe('Packaging Unit Resolution & JSON Parsing', () => {
  const sampleIngredient: Ingredient = {
    ingredient_id: 'ing-rice',
    name: 'Sona Masoori Rice',
    category: 'provisions',
    unit: 'kg',
    current_stock: 100,
    current_price: 55,
    active: true,
    tracks_usage: true,
    conversions: [
      { id: 'conv-1', unit_name: '25 kg Bag', multiplier: 25 },
      { id: 'conv-2', unit_name: '50 kg Bag', multiplier: 50 },
    ],
  };

  it('resolves exact and partial packaging units accurately', () => {
    expect(resolveBestUnit('25 kg Bag', sampleIngredient)).toBe('25 kg Bag');
    expect(resolveBestUnit('bags', sampleIngredient)).toBe('25 kg Bag');
    expect(resolveBestUnit('kgs', sampleIngredient)).toBe('kg');
    expect(resolveBestUnit(undefined, sampleIngredient)).toBe('25 kg Bag');
  });

  it('parses markdown-fenced or raw JSON responses cleanly', () => {
    expect(parseGeminiJsonResponse('```json\n{"items":[{"raw_name":"Rice"}]}\n```')).toEqual({
      items: [{ raw_name: 'Rice' }],
    });
    expect(parseGeminiJsonResponse('Here is the data:\n{"ok":true}')).toEqual({ ok: true });
    expect(() => parseGeminiJsonResponse('not json at all')).toThrow();
  });
});

describe('callGeminiVisionJson Retry & Error Handling', () => {
  beforeEach(() => {
    clearSessionRejectedKeys();
    const localMock = createStorageMock();
    const sessionMock = createStorageMock();
    vi.stubGlobal('window', { localStorage: localMock, sessionStorage: sessionMock });
    vi.stubGlobal('localStorage', localMock);
    vi.stubGlobal('sessionStorage', sessionMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('aborts immediately on 403 without retrying all backup models', async () => {
    setGeminiApiKey('AQ.Ab8RN6BadKeyTest');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({
        error: { message: "Permission denied: Consumer 'projects/123' has been suspended." },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callGeminiVisionJson({
        apiKey: 'AQ.Ab8RN6BadKeyTest',
        systemPrompt: 'test',
        mimeType: 'image/jpeg',
        base64Data: 'AAAA',
        actionLabel: 'Testing',
      })
    ).rejects.toThrow(/Gemini API key rejected \(403\)/);

    // Must stop right after discovery returns 403 (1 call, not 10+ retries)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('mess_gemini_api_key')).toBeNull();
    expect(isSuspendedKey('AQ.Ab8RN6BadKeyTest')).toBe(true);
  });

  it('retries 503 then automatically falls back to healthy model', async () => {
    let modelCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/v1beta/models?key=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: [
              { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
        };
      }
      modelCalls++;
      // First two calls (model 1 attempt 0 and 1) return 503
      if (modelCalls <= 2) {
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: async () => ({ error: { message: 'High demand' } }),
        };
      }
      // Third call (model 2 attempt 0) succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"items":[]}' }] } }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const progressMsgs: string[] = [];
    const result = await callGeminiVisionJson({
      apiKey: 'AQ.Ab8RN6L7ValidKeyTest',
      systemPrompt: 'test',
      mimeType: 'image/jpeg',
      base64Data: 'AAAA',
      actionLabel: 'Extracting',
      onProgress: (m) => progressMsgs.push(m),
    });

    expect(result).toBe('{"items":[]}');
    expect(modelCalls).toBe(3);
    expect(progressMsgs.some((m) => m.includes('503 High Demand'))).toBe(true);
    expect(progressMsgs.some((m) => m.includes('gemini-3.5-flash-lite'))).toBe(true);
  }, 15000);

  it('aborts immediately when generateContent returns 403', async () => {
    setGeminiApiKey('AQ.Ab8RN6BadGenKey');
    let generateCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/v1beta/models?key=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: [
              { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
        };
      }
      generateCalls++;
      return {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: { message: 'Consumer suspended.' },
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callGeminiVisionJson({
        apiKey: 'AQ.Ab8RN6BadGenKey',
        systemPrompt: 'test',
        mimeType: 'image/jpeg',
        base64Data: 'AAAA',
        actionLabel: 'Testing',
      })
    ).rejects.toThrow(/Gemini API key rejected \(403\)/);

    expect(generateCalls).toBe(1);
    expect(localStorage.getItem('mess_gemini_api_key')).toBeNull();
    expect(isSuspendedKey('AQ.Ab8RN6BadGenKey')).toBe(true);
  });

  it('skips 404 models and retries 429 before succeeding on backup', async () => {
    let modelCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/v1beta/models?key=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: [
              { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
        };
      }
      modelCalls++;
      if (url.includes('gemini-flash-lite-latest')) {
        return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) };
      }
      if (url.includes('gemini-3.5-flash-lite')) {
        return { ok: false, status: 429, statusText: 'Too Many Requests', json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await callGeminiVisionJson({
      apiKey: 'AQ.Ab8RN6L7ValidKeyTest',
      systemPrompt: 'test',
      mimeType: 'image/jpeg',
      base64Data: 'AAAA',
      actionLabel: 'Extracting',
    });

    expect(result).toBe('{"ok":true}');
    // 1x 404 (immediate break), 2x 429 (retry once + break), 1x 200 = 4 calls
    expect(modelCalls).toBe(4);
  }, 15000);
});
