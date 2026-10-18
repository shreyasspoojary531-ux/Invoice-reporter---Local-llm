'use client';

interface StatsCardsProps {
  stats: {
    total: number;
    verified: number;
    pending_review: number;
    total_verified_amount: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const total = stats?.total ?? 0;
  const verified = stats?.verified ?? 0;
  const pendingReview = stats?.pending_review ?? 0;
  const totalVerifiedAmount = stats?.total_verified_amount ?? 0;
  const processing = Math.max(0, total - verified - pendingReview);

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalVerifiedAmount);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Documents */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Total Documents
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25H9.75A2.25 2.25 0 017.5 18v-1.5m9-8.25H9.75A2.25 2.25 0 007.5 9.75v7.5"
              />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-bold tracking-tight text-stone-900">
            {total}
          </div>
          <p className="mt-1 text-xs text-stone-500">Total processed receipts</p>
        </div>
      </div>

      {/* 2. Verified Expenses */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Verified Expenses
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-bold tracking-tight text-stone-900">
            {formattedAmount}
          </div>
          <p className="mt-1 text-xs text-stone-500">{verified} documents verified</p>
        </div>
      </div>

      {/* 3. Pending Review */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Pending Review
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-bold tracking-tight text-stone-900">
            {pendingReview}
          </div>
          <p className="mt-1 text-xs text-stone-500">Awaiting human review</p>
        </div>
      </div>

      {/* 4. Processing */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Processing
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-bold tracking-tight text-stone-900">
            {processing}
          </div>
          <p className="mt-1 text-xs text-stone-500">Queued or extracting</p>
        </div>
      </div>
    </div>
  );
}
