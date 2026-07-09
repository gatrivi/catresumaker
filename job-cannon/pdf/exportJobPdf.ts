import fs from "fs";
import path from "path";
import { markdownToText } from "./markdownToText";
import { renderPdfText } from "./renderPdf";

export async function exportJobPdf(params: {
  jobDir: string;
  sourceMdPath?: string;
}): Promise<{ pdfPath: string; wrote: boolean }> {
  const { jobDir } = params;
  const sourceMdPath = params.sourceMdPath ?? path.join(jobDir, "generated", "ApplicationPack.md");
  const pdfPath = path.join(jobDir, "generated", "ApplicationPack.pdf");

  if (!fs.existsSync(sourceMdPath)) {
    return { pdfPath, wrote: false };
  }

  const md = fs.readFileSync(sourceMdPath, "utf8");
  const text = markdownToText(md);

  await renderPdfText({
    title: "ApplicationPack",
    text,
    outputPath: pdfPath,
  });

  return { pdfPath, wrote: true };
}

