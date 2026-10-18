import { NextResponse } from 'next/server';
import { getStats, getRecentDocuments } from '@/lib/db';

export async function GET() {
  try {
    const [stats, recent_documents] = await Promise.all([
      getStats(),
      getRecentDocuments(5),
    ]);

    return NextResponse.json(
      {
        stats: {
          total: stats.total,
          verified: stats.verified,
          pending_review: stats.pending_review,
          total_verified_amount: stats.total_verified_amount,
        },
        recent_documents: recent_documents ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
