import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';
import { getAllDocuments, createDocument, updateDocument, getDocumentById } from '@/lib/db';
import { extractText } from '@/lib/extractor';
import { extractDocumentFields } from '@/lib/ai-extract';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const documents = await getAllDocuments({
      search,
      category,
      status,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(documents, { status: 200 });
  } catch (error) {
    console.error('Failed to get documents:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid multipart form data' },
        { status: 400 }
      );
    }

    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'A valid file is required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and PDF files are supported.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit of 10MB.' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const tmpDir = join(process.cwd(), 'tmp');
    await mkdir(tmpDir, { recursive: true });

    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = join(tmpDir, `${id}-${safeFilename}`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    const initialDocData = {
      id,
      filename: file.name,
      original_filename: file.name,
      file_type: file.type,
      file_size: file.size,
      status: 'processing' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const createdDoc = (await createDocument(initialDocData)) || (await getDocumentById(id)) || initialDocData;

    // Start background processing without awaiting
    (async () => {
      try {
        // 1. Extract text from file using extractText(filePath, mimeType)
        const extractionResult = await extractText(filePath, file.type);
        const extractedText = extractionResult.text;

        // Save extracted text intermediate so retry can access it if AI extraction fails
        try {
          await updateDocument(id, { extracted_text: extractedText });
        } catch {
          // ignore error
        }

        // 2. Extract fields using extractDocumentFields(extractedText)
        const fields = await extractDocumentFields(extractedText);

        // 3. Update document with extracted fields and status 'extracted'
        await updateDocument(id, {
          ...fields,
          extracted_text: extractedText,
          status: 'extracted',
        });
      } catch (err) {
        console.error(`Background processing error for document ${id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Processing failed';
        // 4. On error: update document with status 'failed' and error_message
        try {
          await updateDocument(id, {
            status: 'failed',
            error_message: errorMessage,
          });
        } catch (updateErr) {
          console.error(`Failed to update status to failed for document ${id}:`, updateErr);
        }
      } finally {
        // 5. Finally: delete the temp file (use fs.unlink, ignore errors)
        try {
          await unlink(filePath);
        } catch {
          // ignore errors
        }
      }
    })().catch((err) => {
      console.error(`Unhandled error in background processing for document ${id}:`, err);
    });

    return NextResponse.json(createdDoc, { status: 201 });
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
