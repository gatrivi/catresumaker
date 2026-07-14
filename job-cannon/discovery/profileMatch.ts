import fs from "fs";
import path from "path";
import { loadCandidateProfile } from "../profile/loadCandidateProfile";
import { scoreJobFit, type FitResult } from "../fitScore";
import { getWorkspace } from "../workspace";

const FALLBACK_KEYWORDS = ["react", "typescript", "frontend", "javascript", "vite", "remote"];

const STOP = new Set([
  "and",
  "the",
  "for",
  "with",
  "your",
  "our",
  "you",
  "are",
  "will",
  "have",
  "from",
  "this",
  "that",
  "using",
  "experience",
  "years",
  "year",
  "work",
  "team",
  "role",
  "developer",
  "engineer",
  "software",
]);

type ResumeJson = {
  personalInfo?: { title?: string; summary?: string; location?: string };
  skills?: Array<{ category?: string; items?: string[] }>;
  experience?: Array<{ title?: string; bullets?: string[] }>;
  projects?: Array<{ technologies?: string[]; name?: string }>;
};

export type ProfileSearchContext = {
  name: string;
  title: string;
  location: string;
  skills: string[];
  keywords: string[];
  roleHints: string[];
  hasResume: boolean;
};

function normSkill(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9+#.\-]/g, " ")
    .trim()
    .split(/\s+/)[0];
}

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[\s,/|–-]+/)
    .map((t) => t.replace(/[^a-z0-9+#]/g, ""))
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function parseSkillsFromMarkdown(md: string): string[] {
  const skills: string[] = [];
  const block = md.match(/SKILLS?\s*\n([\s\S]*?)(?:\n\n[A-Z][A-Z\s]{2,}|\n*$)/i)?.[1];
  if (!block) return skills;
  for (const line of block.split("\n")) {
    const chunk = line.includes(":") ? line.split(":").slice(1).join(":") : line;
    for (const item of chunk.split(/[,;|]/)) {
      const s = item.trim();
      if (s.length > 1) skills.push(s);
    }
  }
  return skills;
}

function loadResumeJson(): ResumeJson | null {
  const ws = getWorkspace();
  const p = path.join(path.dirname(ws.resumeMdPath), "resume.json");
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!data || typeof data !== "object" || data.personalInfo == null) return null;
    return data as ResumeJson;
  } catch {
    return null;
  }
}

export function buildProfileSearchContext(): ProfileSearchContext {
  const ws = getWorkspace();
  const candidate = loadCandidateProfile();
  const resumeJson = loadResumeJson();
  let resumeMd = "";
  if (fs.existsSync(ws.resumeMdPath)) {
    resumeMd = fs.readFileSync(ws.resumeMdPath, "utf8");
  }

  const title =
    resumeJson?.personalInfo?.title?.trim() ||
    resumeMd.split("\n").map((l) => l.trim()).find((l, i) => i === 1 && l.length > 2) ||
    candidate.currentCompany ||
    "Frontend Developer";

  const location = resumeJson?.personalInfo?.location?.trim() || candidate.location;
  const hasResume = !!(resumeJson || resumeMd.length > 80);

  const skills = new Set<string>();
  for (const grp of resumeJson?.skills ?? []) {
    for (const item of grp.items ?? []) skills.add(item.trim());
  }
  for (const s of parseSkillsFromMarkdown(resumeMd)) skills.add(s);
  for (const exp of resumeJson?.experience ?? []) {
    if (exp.title) tokenizeTitle(exp.title).forEach((t) => skills.add(t));
  }
  for (const pr of resumeJson?.projects ?? []) {
    for (const t of pr.technologies ?? []) skills.add(t);
    if (pr.name) skills.add(pr.name);
  }
  for (const p of candidate.proofProjects) skills.add(p.name);

  const skillList = [...skills].filter(Boolean).slice(0, 24);
  const roleHints = [...new Set([...tokenizeTitle(title), ...skillList.map(normSkill)])].slice(0, 12);

  const keywords = new Set<string>();
  for (const h of roleHints) {
    if (h.length > 2 && !STOP.has(h)) keywords.add(h);
  }
  for (const s of skillList.slice(0, 10)) {
    const n = normSkill(s);
    if (n.length > 2 && !STOP.has(n)) keywords.add(n);
  }
  if (/argentina|latam|latin|buenos/i.test(location)) keywords.add("latam");
  keywords.add("remote");

  const merged =
    keywords.size > 2 ? [...keywords] : [...FALLBACK_KEYWORDS];

  return {
    name: candidate.fullName,
    title,
    location,
    skills: skillList,
    keywords: merged.slice(0, 14),
    roleHints,
    hasResume,
  };
}

export type ProfileFitResult = FitResult & { matchedSkills: string[] };

export function scoreJobProfileFit(jobText: string, ctx: ProfileSearchContext): ProfileFitResult {
  const hay = jobText.toLowerCase();
  const matchedSkills = ctx.skills.filter((s) => {
    const n = normSkill(s);
    return n.length > 2 && hay.includes(n);
  });

  const base = scoreJobFit(jobText);
  let score = base.score0to10;
  const reasons = [...base.reasons];
  const riskFlags = [...base.riskFlags];

  if (matchedSkills.length >= 3) {
    score += 2;
    reasons.push(`Profile skills match (${matchedSkills.slice(0, 4).join(", ")})`);
  } else if (matchedSkills.length >= 1) {
    score += 1;
    reasons.push(`Profile skill: ${matchedSkills[0]}`);
  }

  const titleTokens = tokenizeTitle(ctx.title);
  if (titleTokens.some((t) => hay.includes(t))) {
    score += 1;
    reasons.push("Role aligns with your title");
  }

  if (/argentina|latam|latin america/i.test(ctx.location) && /latam|latin america|argentina|anywhere|worldwide/i.test(hay)) {
    score += 1;
    reasons.push("Location-friendly for you");
  }

  score = Math.min(10, Math.max(0, score));

  let applyDecision = base.applyDecision;
  if (score >= 7 && !riskFlags.includes("senior-only phrasing")) applyDecision = "APPLY";
  else if (score >= 5) applyDecision = "MAYBE";
  else applyDecision = "SKIP";

  return { score0to10: score, applyDecision, reasons, riskFlags, matchedSkills };
}

export function jobMatchesProfile(jobText: string, ctx: ProfileSearchContext): boolean {
  const hay = jobText.toLowerCase();
  const skillHit = ctx.skills.some((s) => {
    const n = normSkill(s);
    return n.length > 2 && hay.includes(n);
  });
  const kwHits = ctx.keywords.filter((k) => hay.includes(k.toLowerCase())).length;
  return skillHit || kwHits >= 2;
}
