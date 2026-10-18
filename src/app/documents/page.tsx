"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";

interface Document {
  id: string;
  original_filename: string;
  vendor: string | null;
  date: string | null;
  total: number | null;
  currency: string | null;
  category: string | null;
  status: string;
  created_at: string;
}

interface Filters {
  search: string;
  category: string;
  status: string;
  sortBy: string;
  sortOrder: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "",
    status: "",
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const [exporting, setExporting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.status) params.set("status", filters.status);
      params.set("sortBy", filters.sortBy);
      params.set("sortOrder", filters.sortOrder);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-refresh for processing documents
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      params.set("verified_only", "true");

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `papertrail-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export CSV. Make sure you have verified documents.");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | null, currency?: string | null) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Records</h1>
            <p className="mt-1 text-sm text-stone-500">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Upload
            </Link>
          </div>
        </div>

        <SearchFilter onFilterChange={setFilters} initialFilters={filters} />

        <div className="mt-6 rounded-lg border border-stone-200 bg-white shadow-sm">
          {loading ? (
            <div className="divide-y divide-stone-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-4 w-1/4 animate-pulse rounded bg-stone-100" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-stone-100" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-stone-100" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-stone-100" />
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-stone-600">
                No documents found
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {filters.search || filters.category || filters.status
                  ? "Try adjusting your filters."
                  : "Upload your first document to get started."}
              </p>
              {!filters.search && !filters.category && !filters.status && (
                <Link
                  href="/upload"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
                >
                  Upload Document
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                      <th className="px-6 py-3">Vendor</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Total</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="transition-colors hover:bg-stone-50"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-stone-900">
                            {doc.vendor || "Unknown vendor"}
                          </div>
                          <div className="text-xs text-stone-400">
                            {doc.original_filename}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(doc.date)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-stone-900">
                          {formatCurrency(doc.total, doc.currency)}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {doc.category || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="text-sm font-medium text-stone-600 hover:text-stone-900"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="divide-y divide-stone-100 sm:hidden">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="block px-4 py-4 transition-colors hover:bg-stone-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900">
                          {doc.vendor || doc.original_filename}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {formatDate(doc.date)}
                          {doc.category && ` · ${doc.category}`}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-medium text-stone-900">
                          {formatCurrency(doc.total, doc.currency)}
                        </p>
                        <div className="mt-1">
                          <StatusBadge status={doc.status} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
