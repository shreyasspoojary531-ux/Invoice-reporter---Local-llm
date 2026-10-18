'use client';

import { useState, useId, useTransition, FormEvent } from 'react';
import type { Document } from './DocumentTable';

export const DOCUMENT_CATEGORIES = [
  'Meals & Entertainment',
  'Travel & Transportation',
  'Office Supplies',
  'Software & Subscriptions',
  'Utilities',
  'Professional Services',
  'Advertising & Marketing',
  'Healthcare',
  'Lodging',
  'Other',
];

export const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

export interface ReviewFormProps {
  document: Document;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
  onRetry?: () => Promise<void>;
  saving?: boolean;
}

function toDateInputValue(val?: string | null): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return '';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

export default function ReviewForm({
  document: doc,
  onSave,
  onDelete,
  onRetry,
  saving = false,
}: ReviewFormProps) {
  const [vendor, setVendor] = useState(doc.vendor || '');
  const [date, setDate] = useState(toDateInputValue(doc.date));
  const [docNumber, setDocNumber] = useState(
    doc.document_number || doc.doc_number || ''
  );
  const [subtotal, setSubtotal] = useState(
    doc.subtotal != null ? String(doc.subtotal) : ''
  );
  const [tax, setTax] = useState(doc.tax != null ? String(doc.tax) : '');
  const [total, setTotal] = useState(doc.total != null ? String(doc.total) : '');
  const [currency, setCurrency] = useState(doc.currency || 'USD');
  const [category, setCategory] = useState(doc.category || '');
  const [description, setDescription] = useState(doc.description || '');

  const [showRawText, setShowRawText] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedRawText, setCopiedRawText] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const isBusy = saving || isPending;

  const rawTextId = useId();

  // Dirty detection
  const isDirty =
    vendor !== (doc.vendor || '') ||
    date !== toDateInputValue(doc.date) ||
    docNumber !== (doc.document_number || doc.doc_number || '') ||
    subtotal !== (doc.subtotal != null ? String(doc.subtotal) : '') ||
    tax !== (doc.tax != null ? String(doc.tax) : '') ||
    total !== (doc.total != null ? String(doc.total) : '') ||
    currency !== (doc.currency || 'USD') ||
    category !== (doc.category || '') ||
    description !== (doc.description || '');

  const buildPayload = (overrideStatus?: string): Record<string, unknown> => {
    return {
      vendor: vendor.trim() || null,
      date: date.trim() || null,
      document_number: docNumber.trim() || null,
      doc_number: docNumber.trim() || null,
      subtotal: subtotal !== '' ? parseFloat(subtotal) : null,
      tax: tax !== '' ? parseFloat(tax) : null,
      total: total !== '' ? parseFloat(total) : null,
      currency: currency.trim() || 'USD',
      category: category.trim() || null,
      description: description.trim() || null,
      ...(overrideStatus ? { status: overrideStatus } : {}),
    };
  };

  const handleSave = (targetStatus?: string) => {
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    startTransition(async () => {
      try {
        const payload = buildPayload(targetStatus);
        await onSave(payload);
        setSaveSuccessMsg(
          targetStatus === 'verified'
            ? 'Document successfully verified!'
            : 'Changes saved successfully.'
        );
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save changes');
      }
    });
  };

  const handleDelete = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await onDelete();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to delete document');
      }
    });
  };

  const handleRetry = () => {
    if (!onRetry) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await onRetry();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to retry extraction');
      }
    });
  };

  const rawTextContent = doc.extracted_text || doc.raw_text || '';

  const handleCopyRaw = async () => {
    if (!rawTextContent) return;
    try {
      await navigator.clipboard.writeText(rawTextContent);
      setCopiedRawText(true);
      setTimeout(() => setCopiedRawText(false), 2000);
    } catch {}
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSave(doc.status === 'extracted' ? 'verified' : doc.status);
  };

  const currentStatus = doc.status?.toLowerCase();

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Verified Banner */}
      {currentStatus === 'verified' && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Verified Document</p>
              <p className="text-xs text-emerald-700">This receipt has been reviewed and verified.</p>
            </div>
          </div>
        </div>
      )}

      {/* Failed Extraction Banner */}
      {currentStatus === 'failed' && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Extraction Failed</p>
              <p className="text-xs text-red-700">
                {doc.error_message ||
                  'AI extraction could not process this document. You can retry extraction or enter details manually.'}
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {isBusy ? 'Retrying...' : 'Retry Extraction'}
            </button>
          )}
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Document Details
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Review and update the extracted values below.
            </p>
          </div>
          {isDirty && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Vendor */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Vendor / Merchant
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900"
            />
          </div>

          {/* Document / Invoice Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Document / Invoice #
            </label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="e.g. INV-2024-001"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900 bg-white"
            >
              <option value="">Select a category</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900 bg-white"
            >
              {COMMON_CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </div>

          {/* Subtotal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Subtotal
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900"
              />
            </div>
          </div>

          {/* Tax */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Tax
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900"
              />
            </div>
          </div>

          {/* Total */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Total Amount
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm font-semibold">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-base font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900"
              />
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes, itemized breakdown, or purpose..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 transition-all text-stone-900"
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          {/* Status specific primary actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {currentStatus === 'extracted' && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSave('verified')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {isBusy ? 'Saving...' : 'Verify & Save'}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSave('extracted')}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
                >
                  Save Draft
                </button>
              </>
            )}

            {currentStatus === 'verified' && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSave('verified')}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {isBusy ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSave('extracted')}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  Unverify
                </button>
              </>
            )}

            {currentStatus === 'failed' && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSave('extracted')}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {isBusy ? 'Saving...' : 'Save Manually'}
                </button>
              </>
            )}

            {currentStatus !== 'extracted' &&
              currentStatus !== 'verified' &&
              currentStatus !== 'failed' && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSave()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {isBusy ? 'Saving...' : 'Save Changes'}
                </button>
              )}
          </div>

          {/* Delete action with safety confirmation */}
          <div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isBusy}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 disabled:opacity-50 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-lg border border-red-200">
                <span className="text-xs font-semibold text-red-800 px-2">
                  Are you sure?
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleDelete}
                  className="px-3 py-1 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Extracted Raw Text (Collapsible) */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRawText((prev) => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 bg-stone-50/70 hover:bg-stone-50 text-left transition-colors"
          aria-expanded={showRawText}
          aria-controls={rawTextId}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform ${
                showRawText ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-sm font-semibold text-stone-900">
              Raw Extracted Text
            </span>
            <span className="text-xs text-stone-400">
              ({rawTextContent ? `${rawTextContent.length} chars` : 'Empty'})
            </span>
          </div>
          <span className="text-xs text-stone-500">
            {showRawText ? 'Hide' : 'Show Original OCR'}
          </span>
        </button>

        {showRawText && (
          <div id={rawTextId} className="p-6 border-t border-stone-100 bg-stone-900 text-stone-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
              <span className="text-xs text-stone-400">
                Monospace read-only view of parsed OCR text
              </span>
              <button
                type="button"
                onClick={handleCopyRaw}
                className="text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded transition-colors"
              >
                {copiedRawText ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <pre className="font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap break-words select-text">
              {rawTextContent || 'No text extracted from this document.'}
            </pre>
          </div>
        )}
      </div>

      {/* Metadata Section */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-900 mb-4 border-b border-stone-100 pb-2">
          File Metadata
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <dt className="text-stone-400 font-medium">Filename</dt>
            <dd className="mt-1 font-semibold text-stone-800 truncate" title={doc.original_filename || doc.filename || '—'}>
              {doc.original_filename || doc.filename || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400 font-medium">File Type</dt>
            <dd className="mt-1 font-semibold text-stone-800">
              {doc.file_type || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400 font-medium">File Size</dt>
            <dd className="mt-1 font-semibold text-stone-800">
              {formatFileSize(doc.file_size)}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400 font-medium">Uploaded At</dt>
            <dd className="mt-1 font-semibold text-stone-800">
              {formatDateTime(doc.created_at)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
