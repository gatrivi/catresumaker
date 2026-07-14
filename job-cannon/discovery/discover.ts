import crypto from "crypto";
import { loadApplyQueue } from "../applyQueue";
import { scoreJobFit } from "../fitScore";
import { addJobDirect } from "../runner";
import { fetchArbeitnowJobs, fetchJobicyJobs, fetchRemotiveJobs, fetchRemoteOkJobs } from "./feeds";
import { fetchPageTextWithObscura } from "./obscura";
import { checkFetchRateLimit, isBlockedUrl } from "./policy";
import {
  buildProfileSearchContext,
  jobMatchesProfile,
  scoreJobProfileFit,
  type ProfileSearchContext,
} from "./profileMatch";
import type { DiscoveredJob, DiscoverSearchInput, DiscoverSearchResult, FeedSource } from "./types";

export const DEFAULT_KEYWORDS = ["react", "typescript", "frontend", "javascript", "vite", "remote"];

const ALL_SOURCES: FeedSource[] = ["remotive", "remoteok", "arbeitnow", "jobicy"];

const fetchers: Record<FeedSource, () => Promise<DiscoveredJob[]>> = {
  remotive: fetchRemotiveJobs,
  remoteok: fetchRemoteOkJobs,
  arbeitnow: fetchArbeitnowJobs,
  jobicy: fetchJobicyJobs,
};

function normKeywords(input?: string[], profile?: ProfileSearchContext, matchProfile?: boolean): string[] {
  const fromProfile = matchProfile && profile?.keywords.length ? profile.keywords : [];
  const manual = (input ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  const kws = manual.length ? manual : fromProfile.length ? fromProfile : DEFAULT_KEYWORDS;
  return [...new Set(kws.map((k) => k.toLowerCase()))];
}

function jobHay(job: DiscoveredJob): string {
  return `${job.title} ${job.company} ${job.description} ${(job.tags ?? []).join(" ")}`.toLowerCase();
}

function matchesKeywords(job: DiscoveredJob, keywords: string[]): boolean {
  const hay = jobHay(job);
  return keywords.some((k) => hay.includes(k));
}

function scorePreview(job: DiscoveredJob, profile?: ProfileSearchContext): { fit: number; matchedSkills?: string[] } {
  const text = `${job.title}\n${job.description}`;
  if (profile) {
    const r = scoreJobProfileFit(text, profile);
    return { fit: r.score0to10, matchedSkills: r.matchedSkills.slice(0, 6) };
  }
  return { fit: scoreJobFit(job.description).score0to10 };
}

function markQueued(jobs: DiscoveredJob[], profile?: ProfileSearchContext): DiscoveredJob[] {
  const queue = loadApplyQueue();
  const urls = new Set(queue.map((q) => q.url?.toLowerCase()).filter(Boolean));
  const keys = new Set(queue.map((q) => `${q.company?.toLowerCase()}||${q.title?.toLowerCase()}`));

  return jobs.map((j) => {
    const key = `${j.company.toLowerCase()}||${j.title.toLowerCase()}`;
    const alreadyQueued = !!(j.url && urls.has(j.url.toLowerCase())) || keys.has(key);
    const scored = scorePreview(j, profile);
    return { ...j, alreadyQueued, previewFit: scored.fit, matchedSkills: scored.matchedSkills };
  });
}

export { buildProfileSearchContext };

export async function searchPublicFeeds(input: DiscoverSearchInput = {}): Promise<DiscoverSearchResult> {
  const matchProfile = input.matchProfile !== false;
  const profile = matchProfile ? buildProfileSearchContext() : undefined;
  const minFit = matchProfile ? Math.min(Math.max(input.minFit ?? 5, 0), 10) : 0;
  const keywords = normKeywords(input.keywords, profile, matchProfile);
  const sourcesIn = input.sources?.length
    ? input.sources.filter((s): s is FeedSource => ALL_SOURCES.includes(s as FeedSource))
    : ALL_SOURCES;
  const sources = sourcesIn.length ? sourcesIn : ALL_SOURCES;
  const limit = Math.min(Math.max(input.limit ?? 40, 5), 80);

  const results: DiscoveredJob[] = [];
  const status = Object.fromEntries(ALL_SOURCES.map((s) => [s, false])) as Record<FeedSource, boolean>;

  await Promise.all(
    sources.map((source) =>
      fetchers[source]()
        .then((jobs) => {
          status[source] = true;
          results.push(...jobs);
        })
        .catch(() => {
          status[source] = false;
        })
    )
  );

  const seen = new Set<string>();
  let filtered = results
    .filter((j) => matchesKeywords(j, keywords))
    .filter((j) => {
      if (seen.has(j.discoverId)) return false;
      seen.add(j.discoverId);
      return true;
    });

  if (matchProfile && profile) {
    filtered = filtered.filter((j) => jobMatchesProfile(jobHay(j), profile));
  }

  const ranked = markQueued(filtered, profile)
    .filter((j) => (j.previewFit ?? 0) >= minFit)
    .sort((a, b) => (b.previewFit ?? 0) - (a.previewFit ?? 0))
    .slice(0, limit);

  return {
    jobs: ranked,
    sources: status,
    keywords,
    fetchedAt: new Date().toISOString(),
    matchProfile,
    minFit: matchProfile ? minFit : undefined,
    profile: profile
      ? { title: profile.title, skillCount: profile.skills.length, hasResume: profile.hasResume }
      : undefined,
  };
}

export function importDiscoveredJobs(jobs: DiscoveredJob[]): {
  imported: number;
  skipped: number;
  records: ReturnType<typeof addJobDirect>[];
} {
  let imported = 0;
  let skipped = 0;
  const records: ReturnType<typeof addJobDirect>[] = [];

  for (const j of jobs) {
    if (j.alreadyQueued) {
      skipped++;
      continue;
    }
    const rawText = [
      `Title: ${j.title}`,
      `Company: ${j.company}`,
      j.url ? `URL: ${j.url}` : "",
      j.location ? `Location: ${j.location}` : "",
      `Source: ${j.source}`,
      "",
      j.description,
    ]
      .filter(Boolean)
      .join("\n");

    records.push(
      addJobDirect({
        url: j.url,
        title: j.title,
        company: j.company,
        rawText,
        source: `discover:${j.source}`,
      })
    );
    imported++;
  }

  return { imported, skipped, records };
}

export type CaptureInput = {
  url?: string;
  title?: string;
  company?: string;
  rawText: string;
  source?: string;
};

export function capturePageJob(input: CaptureInput) {
  if (input.url && isBlockedUrl(input.url)) {
    throw new Error("Cannot capture from blocked platform — paste text manually instead");
  }
  const rawText = input.rawText.trim();
  if (rawText.length < 80) throw new Error("Job text too short (min ~80 chars)");

  return addJobDirect({
    url: input.url,
    title: input.title,
    company: input.company,
    rawText,
    source: input.source ?? "page-capture",
  });
}

export function parseJobMetaFromText(rawText: string, url?: string): { title?: string; company?: string } {
  const titleLine = rawText.match(/^title:\s*(.+)$/im)?.[1]?.trim();
  const companyLine = rawText.match(/^company:\s*(.+)$/im)?.[1]?.trim();
  if (titleLine || companyLine) {
    return { title: titleLine, company: companyLine };
  }

  let company = companyLine;
  if (url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("lever.co")) {
        const seg = u.pathname.split("/").filter(Boolean)[0];
        if (seg) company = seg.replace(/-/g, " ");
      } else if (u.hostname.includes("greenhouse.io")) {
        const seg = u.pathname.split("/").filter(Boolean)[0];
        if (seg && seg !== "jobs" && seg !== "embed") company = seg.replace(/-/g, " ");
      }
    } catch {
      /* ignore */
    }
  }

  const h1 = rawText.match(/^#\s+(.{5,120})$/m)?.[1]?.trim();
  const roleMatch = rawText.match(
    /(?:^|\n)(.{8,120}(?:engineer|developer|frontend|react|typescript|software)[^\n]*)/i
  );
  return {
    title: h1 ?? roleMatch?.[1]?.trim(),
    company,
  };
}

export async function fetchJobUrlForUser(
  userId: string,
  url: string
): Promise<{ title?: string; company?: string; rawText: string }> {
  if (isBlockedUrl(url)) {
    throw new Error("Blocked platform — browse manually and use page capture");
  }
  const rate = checkFetchRateLimit(userId);
  if (!rate.ok) {
    throw new Error(`Rate limit — wait ${Math.ceil(rate.waitMs / 1000)}s`);
  }
  const pageText = await fetchPageTextWithObscura(url);
  if (pageText.length < 80) throw new Error("Page returned too little text");

  const meta = parseJobMetaFromText(pageText, url);
  return {
    rawText: [`URL: ${url}`, meta.company ? `Company: ${meta.company}` : "", `Source: obscura`, "", pageText]
      .filter(Boolean)
      .join("\n"),
    title: meta.title,
    company: meta.company,
  };
}

export function discoverIdFromUrl(url: string, company: string, title: string): string {
  return crypto.createHash("sha256").update(`${url}||${company}||${title}`, "utf8").digest("hex").slice(0, 16);
}
