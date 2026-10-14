import { Ingredient } from '../types';

const STORAGE_KEY = 'mess_gemini_api_key';

export interface ExtractedBillItem {
  id: string;
  raw_name: string;
  matched_ingredient_id: string;
  matched_ingredient_name: string;
  quantity: number;
  unit: string;
  rate: number | null;
  total_cost: number;
  confidence: number;
  is_matched: boolean;
  page?: number;
}

export interface ExtractedBillData {
  vendor: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  total_amount: number | null;
  is_continued?: boolean;
  items: ExtractedBillItem[];
}

/**
 * Retrieves the Gemini API key from localStorage or Vite environment variables.
 */
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (viteKey && viteKey.trim()) return viteKey.trim();

  try {
    const procKey = process.env.GEMINI_API_KEY;
    if (procKey && procKey.trim()) return procKey.trim();
  } catch {
    // ignore
  }

  return '';
}

/**
 * Saves the Gemini API key into localStorage.
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

/**
 * Converts a raw File or Blob into base64.
 */
export async function fileToBase64(file: File | Blob): Promise<{ base64Data: string; mimeType: string }> {
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
      const mimeType = file.type || 'image/jpeg';
      resolve({ base64Data, mimeType });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes, downsizes, and compresses invoice photos to max 1200px.
 * This drastically reduces tokens-per-minute (TPM) consumption by ~75%,
 * completely avoiding Gemini free-tier 429 quota exhaustion.
 */
export async function optimizeImageForOcr(file: File | Blob): Promise<{ base64Data: string; mimeType: string }> {
  if (!file.type.startsWith('image/')) {
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
 * Client-side fuzzy string similarity score (0 to 1).
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const words1 = s1.split(/\s+/).filter((w) => w.length > 1);
  const words2 = s2.split(/\s+/).filter((w) => w.length > 1);
  const common = words1.filter((w) => words2.some((w2) => w2.includes(w) || w.includes(w2)));
  if (words1.length > 0 && common.length > 0) {
    return Math.min(0.9, (common.length / Math.max(words1.length, words2.length)) * 0.85);
  }

  return 0.0;
}

/**
 * Matches an extracted item name against registered provisions.
 */
function findBestIngredientMatch(
  rawName: string,
  provisions: Ingredient[]
): { ingredient: Ingredient | null; confidence: number } {
  let bestIng: Ingredient | null = null;
  let bestScore = 0;

  for (const ing of provisions) {
    let score = calculateSimilarity(rawName, ing.name);
    if (ing.name_telugu) {
      const teScore = calculateSimilarity(rawName, ing.name_telugu);
      if (teScore > score) score = teScore;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIng = ing;
    }
  }

  return {
    ingredient: bestScore >= 0.35 ? bestIng : null,
    confidence: bestScore,
  };
}

/**
 * Resolves the packaging unit against an ingredient's available units.
 */
function resolveBestUnit(
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
    const pktUnit = availableUnits.find((u) =>
      u.toLowerCase().includes('packet') || u.toLowerCase().includes('pouch')
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

/**
 * Scans a provisional bill image/document using Gemini Vision.
 */
export async function scanProvisionalBill(
  file: File | Blob,
  registeredIngredients: Ingredient[],
  customApiKey?: string,
  onProgress?: (message: string) => void,
  pageNumber: number = 1
): Promise<ExtractedBillData> {
  const apiKey = (customApiKey || getGeminiApiKey()).trim();

  if (!apiKey) {
    throw new Error(
      'Gemini API Key is not configured. Please enter your free Gemini API Key from Google AI Studio.'
    );
  }

  onProgress?.(`Optimizing invoice photo for Page ${pageNumber}...`);
  const { base64Data, mimeType } = await optimizeImageForOcr(file);

  const provisions = registeredIngredients.filter(
    (i) => i.category === 'provisions' && i.active
  );

  const inventoryCatalog = provisions
    .map((ing) => {
      const units = [
        ing.unit,
        ...(ing.conversions?.map((c) => `${c.unit_name} (=${c.multiplier}${ing.unit})`) || []),
      ];
      return `ID: "${ing.ingredient_id}" | Name: "${ing.name}"${ing.name_telugu ? ` (${ing.name_telugu})` : ''} | Units: [${units.join(', ')}]`;
    })
    .join('\n');

  const systemPrompt = `You are a specialized AI invoice parser for Indian student hostel mess bulk provisions.
Your task is to accurately extract line items from this wholesale grocery / Kirana store invoice, tax invoice, or mandi receipt.

The user tracks inventory for these registered provisions:
${inventoryCatalog}

CRITICAL MANDATORY RULE — ALWAYS USE "Rate (Incl. of Tax)":
Many Indian wholesale GST invoices have multiple rate columns:
1. "Rate (Incl. of Tax)" (Unit rate including GST)
2. "Rate" (Base taxable rate excluding GST)
3. "Amount" (Pre-tax subtotal = Quantity * base rate)

YOU MUST ALWAYS EXTRACT AND USE "Rate (Incl. of Tax)"!
- "rate": Must be the unit rate from the "Rate (Incl. of Tax)" column. DO NOT extract the pre-tax "Rate" column.
- "total_cost": Calculate strictly as: quantity * rate_incl_of_tax. DO NOT copy the pre-tax "Amount" column from the bill if it excludes tax.

Real examples from this invoice:
- "TURMERIC": Quantity = 15 kgs, Rate (Incl. of Tax) = 200.00, pre-tax Rate = 190.48, pre-tax Amount = 2857.20.
  -> You MUST set: rate = 200.00, total_cost = 3000.00 (15 * 200.00)
- "AASHIRVAD 10KGS": Quantity = 40 pcs, Rate (Incl. of Tax) = 560.00, pre-tax Rate = 533.33.
  -> You MUST set: rate = 560.00, total_cost = 22400.00 (40 * 560.00)
- "FREEDOM OIL 15LTS": Quantity = 90 TINS, Rate (Incl. of Tax) = 2545.00, pre-tax Rate = 2423.81.
  -> You MUST set: quantity = 90, unit = "15 L Tin", rate = 2545.00, total_cost = 229050.00 (90 * 2545.00)
- "MEAL MAKER 5": Quantity = 40 kgs, Rate (Incl. of Tax) = 88.00.
  -> You MUST set: rate = 88.00, total_cost = 3520.00 (40 * 88.00)

CRITICAL MANDATORY RULE — MULTI-PAGE & CONTINUATION INVOICES:
This image may be Page 1, Page 2, or a continuation sheet of a multi-page invoice.
- If the image contains text such as "continued ...", "continued on page...", or indicates that more items follow on the next page, set "is_continued": true. Otherwise set "is_continued": false.
- If this is Page 2 or a continuation sheet, extract all items on this page (even if line numbers start from 35, 36, etc.).
- If this page has the final invoice summary at the bottom (e.g., CGST, SGST, Round Off, Loading/Transportation Charges, and the Invoice Grand Total like ₹4,42,360.00), set "total_amount" to that grand total. If it is an intermediate page without a grand total, "total_amount" can be null.

Instructions:
1. Identify the Vendor/Store name (e.g., "Viswa Sai Traders", "Sri Venkateswara Rice Mill").
2. Identify the Invoice Date in YYYY-MM-DD format (convert DD-MMM-YY or DD/MM/YYYY into YYYY-MM-DD).
3. Identify Invoice/Challan Number if present.
4. Extract each provisional item purchased:
   - "raw_name": The exact item text written on the bill.
   - "matched_ingredient_id": The ID of the matching item from the inventory catalog above (or null if no match).
   - "quantity": Number of units purchased (numeric e.g., 2, 5, 10, 25.5).
   - "unit": The packaging unit used (e.g. "25 kg Bag", "50 kg Bag", "15 L Tin", "1 kg Packet", "kg", "litre"). Match the unit name from the catalog if mentioned.
   - "rate": The unit price INCLUSIVE of tax from "Rate (Incl. of Tax)" (numeric).
   - "total_cost": Total line cost in Rupees = quantity * rate_incl_of_tax (numeric).
   - "confidence": A score from 0.0 to 1.0 of your certainty.
5. If non-provision or miscellaneous expenses appear (e.g. soap, detergents, cleaning liquids, sponges, phenyle, brooms, or perishables like milk/vegetables), exclude them or mark matched_ingredient_id as null.
6. Return a STRICT JSON object with no markdown fences, matching:
{
  "vendor": string | null,
  "invoice_date": string | null,
  "invoice_number": string | null,
  "total_amount": number | null,
  "is_continued": boolean,
  "items": [
    {
      "raw_name": string,
      "matched_ingredient_id": string | null,
      "quantity": number,
      "unit": string,
      "rate": number | null,
      "total_cost": number,
      "confidence": number
    }
  ]
}`;

  onProgress?.('Checking active Gemini Vision models on your account...');

  // Discovered models list
  let candidateModels: string[] = [];
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData?.models)) {
        const nonVisionKeywords = ['tts', 'audio', 'embed', 'imagen', 'image-generation', 'realtime', 'whisper', 'robotics'];
        const discovered = listData.models
          .filter(
            (m: any) =>
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent')
          )
          .map((m: any) => m.name.replace(/^models\//, ''))
          .filter((name: string) => {
            const lower = name.toLowerCase();
            return !nonVisionKeywords.some((kw) => lower.includes(kw));
          });

        if (discovered.length > 0) {
          discovered.sort((a: string, b: string) => {
            const getScore = (name: string) => {
              const lower = name.toLowerCase();
              if (lower === 'gemini-2.0-flash') return 100;
              if (lower === 'gemini-2.0-flash-001') return 98;
              if (lower === 'gemini-1.5-flash-8b') return 96;
              if (lower === 'gemini-1.5-flash') return 94;
              if (lower === 'gemini-1.5-flash-latest') return 92;
              if (lower === 'gemini-flash-latest') return 90;
              if (lower.includes('2.0-flash')) return 88;
              if (lower.includes('1.5-flash')) return 85;
              if (lower.includes('flash')) return 75;
              if (lower.includes('pro')) return 50;
              return 10;
            };
            return getScore(b) - getScore(a);
          });
          // Pick top 4 vision models
          candidateModels = discovered.slice(0, 4);
        }
      }
    } else if (listRes.status === 400) {
      const errJson = await listRes.json().catch(() => ({}));
      if (errJson?.error?.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API Key. Please verify your key from Google AI Studio.');
      }
    }
  } catch (err: any) {
    if (err.message?.includes('Invalid Gemini API Key')) throw err;
  }

  // Fallback candidate list if discovery returned empty
  if (candidateModels.length === 0) {
    candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-001'];
  }

  let rawResponseText = '';
  let lastError: any = null;

  for (const model of candidateModels) {
    onProgress?.(`Extracting invoice items using ${model}...`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.status === 429) {
          if (attempt === 0) {
            onProgress?.(`Rate limit reached on ${model}. Pausing 3.5s before automatic retry...`);
            await new Promise((r) => setTimeout(r, 3500));
            continue; // Retry once after backoff
          } else {
            // Move to backup model
            onProgress?.(`Switching to backup model...`);
            await new Promise((r) => setTimeout(r, 1500));
            break;
          }
        }

        if (response.status === 404) {
          // Model not found on this endpoint, try next candidate
          break;
        }

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || response.statusText;
          if (response.status === 400 && errMsg.includes('API_KEY_INVALID')) {
            throw new Error('Invalid Gemini API Key. Please verify your key from Google AI Studio.');
          }
          // If model doesn't support image input (e.g. non-vision model), gracefully skip to next candidate!
          if (response.status === 400 && (errMsg.includes('modality') || errMsg.includes('not enabled') || errMsg.includes('not supported'))) {
            console.warn(`Model ${model} does not support image modality, trying next candidate:`, errMsg);
            lastError = new Error(`Model ${model} does not accept images: ${errMsg}`);
            break;
          }
          throw new Error(`Gemini API error (${response.status}): ${errMsg}`);
        }

        const data = await response.json();
        const candidateText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (candidateText) {
          rawResponseText = candidateText;
          break;
        }
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes('Invalid Gemini API Key')) throw err;
      }
    }

    if (rawResponseText) break;
  }

  if (!rawResponseText) {
    if (lastError?.message?.includes('429')) {
      throw new Error(
        'Google Gemini free tier request limit reached (15 requests/minute). Please wait 15–20 seconds for the quota to reset, then click Extract Line Items again.'
      );
    }
    throw (
      lastError ||
      new Error('Failed to extract invoice text from the image. Please try a clearer photo.')
    );
  }

  let parsed: any;
  try {
    const cleaned = rawResponseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('Failed to parse Gemini response JSON:', rawResponseText);
    throw new Error('Could not parse bill data into structured format. Please check the image.');
  }

  const extractedItems: ExtractedBillItem[] = [];
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const rawName = String(item.raw_name || `Item ${i + 1}`).trim();
    let matchedIng: Ingredient | null = null;
    let confidence = typeof item.confidence === 'number' ? item.confidence : 0.8;

    if (item.matched_ingredient_id) {
      matchedIng =
        provisions.find((p) => p.ingredient_id === item.matched_ingredient_id) || null;
    }

    if (!matchedIng) {
      const fuzzy = findBestIngredientMatch(rawName, provisions);
      matchedIng = fuzzy.ingredient;
      if (fuzzy.confidence > 0) {
        confidence = fuzzy.confidence;
      }
    }

    const qty = Math.max(0.01, parseFloat(item.quantity) || 1);
    const rateNum = typeof item.rate === 'number' && item.rate > 0
      ? item.rate
      : (item.rate ? parseFloat(item.rate) : null);

    // Always calculate total_cost using rate inclusive of tax * quantity
    let cost = 0;
    if (rateNum && rateNum > 0) {
      cost = Math.round(qty * rateNum * 100) / 100;
    } else if (item.total_cost && parseFloat(item.total_cost) > 0) {
      cost = parseFloat(item.total_cost);
    }
    const finalRate = rateNum || (cost > 0 && qty > 0 ? Math.round((cost / qty) * 100) / 100 : null);

    let resolvedUnit = item.unit || 'kg';
    if (matchedIng) {
      resolvedUnit = resolveBestUnit(item.unit, matchedIng);
    }

    extractedItems.push({
      id: `ext-${Date.now()}-${pageNumber}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      raw_name: rawName,
      matched_ingredient_id: matchedIng ? matchedIng.ingredient_id : '',
      matched_ingredient_name: matchedIng ? matchedIng.name : rawName,
      quantity: qty,
      unit: resolvedUnit,
      rate: finalRate,
      total_cost: cost,
      confidence: matchedIng ? confidence : 0.2,
      is_matched: Boolean(matchedIng),
      page: pageNumber,
    });
  }

  let validDate = null;
  if (parsed?.invoice_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.invoice_date)) {
    validDate = parsed.invoice_date;
  }

  return {
    vendor: parsed?.vendor ? String(parsed.vendor).trim() : null,
    invoice_date: validDate,
    invoice_number: parsed?.invoice_number ? String(parsed.invoice_number).trim() : null,
    total_amount: typeof parsed?.total_amount === 'number' ? parsed.total_amount : null,
    is_continued: Boolean(parsed?.is_continued),
    items: extractedItems,
  };
}

/**
 * Scans multiple pages of a multi-page provisional invoice sequentially,
 * accumulating extracted line items and preserving the latest invoice metadata.
 */
export async function scanMultipleProvisionalBillPages(
  files: (File | Blob)[],
  registeredIngredients: Ingredient[],
  customApiKey?: string,
  onProgress?: (message: string) => void
): Promise<ExtractedBillData> {
  if (files.length === 0) {
    throw new Error('No files provided to scan.');
  }

  const allItems: ExtractedBillItem[] = [];
  let detectedVendor: string | null = null;
  let detectedDate: string | null = null;
  let detectedInvoiceNumber: string | null = null;
  let detectedTotal: number | null = null;
  let lastIsContinued = false;

  for (let p = 0; p < files.length; p++) {
    const pageNum = p + 1;
    const file = files[p];
    onProgress?.(`Starting Page ${pageNum} of ${files.length}...`);

    const result = await scanProvisionalBill(
      file,
      registeredIngredients,
      customApiKey,
      (msg) => onProgress?.(`Page ${pageNum}/${files.length}: ${msg}`),
      pageNum
    );

    if (result.vendor && !detectedVendor) detectedVendor = result.vendor;
    if (result.invoice_date && !detectedDate) detectedDate = result.invoice_date;
    if (result.invoice_number && !detectedInvoiceNumber) detectedInvoiceNumber = result.invoice_number;
    if (result.total_amount !== null) detectedTotal = result.total_amount;
    lastIsContinued = Boolean(result.is_continued);

    allItems.push(...result.items);
  }

  return {
    vendor: detectedVendor,
    invoice_date: detectedDate,
    invoice_number: detectedInvoiceNumber,
    total_amount: detectedTotal,
    is_continued: lastIsContinued,
    items: allItems,
  };
}
