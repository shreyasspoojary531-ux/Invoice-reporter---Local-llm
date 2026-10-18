import { generateCompletion } from '@/lib/ollama';

export interface ExtractedFields {
  vendor: string | null;
  date: string | null;
  document_number: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  category: string | null;
  description: string | null;
}

export const VALID_CATEGORIES = [
  'Office Supplies',
  'Travel',
  'Meals & Entertainment',
  'Utilities',
  'Software & Subscriptions',
  'Professional Services',
  'Equipment',
  'Marketing',
  'Shipping',
  'Other',
] as const;

export type ValidCategory = (typeof VALID_CATEGORIES)[number];

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();

  // Handle markdown code blocks
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  return cleaned;
}

function normalizeDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dateObj = new Date(parsed);
    const year = dateObj.getUTCFullYear();
    if (year >= 1970 && year <= 2100) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  return trimmed.slice(0, 50);
}

function normalizeNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return !isNaN(raw) && raw >= 0 ? Math.round(raw * 100) / 100 : null;
  }
  if (typeof raw === 'string') {
    const sanitized = raw.replace(/[$€£¥,]/g, '').trim();
    const num = parseFloat(sanitized);
    return !isNaN(num) && num >= 0 ? Math.round(num * 100) / 100 : null;
  }
  return null;
}

function normalizeCurrency(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'USD';
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return 'USD';

  if (trimmed === '$' || trimmed === 'USD') return 'USD';
  if (trimmed === '€' || trimmed === 'EUR') return 'EUR';
  if (trimmed === '£' || trimmed === 'GBP') return 'GBP';
  if (trimmed === '¥' || trimmed === 'JPY') return 'JPY';
  if (trimmed === 'CAD' || trimmed === 'C$') return 'CAD';
  if (trimmed === 'AUD' || trimmed === 'A$') return 'AUD';

  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }

  return 'USD';
}

function normalizeCategory(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return 'Other';
  const cleaned = raw.trim().toLowerCase();

  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === cleaned) {
      return cat;
    }
  }

  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase().includes(cleaned) || cleaned.includes(cat.toLowerCase())) {
      return cat;
    }
  }

  return 'Other';
}

function normalizeString(raw: unknown, maxLength?: number): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export async function extractDocumentFields(
  input: string | { text: string }
): Promise<ExtractedFields> {
  const text = typeof input === 'string' ? input : (input?.text ?? '');

  if (!text || text.trim().length === 0) {
    return {
      vendor: null,
      date: null,
      document_number: null,
      subtotal: null,
      tax: null,
      total: null,
      currency: 'USD',
      category: 'Other',
      description: null,
    };
  }

  const categoryList = VALID_CATEGORIES.map((c) => `"${c}"`).join(', ');

  const prompt = `You are a specialized financial document parser extracting structured data from receipts and invoices, including imperfect, noisy, or scanned OCR text.
Analyze the document text and return a SINGLE valid JSON object with EXACTLY these fields:

- "vendor": string or null (The store, business, merchant, or service provider name. Often located near the top or header of receipts. Recognize stylized names, abbreviations, or minor OCR letter substitutions, e.g. "T4RGET" -> "Target", "W4L-M4RT" -> "Walmart", "STARBUCKS #123" -> "Starbucks")
- "date": string or null (Transaction or invoice date, normalized to YYYY-MM-DD format whenever possible)
- "document_number": string or null (Invoice #, receipt #, transaction/order ID, check #, or reference number, e.g. "INV-102", "Chk 4910", "TRN 8821")
- "subtotal": number or null (Subtotal before tax. Look for labels like "SUBTOTAL", "SUB-TTL", "NET", "SUB TTL")
- "tax": number or null (Tax or VAT amount. Look for labels like "TAX", "SALES TAX", "VAT", "ST TAX")
- "total": number or null (Final total amount charged or paid. Look for labels like "TOTAL", "TOTAL DUE", "BAL DUE", "AMOUNT PAID", "GRAND TOTAL", "TTL", "BALANCE". On receipts, this is usually the main charge amount)
- "currency": string or null (3-letter currency code, e.g. USD, EUR, GBP, CAD. Default to "USD" if '$' or unstated)
- "category": string (Must be EXACTLY one of: ${categoryList})
- "description": string or null (Brief 1-sentence description of items or service, e.g. "Office supplies purchase", "Dining at Starbucks")

ROBUSTNESS & ACCURACY GUIDELINES:
1. Imperfect Text: OCR scans often contain noisy characters, broken lines, or abbreviations (e.g. "TTL" for Total, "SUB-TTL" for Subtotal, "BAL DUE" for Balance Due). Parse these accurately according to their financial context.
2. Numeric Values: Convert amounts to clean numeric floats (e.g. 19.99). If an OCR typo uses a comma instead of a period (e.g. 19,99) or reads 'O'/'o' instead of '0', parse the intended numeric value.
3. Strict Truthfulness: Extract only information genuinely evidenced by the document text. If a field is not present or cannot be determined with reasonable certainty, output null. NEVER invent or hallucinate synthetic prices, dates, or vendors.
4. Output Format: Return strictly the JSON object. Do not include markdown preamble, explanations, or commentary.

--- BEGIN DOCUMENT TEXT ---
${text}
--- END DOCUMENT TEXT ---`;

  const timeoutMs = process.env.OLLAMA_TIMEOUT ? Number(process.env.OLLAMA_TIMEOUT) : 120000;
  const rawResponse = await generateCompletion(prompt, {
    timeout: timeoutMs,
    format: 'json',
  });

  const cleaned = cleanJsonString(rawResponse);
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI extraction output as JSON. Raw model response was: "${rawResponse}"`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI extraction returned invalid JSON: root must be an object.');
  }

  return {
    vendor: normalizeString(parsed.vendor, 150),
    date: normalizeDate(parsed.date),
    document_number: normalizeString(parsed.document_number, 100),
    subtotal: normalizeNumber(parsed.subtotal),
    tax: normalizeNumber(parsed.tax),
    total: normalizeNumber(parsed.total),
    currency: normalizeCurrency(parsed.currency),
    category: normalizeCategory(parsed.category),
    description: normalizeString(parsed.description, 200),
  };
}
