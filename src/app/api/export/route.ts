import { NextResponse } from 'next/server';
import { getAllDocuments } from '@/lib/db';
import { generateCSV } from '@/lib/csv';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const verifiedOnlyParam = searchParams.get('verified_only');
    const verifiedOnly =
      verifiedOnlyParam === null ||
      verifiedOnlyParam === 'true' ||
      verifiedOnlyParam === '1';

    let status = searchParams.get('status') || undefined;
    if (verifiedOnly) {
      status = 'verified';
    }

    const documents = await getAllDocuments({
      search,
      category,
      status,
      sortBy,
      sortOrder,
    });

    const exportDocuments = verifiedOnly
      ? documents.filter((doc) => doc.status === 'verified')
      : documents;

    const csvData = await generateCSV(exportDocuments);
    const dateStr = new Date().toISOString().split('T')[0];

    return new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="papertrail-export-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV export:', error);
    return NextResponse.json(
      { error: 'Failed to generate export CSV' },
      { status: 500 }
    );
  }
}
