import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getWorkspace } from "./workspace";
import { getJobCannonRoot } from "./projectRoot";
import crypto from "crypto";

export type ApplyStatus =
  | "new"
  | "sourced"
  | "shortlisted"
  | "ranked"
  | "apply_today"
  | "applied"
  | "follow_up_due"
  | "interview_1"
  | "interview_2"
  | "challenge"
  | "technical"
  | "psych"
  | "offer"
  | "rejected"
  | "archived";

export type ApplyDecision = "APPLY" | "MAYBE" | "SKIP" | "UNKNOWN";

export type ApplyQueueRecord = {
  id: string;
  slug: string;
  title?: string;
  company?: string;
  url?: string;
  source?: string;
  rawTextHash?: string;

  status: ApplyStatus;
  decision: ApplyDecision;

  fitScore?: number;
  priority?: number;
  riskFlags?: string[];

  nextAction?: string;
  nextActionAt?: string;

  generatedPaths?: {
    dir?: string;
    applicationPackMd?: string;
    applicationPackPdf?: string;
    pasteBankTxt?: string;
    followUpsMd?: string;
    interviewPrepMd?: string;
  };

  dates: {
    sourcedAt?: string;
    rankedAt?: string;
    packedAt?: string;
    appliedAt?: string;
    updatedAt: string;
  };

  notes?: string;

  // Preserve unknown keys (for forward compatibility).
  [k: string]: unknown;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_PATH_LEGACY = path.join(getJobCannonRoot(), "ApplyQueue.json");

function queuePath(): string {
  return getWorkspace().queuePath ?? QUEUE_PATH_LEGACY;
}

function ensureQueueFile() {
  const QUEUE_PATH = queuePath();
  if (!fs.existsSync(QUEUE_PATH)) {
    fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
    fs.writeFileSync(QUEUE_PATH, "[]\n", "utf8");
  }
}

export function loadApplyQueue(): ApplyQueueRecord[] {
  ensureQueueFile();
  const raw = fs.readFileSync(queuePath(), "utf8");
  const parsed = JSON.parse(raw) as ApplyQueueRecord[];
  return Array.isArray(parsed) ? parsed : [];
}

export function saveApplyQueue(queue: ApplyQueueRecord[]) {
  ensureQueueFile();
  fs.writeFileSync(queuePath(), JSON.stringify(queue, null, 2) + "\n", "utf8");
}

function normalizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    u.hash = "";
    // Strip common tracking params cheaply (best-effort).
    const toStrip = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"];
    for (const k of toStrip) {
      u.searchParams.delete(k);
    }
    // Normalize trailing slash.
    const s = u.toString().replace(/\/+$/, "");
    return s;
  } catch {
    return url.trim();
  }
}

function companyTitleKey(company?: string, title?: string): string | undefined {
  const c = (company ?? "").trim().toLowerCase();
  const t = (title ?? "").trim().toLowerCase();
  if (!c && !t) return undefined;
  return `${c}||${t}`;
}

export function approxTextHash(text: string): string {
  const normalized = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .toLowerCase();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

function updatedAtNowISO(): string {
  return new Date().toISOString();
}

export function stableSortQueue(queue: ApplyQueueRecord[]): ApplyQueueRecord[] {
  const copy = [...queue];
  copy.sort((a, b) => {
    const pA = typeof a.priority === "number" ? a.priority : -1;
    const pB = typeof b.priority === "number" ? b.priority : -1;
    if (pA !== pB) return pB - pA;

    const fA = typeof a.fitScore === "number" ? a.fitScore : -1;
    const fB = typeof b.fitScore === "number" ? b.fitScore : -1;
    if (fA !== fB) return fB - fA;

    const uA = a.dates?.updatedAt ? Date.parse(a.dates.updatedAt) : 0;
    const uB = b.dates?.updatedAt ? Date.parse(b.dates.updatedAt) : 0;
    return uB - uA;
  });
  return copy;
}

function findDuplicateIndex(queue: ApplyQueueRecord[], candidate: ApplyQueueRecord): number | null {
  const candUrlNorm = normalizeUrl(candidate.url);
  const candCompanyTitle = companyTitleKey(candidate.company, candidate.title);
  const candHash = candidate.rawTextHash;

  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    const qUrlNorm = normalizeUrl(q.url);
    const qCompanyTitle = companyTitleKey(q.company, q.title);
    const qHash = q.rawTextHash;

    if (candUrlNorm && qUrlNorm && candUrlNorm === qUrlNorm) return i;
    if (candCompanyTitle && qCompanyTitle && candCompanyTitle === qCompanyTitle) return i;
    if (candHash && qHash && candHash === qHash) return i;
  }
  return null;
}

export function upsertJobInQueue(job: Partial<ApplyQueueRecord> & Pick<ApplyQueueRecord, "id" | "slug" | "status" | "decision">): ApplyQueueRecord {
  const queue = loadApplyQueue();
  const candidate: ApplyQueueRecord = {
    ...(job as ApplyQueueRecord),
    dates: {
      ...(job as ApplyQueueRecord).dates,
      updatedAt: (job as ApplyQueueRecord).dates?.updatedAt ?? updatedAtNowISO(),
    },
  };

  const dupIndex = findDuplicateIndex(queue, candidate);
  if (dupIndex === null) {
    const inserted = {
      ...candidate,
      dates: {
        ...candidate.dates,
        updatedAt: updatedAtNowISO(),
        sourcedAt: candidate.dates?.sourcedAt ?? (candidate.status === "sourced" ? updatedAtNowISO() : undefined),
      },
    };
    queue.push(inserted);
    saveApplyQueue(stableSortQueue(queue));
    return inserted;
  }

  const existing = queue[dupIndex];
  const merged: ApplyQueueRecord = {
    ...existing,
    ...candidate,
    // Never change identity fields on upsert; keep stable slug/id.
    id: existing.id,
    slug: existing.slug,
    dates: {
      ...(existing.dates ?? { updatedAt: updatedAtNowISO() }),
      ...(candidate.dates ?? {}),
      updatedAt: updatedAtNowISO(),
    },
  };

  // If upserting a sourced job, keep sourcedAt.
  if (merged.status === "sourced" && !merged.dates.sourcedAt) {
    merged.dates.sourcedAt = updatedAtNowISO();
  }

  queue[dupIndex] = merged;
  saveApplyQueue(stableSortQueue(queue));
  return merged;
}

export function updateJobStatus(id: string, patch: Partial<ApplyQueueRecord>): ApplyQueueRecord | null {
  const queue = loadApplyQueue();
  const idx = queue.findIndex((j) => j.id === id || j.slug === id);
  if (idx === -1) return null;
  const existing = queue[idx];
  const merged: ApplyQueueRecord = {
    ...existing,
    ...patch,
    dates: {
      ...(existing.dates ?? { updatedAt: updatedAtNowISO() }),
      ...(patch.dates ?? {}),
      updatedAt: updatedAtNowISO(),
    },
  };
  queue[idx] = merged;
  saveApplyQueue(stableSortQueue(queue));
  return merged;
}

export function getJobsByStatus(statuses: ApplyStatus[]): ApplyQueueRecord[] {
  const queue = loadApplyQueue();
  return queue.filter((j) => statuses.includes(j.status));
}

export function getApplyToday(): ApplyQueueRecord[] {
  return getJobsByStatus(["apply_today"]);
}

