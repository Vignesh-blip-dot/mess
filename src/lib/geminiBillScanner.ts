import { Ingredient } from '../types';
import { findBestIngredientMatch } from './fuzzyMatch';
import {
  SUSPENDED_KEY_PREFIXES,
  isSuspendedKey,
  getDefaultGeminiApiKey,
  getGeminiApiKey,
  setGeminiApiKey,
  fileToBase64,
  optimizeImageForOcr,
  resolveBestUnit,
  callGeminiVisionJson,
  parseGeminiJsonResponse,
} from './geminiCore';

export {
  SUSPENDED_KEY_PREFIXES,
  isSuspendedKey,
  getDefaultGeminiApiKey,
  getGeminiApiKey,
  setGeminiApiKey,
  fileToBase64,
  optimizeImageForOcr,
};

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

  const rawResponseText = await callGeminiVisionJson({
    apiKey,
    systemPrompt,
    mimeType,
    base64Data,
    actionLabel: 'Extracting invoice items',
    onProgress,
  });

  let parsed: any;
  try {
    parsed = parseGeminiJsonResponse(rawResponseText);
  } catch {
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
    const rateNum =
      typeof item.rate === 'number' && item.rate > 0
        ? item.rate
        : item.rate
        ? parseFloat(item.rate)
        : null;

    // Always calculate total_cost using rate inclusive of tax * quantity
    let cost = 0;
    if (rateNum && rateNum > 0) {
      cost = Math.round(qty * rateNum * 100) / 100;
    } else if (item.total_cost && parseFloat(item.total_cost) > 0) {
      cost = parseFloat(item.total_cost);
    }
    const finalRate =
      rateNum || (cost > 0 && qty > 0 ? Math.round((cost / qty) * 100) / 100 : null);

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
