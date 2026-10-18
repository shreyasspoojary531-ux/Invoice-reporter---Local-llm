import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export type DocumentFileType = 'image/jpeg' | 'image/png' | 'application/pdf';
export type DocumentStatus = 'pending' | 'processing' | 'extracted' | 'verified' | 'failed';

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_type: DocumentFileType | string;
  file_size: number;
  status: DocumentStatus | string;
  extracted_text?: string | null;
  vendor?: string | null;
  date?: string | null;
  document_number?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  currency?: string | null;
  category?: string | null;
  description?: string | null;
  error_message?: string | null;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentFilters {
  search?: string;
  category?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'papertrail.db');

declare global {
  var _papertrailDb: Database.Database | undefined;
}

function initDb(): Database.Database {
  if (process.env.NODE_ENV !== 'production' && global._papertrailDb) {
    return global._papertrailDb;
  }

  const database = new Database(DB_PATH);
  database.pragma('journal_mode = WAL');

  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('image/jpeg','image/png','application/pdf')),
      file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','extracted','verified','failed')),
      extracted_text TEXT,
      vendor TEXT,
      date TEXT,
      document_number TEXT,
      subtotal REAL,
      tax REAL,
      total REAL,
      currency TEXT DEFAULT 'USD',
      category TEXT,
      description TEXT,
      error_message TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (process.env.NODE_ENV !== 'production') {
    global._papertrailDb = database;
  }

  return database;
}

export const db: Database.Database = initDb();

const ALLOWED_SORT_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'date',
  'total',
  'subtotal',
  'tax',
  'vendor',
  'category',
  'status',
  'original_filename',
  'document_number',
  'file_size',
]);

export function getAllDocuments(filters?: DocumentFilters): Document[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.search && filters.search.trim().length > 0) {
    const searchPattern = `%${filters.search.trim()}%`;
    conditions.push(
      '(vendor LIKE ? OR original_filename LIKE ? OR document_number LIKE ? OR description LIKE ?)'
    );
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (filters?.category && filters.category.trim().length > 0) {
    conditions.push('category = ?');
    params.push(filters.category.trim());
  }

  if (filters?.status && filters.status.trim().length > 0) {
    conditions.push('status = ?');
    params.push(filters.status.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn =
    filters?.sortBy && ALLOWED_SORT_COLUMNS.has(filters.sortBy)
      ? filters.sortBy
      : 'created_at';

  const sortDirection =
    filters?.sortOrder && filters.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const sql = `SELECT * FROM documents ${whereClause} ORDER BY ${sortColumn} ${sortDirection}`;
  const stmt = db.prepare(sql);
  return stmt.all(...params) as Document[];
}

export function getDocumentById(id: string): Document | undefined {
  const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
  return (stmt.get(id) as Document) || undefined;
}

export type CreateDocumentData = {
  id: string;
  filename: string;
  original_filename: string;
  file_type: DocumentFileType | string;
  file_size: number;
  status?: DocumentStatus | string;
  extracted_text?: string | null | { text: string };
  vendor?: string | null;
  date?: string | null;
  document_number?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  currency?: string | null;
  category?: string | null;
  description?: string | null;
  error_message?: string | null;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function createDocument(doc: CreateDocumentData): Document {
  const stmt = db.prepare(`
    INSERT INTO documents (
      id, filename, original_filename, file_type, file_size, status,
      extracted_text, vendor, date, document_number, subtotal, tax,
      total, currency, category, description, error_message, verified_at
    ) VALUES (
      @id, @filename, @original_filename, @file_type, @file_size, @status,
      @extracted_text, @vendor, @date, @document_number, @subtotal, @tax,
      @total, @currency, @category, @description, @error_message, @verified_at
    )
  `);

  let extractedTextValue: string | null = null;
  if (doc.extracted_text) {
    extractedTextValue =
      typeof doc.extracted_text === 'object' && 'text' in doc.extracted_text
        ? doc.extracted_text.text
        : String(doc.extracted_text);
  }

  stmt.run({
    id: doc.id,
    filename: doc.filename,
    original_filename: doc.original_filename,
    file_type: doc.file_type,
    file_size: doc.file_size,
    status: doc.status || 'pending',
    extracted_text: extractedTextValue,
    vendor: doc.vendor ?? null,
    date: doc.date ?? null,
    document_number: doc.document_number ?? null,
    subtotal: doc.subtotal ?? null,
    tax: doc.tax ?? null,
    total: doc.total ?? null,
    currency: doc.currency ?? 'USD',
    category: doc.category ?? null,
    description: doc.description ?? null,
    error_message: doc.error_message ?? null,
    verified_at: doc.verified_at ?? null,
  });

  return getDocumentById(doc.id)!;
}

const UPDATEABLE_FIELDS: (keyof Document)[] = [
  'filename',
  'original_filename',
  'file_type',
  'file_size',
  'status',
  'extracted_text',
  'vendor',
  'date',
  'document_number',
  'subtotal',
  'tax',
  'total',
  'currency',
  'category',
  'description',
  'error_message',
  'verified_at',
  'updated_at',
];

export function updateDocument(id: string, updates: Partial<Document>): Document | undefined {
  const existing = getDocumentById(id);
  if (!existing) {
    return undefined;
  }

  const setClauses: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const field of UPDATEABLE_FIELDS) {
    if (field in updates) {
      setClauses.push(`${field} = @${field}`);
      let val = updates[field];
      if (field === 'extracted_text' && val && typeof val === 'object' && 'text' in val) {
        val = (val as { text: string }).text;
      }
      params[field] = val ?? null;
    }
  }

  if (!('updated_at' in updates)) {
    setClauses.push("updated_at = datetime('now')");
  }

  if (setClauses.length > 0) {
    const sql = `UPDATE documents SET ${setClauses.join(', ')} WHERE id = @id`;
    db.prepare(sql).run(params);
  }

  return getDocumentById(id);
}

export function deleteDocument(id: string): boolean {
  const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getStats(): {
  total: number;
  verified: number;
  pending_review: number;
  total_verified_amount: number;
} {
  const row = db
    .prepare(
      `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified,
      SUM(CASE WHEN status = 'extracted' THEN 1 ELSE 0 END) AS pending_review,
      SUM(CASE WHEN status = 'verified' AND total IS NOT NULL THEN total ELSE 0 END) AS total_verified_amount
    FROM documents
  `
    )
    .get() as {
    total: number;
    verified: number;
    pending_review: number;
    total_verified_amount: number | null;
  } | undefined;

  return {
    total: Number(row?.total ?? 0),
    verified: Number(row?.verified ?? 0),
    pending_review: Number(row?.pending_review ?? 0),
    total_verified_amount: Number(row?.total_verified_amount ?? 0),
  };
}

export function getRecentDocuments(limit = 5): Document[] {
  const stmt = db.prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit) as Document[];
}
