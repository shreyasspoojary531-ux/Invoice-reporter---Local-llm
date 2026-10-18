import { ExtractedFields, VALID_CATEGORIES } from '@/lib/ai-extract';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_STATUSES = new Set(['pending', 'processing', 'extracted', 'verified', 'failed']);

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(/\0/g, '').trim();
}

export function validateUpload(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // Check file type
  let type = file.type?.toLowerCase();

  // If MIME type is missing or generic, check extension
  if (!type || type === 'application/octet-stream') {
    const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
    if (ext === 'jpg' || ext === 'jpeg') {
      type = 'image/jpeg';
    } else if (ext === 'png') {
      type = 'image/png';
    } else if (ext === 'pdf') {
      type = 'application/pdf';
    }
  }

  if (!ALLOWED_MIME_TYPES.has(type)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type || 'unknown'}". Only JPEG, PNG, and PDF files are supported.`,
    };
  }

  // Check file size
  if (file.size <= 0) {
    return {
      valid: false,
      error: 'File is empty.',
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMb}MB) exceeds the maximum allowed limit of 10MB.`,
    };
  }

  return { valid: true };
}

export interface ValidatedUpdateResult {
  valid: boolean;
  fields?: Partial<ExtractedFields & { status: string; verified_at?: string | null; error_message?: string | null }>;
  error?: string;
}

export function validateDocumentUpdate(data: unknown): ValidatedUpdateResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'Update payload must be a non-null object.' };
  }

  const raw = data as Record<string, unknown>;
  const fields: Partial<ExtractedFields & { status: string; verified_at?: string | null; error_message?: string | null }> = {};

  if ('status' in raw) {
    if (raw.status === null || raw.status === undefined) {
      return { valid: false, error: 'Status cannot be null.' };
    }
    const statusStr = String(raw.status).toLowerCase();
    if (!ALLOWED_STATUSES.has(statusStr)) {
      return {
        valid: false,
        error: `Invalid status "${raw.status}". Must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}.`,
      };
    }
    fields.status = statusStr;
  }

  if ('vendor' in raw) {
    fields.vendor = raw.vendor ? sanitizeString(String(raw.vendor)) : null;
  }

  if ('date' in raw) {
    if (raw.date === null || raw.date === undefined || raw.date === '') {
      fields.date = null;
    } else {
      const sanitizedDate = sanitizeString(String(raw.date));
      fields.date = sanitizedDate || null;
    }
  }

  if ('document_number' in raw) {
    fields.document_number = raw.document_number
      ? sanitizeString(String(raw.document_number))
      : null;
  }

  const numberFields: ('subtotal' | 'tax' | 'total')[] = ['subtotal', 'tax', 'total'];
  for (const field of numberFields) {
    if (field in raw) {
      const val = raw[field];
      if (val === null || val === undefined || val === '') {
        fields[field] = null;
      } else {
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$€£¥,]/g, '').trim());
        if (isNaN(num)) {
          return { valid: false, error: `Invalid number value for "${field}": ${val}` };
        }
        if (num < 0) {
          return { valid: false, error: `Field "${field}" cannot be negative.` };
        }
        fields[field] = Math.round(num * 100) / 100;
      }
    }
  }

  if ('currency' in raw) {
    if (raw.currency === null || raw.currency === undefined || raw.currency === '') {
      fields.currency = null;
    } else {
      const curr = sanitizeString(String(raw.currency)).toUpperCase();
      fields.currency = curr || null;
    }
  }

  if ('category' in raw) {
    if (raw.category === null || raw.category === undefined || raw.category === '') {
      fields.category = null;
    } else {
      const cat = sanitizeString(String(raw.category));
      // Normalize category case if it matches one of valid categories
      const matched = VALID_CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase());
      fields.category = matched || cat;
    }
  }

  if ('description' in raw) {
    fields.description = raw.description
      ? sanitizeString(String(raw.description)).slice(0, 500)
      : null;
  }

  if ('verified_at' in raw) {
    fields.verified_at = raw.verified_at ? sanitizeString(String(raw.verified_at)) : null;
  }

  if ('error_message' in raw) {
    fields.error_message = raw.error_message
      ? sanitizeString(String(raw.error_message))
      : null;
  }

  return { valid: true, fields };
}
