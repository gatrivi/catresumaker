import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { markdownToText } from "./markdownToText";
import { renderPdfText } from "./renderPdf";

export async function exportCvPdf(params?: { sourceMdPath?: string }): Promise<{ pdfPath: string; wrote: boolean }> {
  const __filename = fileURLToPath(import.meta.url);
  const __dir = path.dirname(__filename);
  const repoRoot = path.join(__dir, "..", "..");
  const sourceMdPath = params?.sourceMdPath ?? path.join(repoRoot, "resume.md");
  const pdfDir = path.join(process.cwd(), "dist", "cv");
  const pdfPath = path.join(pdfDir, "Gaston_Trivi_React_Developer.pdf");

  fs.mkdirSync(pdfDir, { recursive: true });
  if (!fs.existsSync(sourceMdPath)) {
    return { pdfPath, wrote: false };
  }

  const md = fs.readFileSync(sourceMdPath, "utf8");
  const text = markdownToText(md);

  await renderPdfText({
    title: "Gaston Trivi — React Developer",
    text,
    outputPath: pdfPath,
  });

  return { pdfPath, wrote: true };
}

