'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SelectedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  error?: string;
  status: 'selected' | 'uploading' | 'done' | 'error';
  documentId?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

export default function UploadZone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [fileItems, setFileItems] = useState<SelectedFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const validateFile = (file: File): string | null => {
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );
    const hasValidType = ALLOWED_TYPES.includes(file.type.toLowerCase());

    if (!hasValidType && !hasValidExt) {
      return 'Unsupported format. Allowed: JPG, PNG, PDF.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds 10MB limit (${formatFileSize(file.size)}).`;
    }

    return null;
  };

  const handleFiles = (incomingFiles: FileList | File[]) => {
    const newItems: SelectedFileItem[] = [];

    Array.from(incomingFiles).forEach((file) => {
      const error = validateFile(file);
      const item: SelectedFileItem = {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        status: error ? 'error' : 'selected',
        error: error || undefined,
      };
      newItems.push(item);
    });

    setFileItems((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    if (isUploading) return;
    setFileItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClear = () => {
    if (isUploading) return;
    setFileItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validSelectedFiles = fileItems.filter(
    (item) => item.status === 'selected' && !item.error
  );

  const handleUploadAll = async () => {
    if (validSelectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    let successCount = 0;

    for (const item of validSelectedFiles) {
      setFileItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);

        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || `Upload failed (${res.status})`);
        }

        const docId = data?.id || data?.document?.id || data?.documentId;
        successCount++;

        setFileItems((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'done', documentId: docId } : f
          )
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setFileItems((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'error', error: message } : f
          )
        );
      }
    }

    setIsUploading(false);

    // If at least one document succeeded, show confirmed toast and navigate to dashboard
    if (successCount > 0) {
      const docWord = successCount === 1 ? 'document' : 'documents';
      const toastMessage = `${successCount} ${docWord} uploaded successfully!`;
      setSuccessToast(toastMessage);

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-lg animate-bounce">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">{successToast}</p>
            <p className="text-xs text-emerald-700">Redirecting to Dashboard...</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all ${
          isUploading
            ? 'opacity-60 cursor-not-allowed border-stone-300 bg-stone-50'
            : isDragging
            ? 'border-stone-800 bg-stone-100 scale-[0.99] cursor-pointer'
            : 'border-stone-300 bg-stone-50/60 hover:bg-stone-50 hover:border-stone-400 cursor-pointer'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-700 mb-4 shadow-sm">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.75"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p className="text-base font-semibold text-stone-800">
          Drop receipts here or click to browse
        </p>
        <p className="mt-1 text-xs text-stone-500">
          JPG, PNG, PDF up to 10MB
        </p>

        <button
          type="button"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 shadow-sm transition-colors disabled:opacity-50"
        >
          Select Files
        </button>
      </div>

      {/* Selected Files List and Upload Action */}
      {fileItems.length > 0 && (
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 bg-stone-50/50">
            <h3 className="text-sm font-semibold text-stone-800">
              Selected Documents ({fileItems.length})
            </h3>
            {!isUploading && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="divide-y divide-stone-100">
            {fileItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                    {item.name.toLowerCase().endsWith('.pdf') ? (
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.75"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.75"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatFileSize(item.size)}
                    </p>
                    {item.error && (
                      <p className="text-xs text-red-600 mt-0.5">
                        {item.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'selected' && !isUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      className="text-stone-400 hover:text-stone-600 p-1"
                      title="Remove file"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}

                  {item.status === 'uploading' && (
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                      <svg
                        className="animate-spin h-4 w-4"
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
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Uploading...
                    </div>
                  )}

                  {item.status === 'done' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <svg
                        className="w-4 h-4 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      Uploaded
                    </span>
                  )}

                  {item.status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                      </svg>
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4">
            <span className="text-xs text-stone-500">
              {validSelectedFiles.length === 0
                ? 'No valid documents selected'
                : `${validSelectedFiles.length} valid document${
                    validSelectedFiles.length === 1 ? '' : 's'
                  } ready to process`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isUploading || validSelectedFiles.length === 0}
                onClick={handleUploadAll}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin text-white"
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
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Uploading Documents...
                  </>
                ) : (
                  <>
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
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    Upload Documents
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
