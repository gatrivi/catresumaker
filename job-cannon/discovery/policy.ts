/** Platforms we never automate — human browse only (ban risk). */
export const BLOCKED_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "careerbuilder.com",
];

/** ATS / company boards safe for optional Obscura fetch (public job pages). */
export const ALLOWED_FETCH_HOSTS = [
  "jobs.lever.co",
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.ashbyhq.com",
  "apply.workable.com",
  "careers.smartrecruiters.com",
  "jobs.smartrecruiters.com",
  "teamtailor.com",
  "jobs.teamtailor.com",
  "remotive.com",
  "remoteok.com",
  "weworkremotely.com",
  "hnhiring.com",
  "news.ycombinator.com",
];

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isBlockedUrl(url: string): boolean {
  const h = hostOf(url);
  if (!h) return true;
  return BLOCKED_HOSTS.some((b) => h === b || h.endsWith(`.${b}`));
}

export function isAllowedFetchUrl(url: string): boolean {
  const h = hostOf(url);
  if (!h || isBlockedUrl(url)) return false;
  return ALLOWED_FETCH_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
}

/** Simple in-process rate limit: min ms between Obscura fetches per user. */
const lastFetchByUser = new Map<string, number>();
const MIN_FETCH_INTERVAL_MS = Number(process.env.OBSCURA_MIN_INTERVAL_MS ?? 4000);

export function checkFetchRateLimit(userId: string): { ok: true } | { ok: false; waitMs: number } {
  const now = Date.now();
  const last = lastFetchByUser.get(userId) ?? 0;
  const elapsed = now - last;
  if (elapsed < MIN_FETCH_INTERVAL_MS) {
    return { ok: false, waitMs: MIN_FETCH_INTERVAL_MS - elapsed };
  }
  lastFetchByUser.set(userId, now);
  return { ok: true };
}
