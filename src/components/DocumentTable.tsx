'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';

export interface Document {
  id: string;
  original_filename?: string;
  filename?: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  vendor?: string | null;
  date?: string | null;
  doc_number?: string | null;
  document_number?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  currency?: string | null;
  category?: string | null;
  description?: string | null;
  raw_text?: string | null;
  extracted_text?: string | null;
  error_message?: string | null;
  verified_at?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface DocumentTableProps {
  documents: Document[];
  onRefresh?: () => void;
}

export default function DocumentTable({ documents, onRefresh }: DocumentTableProps) {
  const router = useRouter();

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      // Handle both date-only "YYYY-MM-DD" and full ISO timestamps
      const parsed = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
      if (isNaN(parsed.getTime())) return dateStr;
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount?: number | null, currency: string | null = 'USD') => {
    if (amount == null) return '—';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount);
    } catch {
      return `$${Number(amount).toFixed(2)}`;
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-semibold text-stone-800">
          No documents found
        </h3>
        <p className="mt-1 text-sm text-stone-500 max-w-sm mx-auto">
          No receipts or invoices match your current criteria. Upload a new document to get started.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          )}
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-stone-800 text-white hover:bg-stone-700 shadow-sm transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload Document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500 border-b border-stone-200">
            <tr>
              <th scope="col" className="px-6 py-3.5 font-semibold">Vendor</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Date</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Total</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Category</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
              <th scope="col" className="px-6 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {documents.map((doc) => {
              const displayName = doc.vendor || doc.original_filename || doc.filename || 'Untitled Document';
              const secondaryText = doc.vendor ? (doc.original_filename || doc.filename) : null;

              return (
                <tr
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-stone-900 group-hover:text-stone-700">
                      {displayName}
                    </div>
                    {secondaryText && (
                      <div className="text-xs text-stone-400 truncate max-w-xs">
                        {secondaryText}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                    {formatDate(doc.date || doc.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-stone-900">
                    {formatCurrency(doc.total, doc.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doc.category ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700">
                        {doc.category}
                      </span>
                    ) : (
                      <span className="text-stone-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/documents/${doc.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-md transition-colors"
                    >
                      View
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stack View */}
      <div className="block md:hidden divide-y divide-stone-100">
        {documents.map((doc) => {
          const displayName = doc.vendor || doc.original_filename || doc.filename || 'Untitled Document';
          const secondaryText = doc.vendor ? (doc.original_filename || doc.filename) : null;

          return (
            <div
              key={doc.id}
              onClick={() => router.push(`/documents/${doc.id}`)}
              className="p-4 hover:bg-stone-50 active:bg-stone-100 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-stone-900 truncate">
                    {displayName}
                  </h4>
                  {secondaryText && (
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {secondaryText}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-stone-900">
                    {formatCurrency(doc.total, doc.currency)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <span>{formatDate(doc.date || doc.created_at)}</span>
                  {doc.category && (
                    <>
                      <span>•</span>
                      <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded">
                        {doc.category}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={doc.status} />
                  <Link
                    href={`/documents/${doc.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 px-2 py-1 rounded"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
