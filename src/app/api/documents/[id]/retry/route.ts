import { NextResponse } from 'next/server';
import { getDocumentById, updateDocument } from '@/lib/db';
import { extractDocumentFields } from '@/lib/ai-extract';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed documents can be retried' },
        { status: 400 }
      );
    }

    if (!document.extracted_text || document.extracted_text.trim() === '') {
      return NextResponse.json(
        { error: 'No extracted text available. Please re-upload the document.' },
        { status: 400 }
      );
    }

    const updatedDoc = await updateDocument(id, {
      status: 'processing',
      error_message: null,
    });

    const textToProcess = document.extracted_text;

    // Start background processing
    (async () => {
      try {
        const fields = await extractDocumentFields(textToProcess);
        await updateDocument(id, {
          ...fields,
          status: 'extracted',
        });
      } catch (err) {
        console.error(`Retry background processing failed for document ${id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Processing failed';
        try {
          await updateDocument(id, {
            status: 'failed',
            error_message: errorMessage,
          });
        } catch (updateErr) {
          console.error(`Failed to update status to failed on retry for document ${id}:`, updateErr);
        }
      }
    })().catch((err) => {
      console.error(`Unhandled error in retry background task for document ${id}:`, err);
    });

    const processingDoc =
      updatedDoc ||
      (await getDocumentById(id)) || {
        ...document,
        status: 'processing',
        error_message: null,
      };

    return NextResponse.json(processingDoc, { status: 200 });
  } catch (error) {
    console.error('Error retrying document processing:', error);
    return NextResponse.json(
      { error: 'Failed to retry document processing' },
      { status: 500 }
    );
  }
}
