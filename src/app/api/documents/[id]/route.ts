import { NextResponse } from 'next/server';
import { getDocumentById, updateDocument, deleteDocument } from '@/lib/db';
import { validateDocumentUpdate } from '@/lib/validation';

export async function GET(
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

    return NextResponse.json(document, { status: 200 });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingDoc = await getDocumentById(id);

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    let validatedFields: Record<string, any> = { ...body };
    try {
      const valResult = validateDocumentUpdate(body) as any;
      if (valResult) {
        if (typeof valResult === 'object') {
          if ('valid' in valResult && !valResult.valid) {
            return NextResponse.json(
              {
                error:
                  valResult.error ||
                  (valResult.errors
                    ? Array.isArray(valResult.errors)
                      ? valResult.errors.join(', ')
                      : Object.values(valResult.errors).join(', ')
                    : 'Validation failed'),
              },
              { status: 400 }
            );
          }
          if ('isValid' in valResult && !valResult.isValid) {
            return NextResponse.json(
              {
                error:
                  valResult.error ||
                  (valResult.errors
                    ? Array.isArray(valResult.errors)
                      ? valResult.errors.join(', ')
                      : Object.values(valResult.errors).join(', ')
                    : 'Validation failed'),
              },
              { status: 400 }
            );
          }
          if ('error' in valResult && valResult.error) {
            return NextResponse.json(
              { error: valResult.error },
              { status: 400 }
            );
          }
          if (
            'errors' in valResult &&
            valResult.errors &&
            (Array.isArray(valResult.errors)
              ? valResult.errors.length > 0
              : Object.keys(valResult.errors).length > 0)
          ) {
            const errMsg = Array.isArray(valResult.errors)
              ? valResult.errors.join(', ')
              : Object.values(valResult.errors).join(', ');
            return NextResponse.json(
              { error: errMsg },
              { status: 400 }
            );
          }
          if ('data' in valResult && valResult.data) {
            validatedFields = { ...valResult.data };
          } else if (
            !('valid' in valResult) &&
            !('isValid' in valResult) &&
            !('errors' in valResult)
          ) {
            validatedFields = { ...valResult };
          }
        }
      }
    } catch (valErr) {
      return NextResponse.json(
        { error: valErr instanceof Error ? valErr.message : 'Validation failed' },
        { status: 400 }
      );
    }

    // Status transition and verified_at logic
    if (validatedFields.status !== undefined) {
      if (validatedFields.status === 'verified') {
        validatedFields.verified_at = new Date().toISOString();
      } else if (existingDoc.status === 'verified' && validatedFields.status !== 'verified') {
        validatedFields.verified_at = null;
      }
    }

    const updatedDoc = await updateDocument(id, validatedFields);
    const finalDoc = updatedDoc || (await getDocumentById(id));

    return NextResponse.json(finalDoc, { status: 200 });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingDoc = await getDocumentById(id);

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    await deleteDocument(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
