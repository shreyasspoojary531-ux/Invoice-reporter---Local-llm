import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createWorker } from 'tesseract.js';
import { PDFParse } from 'pdf-parse';

import sharp from 'sharp';

const execFileAsync = promisify(execFile);

async function preprocessImage(inputPathOrBuffer: string | Buffer): Promise<Buffer> {
  try {
    const pipeline = sharp(inputPathOrBuffer);
    const metadata = await pipeline.metadata();

    // Scale up small or low-resolution images for better character definition
    let processed = pipeline;
    if (metadata.width && metadata.width < 1200) {
      processed = processed.resize({ width: 1600, withoutEnlargement: false, fit: 'inside' });
    }

    return await processed
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.2 })
      .png()
      .toBuffer();
  } catch (err) {
    // If sharp preprocessing fails for any reason, return the original
    if (Buffer.isBuffer(inputPathOrBuffer)) {
      return inputPathOrBuffer;
    }
    return await fs.readFile(inputPathOrBuffer);
  }
}

export class ExtractionResult {
  text: string;
  method: 'pdf-parse' | 'ocr' | 'pdf-ocr' | string;

  constructor(text: string, method: 'pdf-parse' | 'ocr' | 'pdf-ocr' | string) {
    this.text = text;
    this.method = method;
  }

  toString(): string {
    return this.text;
  }
}

async function extractWithPdfParse(
  filePath: string
): Promise<{ text: string; totalPages: number }> {
  const fileBuffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: fileBuffer });
  try {
    const result = await parser.getText();
    return {
      text: result.text || '',
      totalPages: result.total || 1,
    };
  } finally {
    try {
      await parser.destroy();
    } catch {
      // ignore cleanup errors from parser
    }
  }
}

async function ocrImageFile(imagePath: string): Promise<string> {
  const enhancedBuffer = await preprocessImage(imagePath);
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
    });
    const {
      data: { text },
    } = await worker.recognize(enhancedBuffer);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

async function extractPdfWithOcr(filePath: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'papertrail-ocr-'));
  const outputPrefix = path.join(tempDir, 'page');

  try {
    await execFileAsync('pdftoppm', ['-png', '-r', '300', filePath, outputPrefix]);

    const files = await fs.readdir(tempDir);
    const pageFiles = files
      .filter((file) => file.startsWith('page-') && file.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (pageFiles.length === 0) {
      throw new Error('pdftoppm did not generate any page images from PDF.');
    }

    const worker = await createWorker('eng');
    const pageTexts: string[] = [];

    try {
      await worker.setParameters({
        preserve_interword_spaces: '1',
      });
      for (const pageFile of pageFiles) {
        const fullPath = path.join(tempDir, pageFile);
        const {
          data: { text },
        } = await worker.recognize(fullPath);
        if (text && text.trim().length > 0) {
          pageTexts.push(text.trim());
        }
      }
    } finally {
      await worker.terminate();
    }

    return pageTexts.join('\n\n');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function extractText(filePath: string, mimeType: string): Promise<ExtractionResult> {
  // Verify file exists
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`File not found at path: ${filePath}`);
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    try {
      const text = await ocrImageFile(filePath);
      return new ExtractionResult(text, 'ocr');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`OCR extraction failed for image (${filePath}): ${msg}`);
    }
  }

  if (mimeType === 'application/pdf') {
    let pdfParseSucceeded = false;
    let pdfText = '';
    let totalPages = 1;

    try {
      const parseResult = await extractWithPdfParse(filePath);
      pdfText = parseResult.text;
      totalPages = parseResult.totalPages || 1;
      pdfParseSucceeded = true;
    } catch {
      pdfParseSucceeded = false;
    }

    // Check if extracted text is substantial (at least 50 chars per page on average)
    const threshold = 50 * totalPages;
    if (pdfParseSucceeded && pdfText.trim().length >= threshold) {
      return new ExtractionResult(pdfText.trim(), 'pdf-parse');
    }

    // Fallback: scanned or empty PDF, try OCR via pdftoppm + tesseract.js
    try {
      const ocrText = await extractPdfWithOcr(filePath);
      return new ExtractionResult(ocrText, 'pdf-ocr');
    } catch (ocrErr: unknown) {
      // If OCR also fails, but we had some text from pdfParse, return it
      if (pdfParseSucceeded && pdfText.trim().length > 0) {
        return new ExtractionResult(pdfText.trim(), 'pdf-parse');
      }
      const msg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
      throw new Error(`Failed to extract text from PDF (${filePath}): ${msg}`);
    }
  }

  throw new Error(
    `Unsupported MIME type for text extraction: "${mimeType}". Expected image/jpeg, image/png, or application/pdf.`
  );
}
