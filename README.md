# PaperTrail — Local-First AI Document Intelligence

Privacy-first document intelligence for freelancers and small businesses. Organize invoices and receipts without uploading sensitive financial documents to third-party cloud AI services.

Built for the **Hacktoberfest Open-Source AI Challenge — Week 2: Side Hustle**.

---

## 🌟 Product Vision & Differentiator

Most document extraction solutions require shipping private financial records, receipts, and invoices to proprietary third-party cloud APIs (OpenAI, AWS Textract, Google Document AI), creating privacy, compliance, and per-document cost liabilities.

**PaperTrail** runs 100% locally:
1. **Local Text Extraction**: Parses digital PDF structures natively via `pdf-parse` and renders scanned documents/receipt images locally using Poppler (`pdftoppm`) and Tesseract OCR (`tesseract.js`).
2. **Local AI Inference**: Uses an on-device language model (`qwen2.5:3b` via Ollama) to extract and normalize structured fields (vendor, invoice date, document number, subtotal, tax, total, currency, expense category, and description).
3. **Local Database & CSV Export**: Persists records locally in an embedded SQLite database (`better-sqlite3`) with live verification workflows, editable fields, and safe CSV export featuring spreadsheet formula injection protection.

Zero third-party API keys. Zero cloud data leaks. Zero per-document fees.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 Web UI                      │
│     (Tailwind CSS, App Router, Warm Neutral Aesthetic)      │
└──────────────┬──────────────────────────────▲───────────────┘
               │ Upload (PDF, JPG, PNG)       │ Verified Data & CSV
               ▼                              │
┌─────────────────────────────────────────────┴───────────────┐
│                    Next.js API Route Handlers               │
│               (/api/documents, /api/export, etc.)           │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
     ┌─────────┴─────────┐          ┌─────────┴─────────┐
     ▼                   ▼          ▼                   ▼
┌──────────────┐ ┌───────────────┐ ┌─────────────┐ ┌──────────┐
│  pdf-parse   │ │ tesseract.js  │ │   Ollama    │ │  SQLite  │
│(Digital PDFs)│ │  + pdftoppm   │ │(qwen2.5:3b) │ │ (Local)  │
│              │ │ (Images/OCR)  │ │ (Port 11434)│ │          │
└──────────────┘ └───────────────┘ └─────────────┘ └──────────┘
```

---

## 🚀 Prerequisites

1. **Node.js**: v18.0.0 or later (tested on Node v22)
2. **Ollama**: Local AI runner ([ollama.ai](https://ollama.ai))
3. **Poppler Utilities**: Required for rendering scanned PDF pages to images (`pdftoppm`)

### Ubuntu / Debian Setup:
```bash
# Install poppler utilities for PDF rasterization
sudo apt-get update
sudo apt-get install -y poppler-utils
```

### Ollama Setup & Model Download:
```bash
# 1. Install Ollama (Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Start the Ollama daemon
ollama serve

# 3. Pull the recommended local model (qwen2.5:3b)
ollama pull qwen2.5:3b

# Note: If using an existing local model alias (e.g. qwen-local:latest),
# configure it in .env.local as described below.
```

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project directory:

```bash
cp .env.example .env.local
```

Configurable variables:

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen-local:latest` (or `qwen2.5:3b`) | The local Ollama model to use |
| `OLLAMA_TIMEOUT` | `120000` | Inference timeout in milliseconds |
| `MAX_FILE_SIZE` | `10485760` | Maximum upload size in bytes (10MB) |

---

## 🛠️ Installation & Development

```bash
# Clone the repository
cd papertrail

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build:
```bash
npm run build
npm start
```

---

## 📖 How to Use PaperTrail

1. **System Health Check**: The top navigation bar displays a live indicator:
   - 🟢 **AI Ready**: Ollama is active and the selected model is loaded.
   - 🟡 **No Model**: Ollama is reachable, but the model needs to be pulled.
   - 🔴 **AI Offline**: Ollama is not running on `127.0.0.1:11434`.
2. **Upload Documents**:
   - Navigate to `/upload` or use the drag-and-drop zone.
   - Accepts multiple receipts or invoices in JPG, PNG, or PDF formats.
3. **Review & Edit**:
   - Click on any document from the Dashboard or Records list.
   - Inspect the extracted vendor, date, invoice number, amounts, currency, and category.
   - Toggle **Raw Extracted Text** to inspect the underlying OCR text.
   - Make any manual adjustments and click **Verify & Save**.
4. **Export CSV**:
   - Navigate to `/documents`.
   - Click **Export CSV** to download a spreadsheet-safe CSV containing all verified financial records.

---

## 🔒 Security & Privacy Architecture

- **No Remote Calls**: Document contents and extracted text never leave your machine.
- **Formula Injection Mitigation**: Exported CSV cells starting with formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with single quotes to prevent spreadsheet execution vulnerabilities.
- **Temporary File Hygiene**: Uploaded files in `tmp/` are unlinked immediately after extraction completes.
- **Input Sanitization**: File names, input fields, and model responses are strictly sanitized to prevent path traversal and database injection.

---

## ⚠️ Known Limitations

- **OCR Speed**: Pure JavaScript / WASM OCR via `tesseract.js` for high-resolution scanned receipts can take 15–30 seconds per page on CPU-only machines.
- **Initial Download**: Downloading model weights via Ollama requires an initial internet connection; subsequent processing is entirely offline.

---

## 📄 License

MIT License. Built with ❤️ for Hacktoberfest 2026.
