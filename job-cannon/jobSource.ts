import fs from "fs";
import path from "path";
import crypto from "crypto";
import { approxTextHash, loadApplyQueue, upsertJobInQueue } from "./applyQueue";
import { slugify } from "./utils";

export type JobSourceParseResult = {
  parsed: number;
  inserted: number;
  updated: number;
  skipped: number;
};

type ParsedJob = {
  url?: string;
  title?: string;
  company?: string;
  source?: string;
  rawText: string;
};

function normalizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    u.hash = "";
    const toStrip = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"];
    for (const k of toStrip) u.searchParams.delete(k);
    return u.toString().replace(/\/+$/, "");
  } catch {
    return url.trim().replace(/\/+$/, "");
  }
}

function extractField(line: string): { key: string; value: string } | null {
  const m = line.match(/^([A-Za-z][A-Za-z0-9 /_-]*):\s*(.*)$/);
  if (!m) return null;
  const key = m[1].trim();
  const value = m[2].trim();
  return { key, value };
}

function parseJobBlock(block: string): ParsedJob | null {
  const text = block.trim();
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  let url: string | undefined;
  let title: string | undefined;
  let company: string | undefined;
  let source: string | undefined;

  let i = 0;
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    const f = extractField(l);
    if (!f) break;
    const k = f.key.toLowerCase();
    const v = f.value;
    if (k === "url") url = v;
    else if (k === "title") title = v;
    else if (k === "company") company = v;
    else if (k === "source") source = v;
    else {
      // Stop parsing fields when we hit unknown field tags.
      // We still keep the whole text as rawText.
    }
    // Keep scanning until a non-field line appears.
  }

  const rawText = text;
  return { url, title, company, source, rawText };
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export async function jobSource(inboxFilePath: string, jobsDirPath: string): Promise<JobSourceParseResult> {
  const result: JobSourceParseResult = { parsed: 0, inserted: 0, updated: 0, skipped: 0 };

  if (!fs.existsSync(inboxFilePath)) {
    throw new Error(`Missing inbox file: ${inboxFilePath}`);
  }

  const content = fs.readFileSync(inboxFilePath, "utf8");
  const blocks = content
    .split(/^---JOB---$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const parsed = parseJobBlock(block);
    if (!parsed) continue;

    result.parsed++;

    const urlNorm = normalizeUrl(parsed.url);
    const company = parsed.company ?? "Unknown company";
    const title = parsed.title ?? "React/front-end role";
    const rawTextHash = approxTextHash(parsed.rawText) || sha256(parsed.rawText);

    // Stable-ish identity.
    const id = sha256(`${urlNorm ?? ""}||${company}||${title}||${rawTextHash}`).slice(0, 20);
    const slug = slugify(`${company}-${title}-${urlNorm ?? rawTextHash.slice(0, 8)}`);

    // Determine whether this looks like a true duplicate vs a content update.
    const queueBefore = loadApplyQueue();
    const companyTitleKey = `${company.trim().toLowerCase()}||${title.trim().toLowerCase()}`;
    const duplicate = queueBefore.find((j) => {
      const jUrl = normalizeUrl(j.url);
      const jKey = `${(j.company ?? "").trim().toLowerCase()}||${(j.title ?? "").trim().toLowerCase()}`;
      if (urlNorm && jUrl && urlNorm === jUrl) return true;
      if (companyTitleKey && jKey && companyTitleKey === jKey) return true;
      if (j.rawTextHash && j.rawTextHash === rawTextHash) return true;
      return false;
    });

    // Upsert into ApplyQueue.
    const upserted = upsertJobInQueue({
      id,
      slug,
      company,
      title,
      url: urlNorm,
      source: parsed.source,
      rawTextHash,
      status: "sourced",
      decision: "UNKNOWN",
      dates: { updatedAt: new Date().toISOString() },
    });

    // Summary: mark skipped when exact same text hash already exists.
    if (duplicate && duplicate.rawTextHash === rawTextHash) {
      result.skipped++;
    } else if (duplicate) {
      result.updated++;
    } else {
      result.inserted++;
    }

    // Always create/refresh job.md for later scoring into the canonical queue slug.
    const jobDir = path.join(jobsDirPath, upserted.slug);
    ensureDir(jobDir);
    fs.writeFileSync(path.join(jobDir, "job.md"), parsed.rawText, "utf8");
    fs.writeFileSync(
      path.join(jobDir, "meta.json"),
      JSON.stringify(
        {
          source: parsed.source ?? "inbox",
          jobCompany: company,
          jobRole: title,
          jobLink: urlNorm,
          createdAtISO: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
  }

  // For MVP we don’t attempt perfect inserted/updated/skipped due to API limitations.
  // Keep fields non-empty so callers don’t crash.
  return result;
}

