'use client';

import { useState, useEffect, useRef } from 'react';
import { DOCUMENT_CATEGORIES } from './ReviewForm';

export interface Filters {
  search: string;
  category: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc' | string;
}

interface SearchFilterProps {
  onFilterChange: (filters: Filters) => void;
  initialFilters?: Partial<Filters>;
}

export default function SearchFilter({
  onFilterChange,
  initialFilters,
}: SearchFilterProps) {
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [category, setCategory] = useState(initialFilters?.category || '');
  const [status, setStatus] = useState(initialFilters?.status || '');
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || 'date');
  const [sortOrder, setSortOrder] = useState<string>(
    initialFilters?.sortOrder || 'desc'
  );

  // Keep callback in ref so debounce effect doesn't re-trigger unnecessarily
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  // Track if this is the initial mount to prevent emitting default filters on mount
  const isFirstMount = useRef(true);

  // Handle debounced search updates
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onFilterChangeRef.current({
        search,
        category,
        status,
        sortBy,
        sortOrder,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, category, status, sortBy, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleReset = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setSortBy('date');
    setSortOrder('desc');
  };

  const hasActiveFilters =
    search !== '' ||
    category !== '' ||
    status !== '' ||
    sortBy !== 'date' ||
    sortOrder !== 'desc';

  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 space-y-3">
      {/* Search Input Bar & Quick Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
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
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vendor..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800 text-stone-900 placeholder-stone-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="self-end sm:self-center px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Filter Controls Row (Category, Status, Sort By, Sort Order) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
        {/* Category Dropdown */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800"
          >
            <option value="">All Categories</option>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="extracted">Needs Review</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-stone-800"
          >
            <option value="date">Date</option>
            <option value="total">Amount</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>

        {/* Sort Order Toggle */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
            Order
          </label>
          <button
            type="button"
            onClick={toggleSortOrder}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <span className="capitalize">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            {sortOrder === 'asc' ? (
              <svg className="w-3.5 h-3.5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
