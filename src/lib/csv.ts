import { Document } from '@/lib/db';

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str: string;
  if (typeof value === 'number') {
    str = Number.isFinite(value) ? value.toFixed(2) : '';
  } else {
    str = String(value);
  }

  // Prevent CSV formula injection if string starts with formula trigger characters
  if (typeof value === 'string' && FORMULA_PREFIXES.some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  // Escape double quotes and enclose in quotes if cell contains commas, quotes, or newlines
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateCSV(documents: Document[]): string {
  const headers = [
    'Vendor',
    'Date',
    'Document Number',
    'Subtotal',
    'Tax',
    'Total',
    'Currency',
    'Category',
    'Description',
    'Status',
    'Verified At',
  ];

  const headerLine = headers.map(formatCsvCell).join(',');

  const rows = documents.map((doc) => {
    return [
      formatCsvCell(doc.vendor),
      formatCsvCell(doc.date),
      formatCsvCell(doc.document_number),
      formatCsvCell(doc.subtotal),
      formatCsvCell(doc.tax),
      formatCsvCell(doc.total),
      formatCsvCell(doc.currency),
      formatCsvCell(doc.category),
      formatCsvCell(doc.description),
      formatCsvCell(doc.status),
      formatCsvCell(doc.verified_at),
    ].join(',');
  });

  const BOM = '\uFEFF';
  const csvContent = [headerLine, ...rows].join('\r\n') + '\r\n';

  return BOM + csvContent;
}
