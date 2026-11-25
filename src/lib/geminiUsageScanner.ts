import { Ingredient, MealType } from '../types';
import { findBestIngredientMatch } from './fuzzyMatch';
import {
  getGeminiApiKey,
  optimizeImageForOcr,
  resolveBestUnit,
  callGeminiVisionJson,
  parseGeminiJsonResponse,
} from './geminiCore';

export interface ExtractedUsageItem {
  id: string;
  raw_name: string;
  matched_ingredient_id: string;
  matched_ingredient_name: string;
  quantity: number;
  unit: string;
  confidence: number;
  is_matched: boolean;
  page?: number;
}

export interface ExtractedUsageData {
  usage_date: string | null;
  meal_type: MealType | null;
  is_continued?: boolean;
  items: ExtractedUsageItem[];
}

/**
 * Scans a single page of a kitchen meal usage sheet / chit using Gemini Vision.
 */
export async function scanMealUsageSheet(
  file: File | Blob,
  registeredIngredients: Ingredient[],
  customApiKey?: string,
  onProgress?: (message: string) => void,
  pageNumber: number = 1
): Promise<ExtractedUsageData> {
  const apiKey = (customApiKey || getGeminiApiKey()).trim();

  if (!apiKey) {
    throw new Error(
      'Gemini API Key is not configured. Please enter your free Gemini API Key from Google AI Studio.'
    );
  }

  onProgress?.(`Optimizing usage sheet photo for Page ${pageNumber}...`);
  const { base64Data, mimeType } = await optimizeImageForOcr(file);

  const provisions = registeredIngredients.filter(
    (i) => i.category === 'provisions' && i.active && i.tracks_usage
  );

  const inventoryCatalog = provisions
    .map((ing) => {
      const units = [
        ing.unit,
        ...(ing.conversions?.map((c) => `${c.unit_name} (=${c.multiplier}${ing.unit})`) || []),
      ];
      return `ID: "${ing.ingredient_id}" | Name: "${ing.name}"${ing.name_telugu ? ` (${ing.name_telugu})` : ''} | Current Stock: ${ing.current_stock} ${ing.unit} | Units: [${units.join(', ')}]`;
    })
    .join('\n');

  const currentYear = new Date().getFullYear();

  const systemPrompt = `You are a specialized AI parser for Indian student hostel mess daily kitchen ingredient usage chits, registers, consumption logs, and issue slips.
Your task is to accurately extract which provisional ingredients and quantities were taken out/consumed from the store room for cooking.

CRITICAL MANDATORY RULES:
1. ONLY QUANTITIES AND DATE: Usage sheets contain ingredient names, quantities used, units, and date of usage. There are NO prices, rates, or taxes on usage sheets. Do NOT try to extract prices or costs.
2. MEAL TYPE (COMPLETELY OPTIONAL): Meal type is completely optional. Only if the sheet explicitly writes "Breakfast" / "Tiffin", "Lunch", or "Dinner" / "Night", set it to "breakfast", "lunch", or "dinner". If not explicitly mentioned, always return null.
3. MULTI-PAGE & CONTINUATION:
   - If this sheet indicates more items follow on the next page (e.g. "continued...", "PTO", or arrow), set "is_continued": true.
   - If this is Page 2 or a continuation sheet, extract all ingredients and quantities on this page.

The user tracks inventory for these registered provisions:
${inventoryCatalog}

Instructions:
1. Identify the Usage Date in YYYY-MM-DD format (convert DD/MM/YYYY, DD-MMM-YY, or DD.MM.YYYY into YYYY-MM-DD).
   - The active calendar/academic year is ${currentYear}. If the usage chit or register only specifies day and month (e.g. "03/10", "11 Oct", "12-10") or if the year is ambiguous/omitted, ALWAYS use year ${currentYear}.
   - Do NOT default to past years like 2024 or 2025 unless explicitly written.
   - If absent or unclear, return null.
2. Identify Meal Type ONLY if explicitly specified ("breakfast", "lunch", "dinner", or null). Default is null.
3. Extract each provisional ingredient used:
   - "raw_name": The exact item text written on the usage sheet (e.g., "Rice", "Sona Masoori", "Toor Dal", "Oil", "Chilli Powder", "Salt").
   - "matched_ingredient_id": The ID of the matching provision from the catalog above, or null if no match.
   - "quantity": Number of units used (numeric e.g., 2, 5, 25, 50, 1.5).
   - "unit": The packaging unit used (e.g. "25 kg Bag", "50 kg Bag", "15 L Tin", "1 kg Packet", "kg", "litre", "pcs"). Match catalog unit names where appropriate.
   - "confidence": A score from 0.0 to 1.0 of your certainty.
4. Exclude non-food utensils or cleaning items if any appear.
5. Return a STRICT JSON object with no markdown fences, matching:
{
  "usage_date": string | null,
  "meal_type": "breakfast" | "lunch" | "dinner" | null,
  "is_continued": boolean,
  "items": [
    {
      "raw_name": string,
      "matched_ingredient_id": string | null,
      "quantity": number,
      "unit": string,
      "confidence": number
    }
  ]
}`;

  const rawJsonText = await callGeminiVisionJson({
    apiKey,
    systemPrompt,
    mimeType,
    base64Data,
    actionLabel: 'Extracting meal usage items',
    onProgress,
  });

  let parsed: any;
  try {
    parsed = parseGeminiJsonResponse(rawJsonText);
  } catch {
    console.error('Failed to parse Gemini usage response as JSON:', rawJsonText);
    throw new Error('AI response was not valid JSON. Please try scanning again.');
  }

  const extractedItems: ExtractedUsageItem[] = [];
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
    let resolvedUnit = item.unit || 'kg';
    if (matchedIng) {
      resolvedUnit = resolveBestUnit(item.unit, matchedIng);
    }

    extractedItems.push({
      id: `ext-usage-${Date.now()}-${pageNumber}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      raw_name: rawName,
      matched_ingredient_id: matchedIng ? matchedIng.ingredient_id : '',
      matched_ingredient_name: matchedIng ? matchedIng.name : rawName,
      quantity: qty,
      unit: resolvedUnit,
      confidence: matchedIng ? confidence : 0.2,
      is_matched: Boolean(matchedIng),
      page: pageNumber,
    });
  }

  let validDate = null;
  if (parsed?.usage_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.usage_date)) {
    // Autocorrect if OCR mistakenly tagged 2024 for an active 2026+ mess session
    if (parsed.usage_date.startsWith('2024-') && currentYear >= 2026) {
      validDate = parsed.usage_date.replace(/^2024-/, `${currentYear}-`);
    } else {
      validDate = parsed.usage_date;
    }
  }

  let validMeal: MealType | null = null;
  if (['breakfast', 'lunch', 'dinner'].includes(String(parsed?.meal_type).toLowerCase())) {
    validMeal = String(parsed.meal_type).toLowerCase() as MealType;
  }

  return {
    usage_date: validDate,
    meal_type: validMeal,
    is_continued: Boolean(parsed?.is_continued),
    items: extractedItems,
  };
}

/**
 * Scans multiple pages of a kitchen meal usage sheet sequentially,
 * accumulating extracted line items across all pages.
 */
export async function scanMultipleMealUsagePages(
  files: (File | Blob)[],
  registeredIngredients: Ingredient[],
  customApiKey?: string,
  onProgress?: (message: string) => void
): Promise<ExtractedUsageData> {
  if (files.length === 0) {
    throw new Error('No files provided to scan.');
  }

  const allItems: ExtractedUsageItem[] = [];
  let detectedDate: string | null = null;
  let detectedMeal: MealType | null = null;
  let lastIsContinued = false;

  for (let p = 0; p < files.length; p++) {
    const pageNum = p + 1;
    const file = files[p];
    onProgress?.(`Starting Page ${pageNum} of ${files.length}...`);

    const result = await scanMealUsageSheet(
      file,
      registeredIngredients,
      customApiKey,
      (msg) => onProgress?.(`Page ${pageNum}/${files.length}: ${msg}`),
      pageNum
    );

    if (result.usage_date && !detectedDate) detectedDate = result.usage_date;
    if (result.meal_type && !detectedMeal) detectedMeal = result.meal_type;
    lastIsContinued = Boolean(result.is_continued);

    allItems.push(...result.items);
  }

  return {
    usage_date: detectedDate,
    meal_type: detectedMeal,
    is_continued: lastIsContinued,
    items: allItems,
  };
}
