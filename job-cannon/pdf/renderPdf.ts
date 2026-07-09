import fs from "fs";
import PDFDocument from "pdfkit";

export async function renderPdfText(params: {
  title?: string;
  text: string;
  outputPath: string;
}): Promise<void> {
  const { title, text, outputPath } = params;

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    if (title) {
      doc.fontSize(16).text(title, { align: "left" });
      doc.moveDown(0.5);
    }

    doc.fontSize(11).text(text, {
      align: "left",
      width: 500,
    });

    doc.end();

    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

