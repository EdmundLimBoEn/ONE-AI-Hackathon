export interface ParsedDocument {
  filename: string;
  pages: string[];
  text: string;
  pageCount: number;
  words: number;
  kind: "pdf" | "text";
}

export const MAX_BYTES = 25 * 1024 * 1024;

/**
 * pdf.js needs an explicit worker URL. The bundler rewrites this specifier at
 * build time; if that fails we fall back to running the parse on the main
 * thread rather than failing the upload outright.
 */
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
    } catch {
      pdfjs.GlobalWorkerOptions.workerSrc = "";
    }
  }
  return pdfjs;
}

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text: string): number {
  const matches = text.match(/[A-Za-z0-9'’-]+/g);
  return matches ? matches.length : 0;
}

export async function parsePdf(file: File): Promise<ParsedDocument> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await task.promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      const chunk = (item as { str?: unknown }).str;
      if (typeof chunk !== "string") continue;
      text += chunk;
      if ((item as { hasEOL?: unknown }).hasEOL === true) text += "\n";
      else if (!chunk.endsWith(" ")) text += " ";
    }
    pages.push(normalise(text));
    page.cleanup();
  }
  await task.destroy();

  const text = normalise(pages.join("\n\n"));
  return {
    filename: file.name,
    pages,
    text,
    pageCount: pages.length,
    words: countWords(text),
    kind: "pdf",
  };
}

export async function parseText(file: File): Promise<ParsedDocument> {
  const raw = normalise(await file.text());
  // Split on form feeds when present, otherwise chunk into readable pages.
  const pages = raw.includes("\f")
    ? raw.split("\f").map(normalise).filter(Boolean)
    : chunkPages(raw);
  return {
    filename: file.name,
    pages,
    text: raw,
    pageCount: pages.length,
    words: countWords(raw),
    kind: "text",
  };
}

function chunkPages(text: string, linesPerPage = 46): string[] {
  const lines = text.split("\n");
  if (lines.length <= linesPerPage) return [text];
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage).join("\n"));
  }
  return pages;
}

export function isSupported(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    name.endsWith(".pdf") ||
    file.type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  );
}

export async function parseFile(file: File): Promise<ParsedDocument> {
  if (file.size > MAX_BYTES) {
    throw new Error(
      `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please upload a file under 25 MB.`,
    );
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const parsed = isPdf ? await parsePdf(file) : await parseText(file);
  if (parsed.words < 5) {
    throw new Error(
      "No selectable text was found. Scanned depositions need to be run through OCR first.",
    );
  }
  return parsed;
}

export async function parseSampleUrl(url: string, filename: string): Promise<ParsedDocument> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${filename}`);
  const blob = await response.blob();
  return parseFile(new File([blob], filename, { type: blob.type }));
}
