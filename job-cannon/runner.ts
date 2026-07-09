import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  approxTextHash,
  loadApplyQueue,
  saveApplyQueue,
  stableSortQueue,
  upsertJobInQueue,
  type ApplyQueueRecord,
} from "./applyQueue";
import { jobSource } from "./jobSource";
import { scoreJobFit } from "./fitScore";
import { slugify } from "./utils";
import { getWorkspace } from "./workspace";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function jobsDir() {
  return getWorkspace().jobsDir;
}
function inboxPath() {
  return getWorkspace().inboxPath;
}
function rankedPath() {
  return getWorkspace().rankedPath;
}
function pasteBankAllPath() {
  return getWorkspace().pasteBankAllPath;
}

function exists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

type JobMeta = {
  source: string;
  jobCompany: string;
  jobRole: string;
  jobLink?: string;
  createdAtISO: string;
};

function writeRankedJobs(queue: ApplyQueueRecord[]) {
  const ranked = stableSortQueue(queue)
    .filter((j) => (j.decision ?? "UNKNOWN") !== "SKIP" && (j.status === "ranked" || j.status === "apply_today"))
    .slice(0, 30);

  const lines: string[] = ["# Ranked Jobs", "", "| Company | Role | Link | Fit | Risk | Priority | Status |", "|---|---|---|---:|---|---:|---|"];

  for (const j of ranked) {
    lines.push(
      `| ${j.company ?? "Unknown"} | ${j.title ?? "React role"} | ${j.url ?? "(none)"} | ${j.fitScore ?? ""} | ${j.riskFlags?.length ? j.riskFlags.join(", ") : "-"} | ${j.priority ?? ""} | ${j.status} |`
    );
  }

  fs.writeFileSync(rankedPath(), lines.join("\n"), "utf8");
}

function createPasteBankBundle() {
  const dir = jobsDir();
  const entries = exists(dir) ? fs.readdirSync(dir) : [];
  const parts: string[] = [];
  for (const slug of entries) {
    const p = path.join(dir, slug, "generated", "PasteBank.txt");
    if (!exists(p)) continue;
    parts.push(`===== ${slug} =====\n` + fs.readFileSync(p, "utf8"));
  }
  if (parts.length) {
    fs.writeFileSync(pasteBankAllPath(), parts.join("\n\n"), "utf8");
  }
}

/** Re-import job folders (seed/manual) into ApplyQueue when missing. */
export function syncJobsDirToQueue(): { synced: number; total: number } {
  const dir = jobsDir();
  if (!exists(dir)) return { synced: 0, total: 0 };

  let synced = 0;
  const slugs = fs.readdirSync(dir);

  for (const slug of slugs) {
    const jobDir = path.join(dir, slug);
    const metaPath = path.join(jobDir, "meta.json");
    const jobMdPath = path.join(jobDir, "job.md");
    if (!exists(metaPath) || !exists(jobMdPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as JobMeta;
    const rawText = fs.readFileSync(jobMdPath, "utf8");
    const rawTextHash = approxTextHash(rawText);
    const company = meta.jobCompany;
    const title = meta.jobRole;
    const url = meta.jobLink;
    const id = sha256(`${url ?? ""}||${company}||${title}||${rawTextHash}`).slice(0, 20);

    const queue = loadApplyQueue();
    const already = queue.find((j) => j.slug === slug || j.id === id);
    if (already) continue;

    const hasPack = exists(path.join(jobDir, "generated", "ApplicationPack.md"));

    upsertJobInQueue({
      id,
      slug,
      company,
      title,
      url,
      source: meta.source,
      rawTextHash,
      status: hasPack ? "apply_today" : "sourced",
      decision: "UNKNOWN",
      dates: { sourcedAt: meta.createdAtISO, updatedAt: new Date().toISOString() },
    });
    synced++;
  }

  return { synced, total: slugs.length };
}

export async function runJobSource() {
  const inbox = inboxPath();
  if (!exists(inbox)) {
    ensureDir(path.dirname(inbox));
    fs.writeFileSync(inbox, "---JOB---\nURL: \nTitle: \nCompany: \nSource: Pasted\n\nPaste full job text here...\n", "utf8");
  }
  return jobSource(inbox, jobsDir());
}

export type AddJobInput = {
  url?: string;
  title?: string;
  company?: string;
  rawText: string;
  source?: string;
};

/** Add a job directly (UI inbox) without editing jobs.txt manually. */
export function addJobDirect(input: AddJobInput): ApplyQueueRecord {
  const company = input.company?.trim() || "Unknown company";
  const title = input.title?.trim() || "React/front-end role";
  const rawText = input.rawText.trim();
  if (!rawText) throw new Error("Job description text is required.");

  const rawTextHash = approxTextHash(rawText);
  const id = sha256(`${input.url ?? ""}||${company}||${title}||${rawTextHash}`).slice(0, 20);
  const slug = slugify(`${company}-${title}-${input.url ?? rawTextHash.slice(0, 8)}`);

  const jobDir = path.join(jobsDir(), slug);
  ensureDir(jobDir);
  fs.writeFileSync(path.join(jobDir, "job.md"), rawText, "utf8");
  fs.writeFileSync(
    path.join(jobDir, "meta.json"),
    JSON.stringify(
      {
        source: input.source ?? "dashboard",
        jobCompany: company,
        jobRole: title,
        jobLink: input.url,
        createdAtISO: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  return upsertJobInQueue({
    id,
    slug,
    company,
    title,
    url: input.url,
    source: input.source ?? "dashboard",
    rawTextHash,
    status: "sourced",
    decision: "UNKNOWN",
    dates: { sourcedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  });
}

export type JobArtifacts = {
  slug: string;
  applicationPack?: string;
  pasteBank?: string;
  interviewPrep?: string;
  followUps?: string;
  state?: string;
  score?: { fit: ReturnType<typeof scoreJobFit> };
};

export function getJobArtifacts(slug: string): JobArtifacts | null {
  const jobDir = path.join(jobsDir(), slug);
  if (!exists(jobDir)) return null;

  const read = (rel: string) => {
    const p = path.join(jobDir, rel);
    return exists(p) ? fs.readFileSync(p, "utf8") : undefined;
  };

  const scoreRaw = read("generated/score.json");
  let score: JobArtifacts["score"];
  if (scoreRaw) {
    try {
      const parsed = JSON.parse(scoreRaw);
      score = { fit: parsed.fit ?? parsed };
    } catch {
      /* ignore */
    }
  }

  return {
    slug,
    applicationPack: read("generated/ApplicationPack.md"),
    pasteBank: read("generated/PasteBank.txt"),
    interviewPrep: read("generated/InterviewPrep.md"),
    followUps: read("generated/FollowUps.md"),
    state: read("generated/state.md"),
    score,
  };
}

export type CannonResult = {
  packed: number;
  ranked: number;
  queueSize: number;
};

/**
 * Batch score + pack. `generateForJob` is injected to avoid circular imports with cli.ts.
 */
export async function runJobCannon(
  generateForJob: (jobDir: string, opts?: { forceAi?: boolean }) => Promise<{ generated: boolean; reason?: string }>,
  flags: { force?: boolean } = {}
): Promise<CannonResult> {
  const queue = loadApplyQueue();
  const targets = queue.filter((j) =>
    ["new", "sourced", "shortlisted", "ranked", "apply_today"].includes(j.status)
  );
  const now = new Date().toISOString();

  let packed = 0;
  let ranked = 0;

  for (const record of targets) {
    const jobDir = path.join(jobsDir(), record.slug);
    const jobMdPath = path.join(jobDir, "job.md");
    if (!exists(jobDir) || !exists(jobMdPath)) {
      record.status = "archived";
      record.decision = "UNKNOWN";
      record.notes = (record.notes ? record.notes + "\n" : "") + "Missing job.md under jobs/<slug>.";
      continue;
    }

    const jobText = fs.readFileSync(jobMdPath, "utf8");
    const fit = scoreJobFit(jobText);
    record.fitScore = fit.score0to10;
    record.riskFlags = fit.riskFlags;
    record.decision = fit.applyDecision;
    record.priority = fit.score0to10;
    record.dates.rankedAt = record.dates.rankedAt ?? now;

    const packAlready =
      exists(path.join(jobDir, "generated", "ApplicationPack.md")) &&
      exists(path.join(jobDir, "generated", "PasteBank.txt"));

    const shouldPack = fit.applyDecision === "APPLY" && fit.score0to10 >= 7 && (flags.force || !packAlready);

    if (shouldPack) {
      await generateForJob(jobDir);
      record.status = "apply_today";
      record.dates.packedAt = now;
      record.generatedPaths = {
        dir: path.join(jobDir, "generated"),
        applicationPackMd: "ApplicationPack.md",
        pasteBankTxt: "PasteBank.txt",
        followUpsMd: "FollowUps.md",
        interviewPrepMd: "InterviewPrep.md",
      };
      packed++;
    } else if (packAlready && fit.applyDecision === "APPLY" && fit.score0to10 >= 7) {
      record.status = "apply_today";
    } else {
      record.status = "ranked";
      ranked++;
    }

    record.nextAction =
      record.status === "apply_today" ? "Manually submit application (copy/paste pack)" : "Review and shortlist";
    record.nextActionAt = now;
    record.dates.updatedAt = now;
  }

  saveApplyQueue(stableSortQueue(queue));
  createPasteBankBundle();
  writeRankedJobs(queue);

  return { packed, ranked, queueSize: queue.length };
}
