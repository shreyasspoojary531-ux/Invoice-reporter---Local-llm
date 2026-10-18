"use client";

import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-900">
            Upload Documents
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Upload receipts and invoices for local AI processing. Files are
            processed on your machine — nothing leaves your computer.
          </p>
        </div>

        <UploadZone />

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
          <h3 className="text-sm font-medium text-stone-900">
            How it works
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-stone-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-700">
                1
              </span>
              <span>
                Upload a receipt image (JPG, PNG) or PDF invoice
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-700">
                2
              </span>
              <span>
                Text is extracted locally using OCR or PDF parsing
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-700">
                3
              </span>
              <span>
                A local AI model identifies vendor, amounts, dates, and
                categories
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-700">
                4
              </span>
              <span>
                Review the extracted data, make corrections, and verify
              </span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
