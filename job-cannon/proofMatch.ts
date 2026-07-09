import { dedupeLines } from "./utils";

export type ProofPick = {
  projectId: string;
  projectName: string;
  projectLink?: string;
  explanation: string;
};

function hasAny(haystack: string, needles: string[]): boolean {
  const t = haystack.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

export function pickProofProject(jobText: string, projects: Array<{ id: string; name: string; github?: string; description: string }>): ProofPick {
  const t = jobText.toLowerCase();

  const preferCatIntAssist =
    hasAny(t, ["dashboard", "real-time", "real time", "live", "api", "integration", "bilingual", "medical", "transcription", "translation", "workflow"]) ||
    hasAny(t, ["reliability", "production", "stable", "debug"]);

  const preferCatReader = hasAny(t, ["pdf", "reader", "ocr", "document", "content", "persistence", "sync", "data heavy", "data-heavy"]);

  const preferTmmStore = hasAny(t, ["landing", "ecommerce", "checkout", "cart", "whatsapp", "menu", "orders", "commerce"]);

  let chosen = projects.find((p) => p.id === "catintassist") ?? projects[0];

  if (preferCatReader) chosen = projects.find((p) => p.id === "catreader") ?? chosen;
  if (preferTmmStore) chosen = projects.find((p) => p.id === "tmmstore") ?? chosen;
  if (preferCatIntAssist && !preferCatReader && !preferTmmStore) chosen = projects.find((p) => p.id === "catintassist") ?? chosen;

  const explanationLines: string[] = [];
  explanationLines.push(chosen.description);

  if (preferCatReader) explanationLines.push("Job language matches data-heavy UI + document-like UX (CatReader).");
  if (preferCatIntAssist) explanationLines.push("Job language matches production workflow UI + API integration (CatIntAssist).");
  if (preferTmmStore) explanationLines.push("Job language matches landing/ecommerce/ordering UX (Tmm Store).");

  return {
    projectId: chosen.id,
    projectName: chosen.name,
    projectLink: chosen.github,
    explanation: dedupeLines(explanationLines.join("\n")),
  };
}

