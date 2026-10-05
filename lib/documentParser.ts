import JSZip from "jszip";
import * as mammoth from "mammoth";

export type ParsedDocument = {
  text: string;
  format: "txt" | "rtf" | "docx" | "pdf" | "epub";
  warnings: string[];
};

function stripRtf(raw: string) {
  return raw
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\'[0-9a-f]{2}/gi, " ")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }
  return pages.join("\n\n");
}

async function parseEpub(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const htmlFiles = Object.keys(zip.files)
    .filter((name) => /\.(xhtml|html|htm)$/i.test(name))
    .sort();
  const chunks: string[] = [];
  for (const name of htmlFiles) {
    const source = await zip.files[name].async("string");
    const doc = new DOMParser().parseFromString(source, "text/html");
    const text = (doc.body?.textContent || "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
    if (text) chunks.push(text);
  }
  return chunks.join("\n\n");
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) {
    return { text: await file.text(), format: "txt", warnings: [] };
  }
  if (name.endsWith(".rtf")) {
    return { text: stripRtf(await file.text()), format: "rtf", warnings: [] };
  }

  const buffer = await file.arrayBuffer();
  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return {
      text: result.value,
      format: "docx",
      warnings: result.messages.map((message) => message.message),
    };
  }
  if (name.endsWith(".pdf")) {
    return {
      text: await parsePdf(buffer),
      format: "pdf",
      warnings: ["PDF text order can vary on highly designed or multi-column pages."],
    };
  }
  if (name.endsWith(".epub")) {
    return {
      text: await parseEpub(buffer),
      format: "epub",
      warnings: ["EPUB chapters are extracted in package file order when spine metadata is unavailable."],
    };
  }
  throw new Error("Unsupported file type.");
}
