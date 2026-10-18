"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ReviewForm from "@/components/ReviewForm";
import StatusBadge from "@/components/StatusBadge";

interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: string;
  extracted_text: string | null;
  vendor: string | null;
  date: string | null;
  document_number: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  category: string | null;
  description: string | null;
  error_message: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.status === 404) {
        setError("Document not found");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch document");
      const data = await res.json();
      setDocument(data);
    } catch {
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Auto-refresh while processing
  useEffect(() => {
    if (document?.status !== "processing") return;
    const interval = setInterval(fetchDocument, 3000);
    return () => clearInterval(interval);
  }, [document?.status, fetchDocument]);

  const handleSave = async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      const updated = await res.json();
      setDocument(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone."))
      return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/documents");
    } catch {
      alert("Failed to delete document");
    }
  };

  const handleRetry = async () => {
    try {
      const res = await fetch(`/api/documents/${id}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to retry");
      }
      const updated = await res.json();
      setDocument(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to retry extraction");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="h-8 w-1/3 animate-pulse rounded bg-stone-200" />
            <div className="h-96 animate-pulse rounded-lg border border-stone-200 bg-white" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-red-800">
              {error || "Document not found"}
            </p>
            <Link
              href="/documents"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              ← Back to Records
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
          <Link href="/documents" className="hover:text-stone-800">
            Records
          </Link>
          <span>→</span>
          <span className="text-stone-800">
            {document.vendor || document.original_filename}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-stone-900">
                {document.vendor || document.original_filename}
              </h1>
              <StatusBadge status={document.status} />
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {document.original_filename} ·{" "}
              {(document.file_size / 1024).toFixed(1)} KB ·{" "}
              Uploaded{" "}
              {new Date(document.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Processing state */}
        {document.status === "processing" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <svg
              className="h-5 w-5 animate-spin text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm font-medium text-blue-800">
              Processing document... Extracting text and analyzing with local
              AI.
            </p>
          </div>
        )}

        {/* Review Form */}
        <ReviewForm
          document={document}
          onSave={handleSave}
          onDelete={handleDelete}
          onRetry={handleRetry}
          saving={saving}
        />
      </main>
    </div>
  );
}
