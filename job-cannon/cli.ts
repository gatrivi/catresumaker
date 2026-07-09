import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadCandidateProfile } from "./profile/loadCandidateProfile";
import { FitResult, scoreJobFit } from "./fitScore";
import { pickProofProject } from "./proofMatch";
import { slugify } from "./utils";
import { validateGeneratedText } from "./truthGuard";
import { formatApplicationPack } from "./templates";
import { loadApplyQueue } from "./applyQueue";
import { runJobCannon, runJobSource } from "./runner";
import { loadFormAnswers } from "./profile/loadFormAnswers";
import { tailorApplicationPack } from "./ai/tailorPack";
import { getLLMStatus } from "./ai/llmClient";
import { exportCvPdf } from "./pdf/exportCvPdf";
import { exportJobPdf } from "./pdf/exportJobPdf";
import { importDiscoveredJobs, searchPublicFeeds } from "./discovery/discover";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type JobMeta = {
  source: string;
  jobCompany: string;
  jobRole: string;
  jobLink?: string;
  createdAtISO: string;
};

type ScoreState = {
  fit: FitResult;
  proofProjectId: string;
  proofProjectName: string;
  proofProjectLink?: string;
  updatedAtISO: string;
};

const JOBS_DIR = path.join(__dirname, "jobs");

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function exists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function readFileText(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function safeWrite(p: string, text: string) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, text, "utf8");
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  const args = [...argv];
  const positional: string[] = [];
  while (args.length) {
    const a = args.shift()!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[0];
      if (next && !next.startsWith("--")) {
        out[key] = args.shift()!;
      } else {
        out[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { out, positional };
}

function guessCompanyAndRole(jobText: string): { company: string; role: string } {
  const t = jobText.replace(/\s+/g, " ").trim();
  // Try common patterns
  const m2 = t.match(/Company:\s*(.*?)\s+(Role|Position|Title)/i);
  // Prefer grabbing the full phrase around React/Frontend roles.
  const mRole =
    t.match(/([A-Za-z0-9 &/()_-]{0,40}React[A-Za-z0-9 &/()_-]{0,40}(Engineer|Developer)[A-Za-z0-9 &/()_-]{0,40})/i) ||
    t.match(/([A-Za-z0-9 &/()_-]{0,40}Frontend[A-Za-z0-9 &/()_-]{0,40}(Engineer|Developer)[A-Za-z0-9 &/()_-]{0,40})/i);

  if (m2) {
    return { company: m2[1].slice(0, 60), role: "Frontend React role" };
  }
  if (mRole) {
    // Company is often the token sequence before the role phrase.
    const idx = t.toLowerCase().indexOf(mRole[1].toLowerCase());
    const before = idx > 0 ? t.slice(0, idx).trim() : "";
    const companyGuess = before.split(/[|—-]/)[0]?.trim() || "Unknown company";
    return { company: companyGuess.slice(0, 60), role: mRole[1].slice(0, 80) };
  }
  return { company: "Unknown company", role: "React/front-end role" };
}

function getFormAnswers() {
  const f = loadFormAnswers();
  const candidateProfile = loadCandidateProfile();
  return {
    "Resume/CV": "[PLACEHOLDER]",
    "Full name": candidateProfile.fullName,
    Email: f.email || candidateProfile.email,
    Phone: f.phone || candidateProfile.phone,
    "Current location": f.location || candidateProfile.location,
    "Current company": candidateProfile.currentCompany,
    "LinkedIn URL": f.linkedin || candidateProfile.linkedin,
    "GitHub URL": f.github || candidateProfile.github,
    "Twitter URL": "N/A",
    "Portfolio URL": f.portfolio || candidateProfile.portfolio,
    "Are you currently an employee or contractor?": f.workAuthorization || "Contractor",
    "What is your desired annual salary? (Please list the amount and currency)": f.salaryExpectation || candidateProfile.desiredSalary,
    "How soon can you start?": f.availability || candidateProfile.startTiming,
  } as Record<string, string>;
}

function buildApplicationText(params: {
  jobCompany: string;
  jobRole: string;
  proofProjectName: string;
  proofProjectLink?: string;
  proofExplanation: string;
  salaryExpectation: string;
  availability: string;
}) {
  const candidateProfile = loadCandidateProfile();
  const { jobCompany, jobRole, proofProjectName, proofProjectLink, proofExplanation, salaryExpectation, availability } =
    params;
  const proofLine = proofProjectLink ? `${proofProjectName} (${proofProjectLink})` : proofProjectName;

  // Keep it direct, no hype, no years.
  const application100 = `Hi ${jobCompany} team — I’m applying for the ${jobRole} role. I build production-ready React/TypeScript frontend features with clean component structure, predictable state, and careful API/data-contract integration. My main proof is ${proofLine}, where I focus on reliability and fast iteration in real workflows (bilingual/medical domain). I work well with product, design, and backend teammates, and I’m comfortable debugging UI edge cases and shipping improvements quickly. I speak English fluently and Spanish native. Thanks for your time.`;

  const application50 = `Hi ${jobCompany} team — I’m applying for the ${jobRole} role. I build production-ready React/TypeScript UI with dependable state handling and careful API integration. My main proof is ${proofProjectName}, a reliability-focused React app used in real bilingual/medical workflows. English fluent.`;

  const salaryAnswer = salaryExpectation;
  const availabilityAnswer = availability;

  const technicalTalkingPoint =
    "In my React projects, I keep UI state predictable by separating “data/API state” from “presentation state,” making API failures visible but non-blocking, and designing typed boundaries to prevent regressions as features evolve.";

  const recruiterDM = `Hi — I’m Gastón Alejandro Trivi. I’m applying for the ${jobRole} role. My relevant proof is ${proofProjectName} (React/TypeScript, reliability-first). If helpful, I can share short examples of UI state handling + API integration patterns I used there. Thanks.`;

  const followUpMessage = `Hi ${jobCompany} team — following up on my application for ${jobRole}. I’m still very interested. If you’d like, I can add a short note with the most relevant UI/API integration details from ${proofProjectName}. Thanks.`;

  const interviewPrepTalkingPoint =
    "Defend one feature from your proof project end-to-end: what the UI needed, what the API/data contract was, how you modeled state, what failures you handled, and what you improved after feedback.";

  const claimSafetyNotes = [
    "No fabricated years of experience; language avoids seniority titles you don’t own.",
    "No marketing/hype phrases that sound AI-generated.",
    "Uses only your proof projects as evidence.",
    "Uses `gatrivi@gmail.com` (not the forbidden domain).",
  ];

  // Guard: ensure we didn’t accidentally include banned email or “years”.
  const truthGuard = validateGeneratedText({
    text: application100 + "\n" + application50,
    email: candidateProfile.email,
    expectedEmail: candidateProfile.email,
  });

  if (!truthGuard.ok) {
    claimSafetyNotes.push(`Truth-guard problems: ${truthGuard.problems.join("; ")}`);
  }

  return {
    application100,
    application50,
    salaryAnswer,
    availabilityAnswer,
    technicalTalkingPoint,
    recruiterDM,
    followUpMessage,
    interviewPrepTalkingPoint,
    claimSafetyNotes,
  };
}

function buildInterviewPrep(jobRole: string, proofProjectName: string) {
  const tellMeAboutYou =
    "I’m a frontend React developer focused on production reliability: clean component structure, predictable state, and careful API/data-contract integration. I’ve built real React apps for high-pressure bilingual workflows and I iterate quickly based on feedback.";

  return `# InterviewPrep — ${jobRole}

## 5 likely React questions
1. How do you structure async API state and avoid inconsistent UI?
2. How do you prevent unnecessary re-renders in React?
3. What’s your approach to typed boundaries between UI and API responses?
4. How do you handle loading/error/empty states consistently?
5. How do you debug a production UI edge case?

## 5 likely project questions
1. Walk through a feature from UI requirement to API integration.
2. What state model did you pick and why?
3. What failures did you anticipate (and how did you surface them)?
4. What did you improve after user feedback?
5. How did you keep UI behavior reliable during frequent updates?

## 3 weak spots to prepare
1. Tooling gaps vs the job’s exact stack (if mentioned): I will learn the missing pieces quickly and keep delivery quality high.
2. Any testing/framework specifics: I’ll describe the testing mindset and how I’d adapt to their preferred stack.
3. Senior/degree constraints: I’ll be transparent that my experience comes from production work (freelance + tools I maintain).

## 3 strong talking points
1. I ship maintainable React features with predictable state handling.
2. I integrate APIs carefully and handle failure modes intentionally.
3. My proof project ${proofProjectName} is reliability-focused in real workflows.

## 1 concise “tell me about yourself” pitch
${tellMeAboutYou}

## 1 “why this role”
I want a frontend role where I can build dependable React/TypeScript UI, integrate with APIs cleanly, and iterate quickly with product/design/backend collaboration.

## 1 “why should we hire you”
Because I combine real React shipping, API integration discipline, and reliability-first UI engineering—plus clear English communication and fast ramping.
`;
}

function buildFollowUps(jobCompany: string, jobRole: string) {
  return `# FollowUps — ${jobCompany} | ${jobRole}

Applied: (fill date)
Follow up: (fill 2026-06-30 style date)
Second follow up: (fill 2026-07-07 style date)
Status: waiting

## Template 1 (polite follow-up)
Hi ${jobCompany} team — following up on my application for ${jobRole}. I’m still interested and would appreciate any update on next steps. Thanks.

## Template 2 (recruiter DM)
Hi — I’m Gastón Alejandro Trivi. I applied for the ${jobRole} role. I can share a short note about relevant UI/API integration patterns from my React proof projects. Thanks.

## Template 3 (technical proof follow-up)
Hi ${jobCompany} team — quick follow-up. If helpful, I can point to the exact UI state handling + API integration patterns I used in my React proof project (reliability-focused). Thanks.
`;
}

function generatePasteBankText(formAnswers: Record<string, string>, application100: string, application50: string) {
  const candidate = loadCandidateProfile();
  // This keeps a consistent structure for mass paste.
  return `[full_name]
${candidate.fullName}

[email]
${candidate.email}

[phone]
${candidate.phone}

[current_location]
${candidate.location}

[current_company]
${candidate.currentCompany}

[linkedin]
${candidate.linkedin}

[github]
${candidate.github}

[portfolio]
${candidate.portfolio}

[desired_salary]
${candidate.desiredSalary}

[start_date]
${candidate.startTiming}

[application_100]
${application100}

[application_50]
${application50}

[technical_talking_point]
${formAnswers["How soon can you start?"] ? "" : ""}
`;
}

async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url);
  const text = await res.text();
  // Best-effort HTML -> text conversion so heuristics can work without scraping.
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

async function jobNew(source: string, flags: Record<string, string | boolean>) {
  ensureDir(JOBS_DIR);

  const companyFlag = typeof flags.company === "string" ? flags.company : undefined;
  const roleFlag = typeof flags.role === "string" ? flags.role : undefined;
  const linkFlag = typeof flags.link === "string" ? flags.link : undefined;
  const slugFlag = typeof flags.slug === "string" ? flags.slug : undefined;

  let raw = "";
  let detectedCompany = companyFlag;
  let detectedRole = roleFlag;

  const possiblePath = path.isAbsolute(source) ? source : path.join(process.cwd(), source);
  if (exists(possiblePath) && fs.statSync(possiblePath).isFile()) {
    raw = readFileText(possiblePath);
  } else if (/^https?:\/\//i.test(source)) {
    raw = await fetchUrlText(source).catch(() => "");
  } else {
    raw = source;
  }

  raw = normalizeWhitespace(raw);
  if (!raw) throw new Error(`Could not load job text from source: ${source}`);

  if (!detectedCompany || !detectedRole) {
    const guess = guessCompanyAndRole(raw);
    detectedCompany = detectedCompany ?? guess.company;
    detectedRole = detectedRole ?? guess.role;
  }

  const slug = slugFlag ?? slugify(`${detectedCompany}-${detectedRole}-${source}`);
  const jobDir = path.join(JOBS_DIR, slug);
  ensureDir(jobDir);

  const meta: JobMeta = {
    source,
    jobCompany: detectedCompany!,
    jobRole: detectedRole!,
    jobLink: linkFlag ?? (/^https?:\/\//i.test(source) ? source : undefined),
    createdAtISO: new Date().toISOString(),
  };

  safeWrite(path.join(jobDir, "job.md"), raw);
  safeWrite(path.join(jobDir, "meta.json"), JSON.stringify(meta, null, 2));

  return { slug, jobDir };
}

function readJobMeta(jobDir: string): JobMeta {
  return JSON.parse(fs.readFileSync(path.join(jobDir, "meta.json"), "utf8")) as JobMeta;
}

function readJobText(jobDir: string): string {
  return fs.readFileSync(path.join(jobDir, "job.md"), "utf8");
}

function pickProof(projects: ReturnType<typeof loadCandidateProfile>["proofProjects"], jobText: string) {
  const p = pickProofProject(jobText, projects);
  return p;
}

function applicationPackPath(jobDir: string) {
  return path.join(jobDir, "generated", "ApplicationPack.md");
}

function pasteBankPath(jobDir: string) {
  return path.join(jobDir, "generated", "PasteBank.txt");
}

function interviewPrepPath(jobDir: string) {
  return path.join(jobDir, "generated", "InterviewPrep.md");
}

function followUpsPath(jobDir: string) {
  return path.join(jobDir, "generated", "FollowUps.md");
}

function scoreFile(jobDir: string) {
  return path.join(jobDir, "generated", "score.json");
}

function jobStateFile(jobDir: string) {
  return path.join(jobDir, "generated", "state.md");
}

function renderJobState(jobDir: string, meta: JobMeta, score: ScoreState) {
  const lines: string[] = [];
  lines.push(`# JobState — ${meta.jobCompany} | ${meta.jobRole}`);
  lines.push(``);
  lines.push(`Link: ${meta.jobLink ?? "(none)"}`);
  lines.push(``);
  lines.push(`Fit: ${score.fit.score0to10}/10`);
  lines.push(`Decision: ${score.fit.applyDecision}`);
  lines.push(``);
  lines.push(`Proof: ${score.proofProjectName}`);
  if (score.proofProjectLink) lines.push(`Proof link: ${score.proofProjectLink}`);
  lines.push(``);
  lines.push(`Reasons: ${score.fit.reasons.join(", ") || "-"}`);
  lines.push(``);
  lines.push(`Risk flags: ${score.fit.riskFlags.join(", ") || "-"}`);
  safeWrite(jobStateFile(jobDir), lines.join("\n"));
}

async function jobScore(slug?: string) {
  const entries = fs.existsSync(JOBS_DIR) ? fs.readdirSync(JOBS_DIR) : [];
  const targets = slug ? [path.join(JOBS_DIR, slug)] : entries.map((e) => path.join(JOBS_DIR, e));

  for (const jobDir of targets) {
    if (!exists(jobDir) || !exists(path.join(jobDir, "job.md"))) continue;
    const meta = readJobMeta(jobDir);
    const jobText = readJobText(jobDir);
    const fit = scoreJobFit(jobText);
    const proof = pickProof(loadCandidateProfile().proofProjects, jobText);

    const scoreState: ScoreState = {
      fit,
      proofProjectId: proof.projectId,
      proofProjectName: proof.projectName,
      proofProjectLink: proof.projectLink,
      updatedAtISO: new Date().toISOString(),
    };

    safeWrite(scoreFile(jobDir), JSON.stringify(scoreState, null, 2));
    renderJobState(jobDir, meta, scoreState);
  }
}

function loadScore(jobDir: string): ScoreState | null {
  const p = scoreFile(jobDir);
  if (!exists(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as ScoreState;
}

async function generateForJob(jobDir: string, opts?: { forceAi?: boolean }) {
  const candidateProfile = loadCandidateProfile();
  const meta = readJobMeta(jobDir);
  const jobText = readJobText(jobDir);

  // Require score exists
  const scoreState = loadScore(jobDir) ?? {
    fit: scoreJobFit(jobText),
    proofProjectId: "catintassist",
    proofProjectName: "CatIntAssist",
    updatedAtISO: new Date().toISOString(),
  };

  const proof = pickProof(candidateProfile.proofProjects, jobText);

  const fitDecision = scoreState.fit.applyDecision;
  if (fitDecision !== "APPLY" || scoreState.fit.score0to10 < 7) {
    return { generated: false, reason: "Not APPLY / score < 7" };
  }

  const proofProject = candidateProfile.proofProjects.find((p) => p.id === proof.projectId) ?? candidateProfile.proofProjects[0];
  const proofProjectText = {
    projectName: proofProject.name,
    projectLink: proofProject.github ?? proofProject.url,
    explanation: proofProject.description + "\n" + proof.explanation,
  };

  const { jobCompany, jobRole, jobLink } = meta;

  const formAnswers = getFormAnswers();

  const salaryExpectation =
    formAnswers["What is your desired annual salary? (Please list the amount and currency)"] ?? candidateProfile.desiredSalary;
  const availability =
    formAnswers["How soon can you start?"] ?? candidateProfile.startTiming;

  let applicationText = buildApplicationText({
    jobCompany,
    jobRole,
    proofProjectName: proofProjectText.projectName,
    proofProjectLink: proofProjectText.projectLink,
    proofExplanation: proofProjectText.explanation,
    salaryExpectation,
    availability,
  });

  let whyThisRole: string | undefined;
  let aiMeta: { provider: string; model: string } | undefined;
  let interviewPrepAddon = "";

  const tryAi = opts?.forceAi || getLLMStatus().available;
  if (tryAi) {
    const tailored = await tailorApplicationPack({
      jobCompany,
      jobRole,
      jobText,
      jobLink: typeof jobLink === "string" ? jobLink.trim() : "",
      fitScore: scoreState.fit.score0to10,
      riskFlags: scoreState.fit.riskFlags,
      proofProjectName: proofProjectText.projectName,
      proofProjectLink: proofProjectText.projectLink,
      proofExplanation: proofProjectText.explanation,
    });

    if (tailored) {
      applicationText = {
        application100: tailored.application100,
        application50: tailored.application50,
        salaryAnswer: salaryExpectation,
        availabilityAnswer: availability,
        technicalTalkingPoint: tailored.technicalTalkingPoint,
        recruiterDM: tailored.recruiterDM,
        followUpMessage: tailored.followUpMessage,
        interviewPrepTalkingPoint: tailored.interviewPrepTalkingPoint,
        claimSafetyNotes: tailored.claimSafetyNotes,
      };
      whyThisRole = tailored.whyThisRole;
      aiMeta = { provider: tailored.aiProvider, model: tailored.aiModel };
      interviewPrepAddon = tailored.interviewPrepAddon;
    }
  }

  const applicationTextFinal = applicationText;

  const jobLinkValue = typeof jobLink === "string" ? jobLink.trim() : "";
  if (!jobLinkValue) {
    return { generated: false, reason: "Missing job link in meta.json" };
  }

  const packText = formatApplicationPack({
    jobCompany,
    jobRole,
    jobLink: jobLinkValue,
    fitScore: scoreState.fit.score0to10,
    riskFlags: scoreState.fit.riskFlags,
    candidate: candidateProfile,
    proofProjectText,
    formAnswers,
    application100: applicationTextFinal.application100,
    application50: applicationTextFinal.application50,
    salaryAnswer: applicationTextFinal.salaryAnswer,
    availabilityAnswer: applicationTextFinal.availabilityAnswer,
    technicalTalkingPoint: applicationTextFinal.technicalTalkingPoint,
    recruiterDM: applicationTextFinal.recruiterDM,
    followUpMessage: applicationTextFinal.followUpMessage,
    interviewPrepTalkingPoint: applicationTextFinal.interviewPrepTalkingPoint,
    claimSafetyNotes: applicationTextFinal.claimSafetyNotes,
    whyThisRole,
    aiMeta,
  });

  const guard = validateGeneratedText({
    text: packText,
    email: candidateProfile.email,
    expectedEmail: candidateProfile.email,
  });

  if (!guard.ok) {
    return { generated: false, reason: `Truth-guard failed: ${guard.problems.join("; ")}` };
  }

  safeWrite(applicationPackPath(jobDir), packText);

  const desiredSalaryForForm = salaryExpectation;
  const startDateForForm = availability;
  const pasteTextWithForm = `[full_name]\n${candidateProfile.fullName}\n\n[email]\n${candidateProfile.email}\n\n[phone]\n${candidateProfile.phone}\n\n[current_location]\n${candidateProfile.location}\n\n[current_company]\n${candidateProfile.currentCompany}\n\n[linkedin]\n${candidateProfile.linkedin}\n\n[github]\n${candidateProfile.github}\n\n[portfolio]\n${candidateProfile.portfolio}\n\n[desired_salary]\n${desiredSalaryForForm}\n\n[start_date]\n${startDateForForm}\n\n[application_100]\n${applicationTextFinal.application100}\n\n[application_50]\n${applicationTextFinal.application50}\n\n[technical_talking_point]\n${applicationTextFinal.technicalTalkingPoint}\n\n[recruiter_dm]\n${applicationTextFinal.recruiterDM}\n\n[follow_up_message]\n${applicationTextFinal.followUpMessage}\n\n[interview_prep_talking_point]\n${applicationTextFinal.interviewPrepTalkingPoint}\n`;
  safeWrite(pasteBankPath(jobDir), pasteTextWithForm);

  safeWrite(followUpsPath(jobDir), buildFollowUps(jobCompany, jobRole));

  const baseInterview = buildInterviewPrep(jobRole, proofProject.name);
  safeWrite(
    interviewPrepPath(jobDir),
    interviewPrepAddon
      ? `${baseInterview}\n\n## Job-specific prep (AI)\n${interviewPrepAddon}`
      : baseInterview
  );

  return { generated: true };
}

function buildDashboard() {
  const entries = exists(JOBS_DIR) ? fs.readdirSync(JOBS_DIR) : [];
  const rows: string[] = [];
  rows.push(`# Job Cannon Dashboard`);
  rows.push(``);
  rows.push(`Found jobs: ${entries.length}`);
  rows.push(``);
  rows.push(`| Company | Role | Decision | Score | Next action | Files |`);
  rows.push(`|---|---|---|---:|---|---|`);

  for (const slug of entries) {
    const jobDir = path.join(JOBS_DIR, slug);
    const metaPath = path.join(jobDir, "meta.json");
    const scoreP = scoreFile(jobDir);
    if (!exists(metaPath) || !exists(scoreP)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as JobMeta;
    const scoreState = JSON.parse(fs.readFileSync(scoreP, "utf8")) as ScoreState;
    const generatedDir = path.join(jobDir, "generated");

    const files = exists(generatedDir) ? fs.readdirSync(generatedDir) : [];
    const hasPack = files.some((f) => f.toLowerCase().includes("applicationpack"));
    const hasPaste = files.some((f) => f.toLowerCase().includes("pastebank"));

    const nextAction = scoreState.fit.applyDecision === "APPLY" ? (hasPack && hasPaste ? "Paste + submit manually" : "Run job:pack") : "Skip / review later";

    rows.push(`| ${meta.jobCompany} | ${meta.jobRole} | ${scoreState.fit.applyDecision} | ${scoreState.fit.score0to10} | ${nextAction} | ${files.join(", ")} |`);
  }

  safeWrite(path.join(__dirname, "dashboard.md"), rows.join("\n"));
}

function createPasteBankBundle() {
  const entries = exists(JOBS_DIR) ? fs.readdirSync(JOBS_DIR) : [];
  const parts: string[] = [];
  for (const slug of entries) {
    const jobDir = path.join(JOBS_DIR, slug);
    const p = pasteBankPath(jobDir);
    if (!exists(p)) continue;
    parts.push(`===== ${slug} =====\n` + fs.readFileSync(p, "utf8"));
  }
  if (!parts.length) return;
  safeWrite(path.join(__dirname, "PasteBank_All.txt"), parts.join("\n\n"));
}

async function jobPack(slug?: string) {
  const entries = exists(JOBS_DIR) ? fs.readdirSync(JOBS_DIR) : [];
  const targets = slug ? [slug] : entries;
  for (const s of targets) {
    const jobDir = path.join(JOBS_DIR, s);
    if (!exists(jobDir)) continue;
    if (!exists(path.join(jobDir, "job.md"))) continue;
    await generateForJob(jobDir);
  }
  createPasteBankBundle();
  buildDashboard();
}

function listJobs() {
  const entries = exists(JOBS_DIR) ? fs.readdirSync(JOBS_DIR) : [];
  console.log(`Job Cannon: ${entries.length} jobs found (some may be missing score/meta).`);
  for (const slug of entries) {
    const jobDir = path.join(JOBS_DIR, slug);
    const metaP = path.join(jobDir, "meta.json");
    const scoreP = scoreFile(jobDir);
    if (!exists(metaP)) continue;
    const meta = JSON.parse(fs.readFileSync(metaP, "utf8")) as JobMeta;
    const scoreState = exists(scoreP) ? (JSON.parse(fs.readFileSync(scoreP, "utf8")) as ScoreState) : null;
    console.log(
      `- ${slug}: ${meta.jobCompany} | ${meta.jobRole} | ${scoreState ? `${scoreState.fit.applyDecision} (${scoreState.fit.score0to10}/10)` : "not scored"}`
    );
  }
}

async function jobSeed() {
  ensureDir(JOBS_DIR);
  const seeds: Array<{ slug: string; company: string; role: string; jobLink?: string; text: string }> = [
    {
      slug: "blackbirdlab-junior-frontend-engineer",
      company: "Blackbird Lab",
      role: "Junior Frontend Engineer",
      jobLink: "https://viumavaga.com.br/conecta/oportunidade/junior-frontend-engineer-remote-latam-0f2a40c7f6256f7b9d9345d08cd990a4/",
      text:
        "PLACEHOLDER seed job text (not full source). Role: Junior Frontend Engineer, Remote LATAM. Mentions React, TypeScript, Tailwind, GraphQL advantages; English upper-intermediate; component-driven UI.",
    },
    {
      slug: "bluelight-react-engineer",
      company: "Bluelight Consulting",
      role: "React Engineer (Remote, Latin America)",
      jobLink: "https://jobs.lever.co/bluelightconsulting/8a814b05-5ef0-428f-8022-037205ae9014",
      text:
        "PLACEHOLDER seed job text (not full source). Role: React Engineer. Requires 3+ years React/prof dev; large/complex systems; degree required; extreme ownership; CI/CD; Remote LATAM; English required.",
    },
    {
      slug: "zensors-frontend-web-developer",
      company: "Zensors",
      role: "Frontend Web Developer (React/Typescript)",
      jobLink: "https://careers.zensors.com/jobs/Qc_VY1AEfbC5/frontend-web-developer-react-typescript-remote",
      text:
        "PLACEHOLDER seed job text (not full source). Role: Frontend Web Developer, Remote Internship listing. Requires React SPA experience, responsive CSS, Git, component-driven development; mentions Data structures & Algorithms; Node/Docker/Postgres a plus.",
    },
  ];

  for (const s of seeds) {
    const jobDir = path.join(JOBS_DIR, s.slug);
    ensureDir(jobDir);
    safeWrite(path.join(jobDir, "job.md"), s.text);
    const meta: JobMeta = {
      source: "seed",
      jobCompany: s.company,
      jobRole: s.role,
      jobLink: s.jobLink,
      createdAtISO: new Date().toISOString(),
    };
    safeWrite(path.join(jobDir, "meta.json"), JSON.stringify(meta, null, 2));
  }
}

async function main() {
  const { positional, out } = parseArgs(process.argv.slice(2));
  const cmd = positional.shift();

  if (!cmd) {
    console.log(
      "Job Cannon CLI. Usage:\n- job:new <url|path|text> [--company X] [--role Y] [--link url]\n- job:discover [keywords] [--import] [--limit N]\n- job:source\n- job:cannon [--force]\n- job:score [--slug slug]\n- job:pack [--slug slug]\n- job:seed\n- job:list\n- cv:pdf\n- job:pdf [--slug slug]"
    );
    return;
  }

  if (cmd === "new") {
    const source = positional[0];
    if (!source) throw new Error("Missing source. Use: job:new <url|path|text> [--company X] [--role Y]");
    const res = await jobNew(source, out);
    console.log(`Created job slug=${res.slug}`);
    return;
  }

  if (cmd === "seed") {
    await jobSeed();
    console.log("Seed jobs created.");
    return;
  }

  if (cmd === "discover") {
    const kwRaw = positional.join(" ").trim();
    const keywords = kwRaw ? kwRaw.split(/[,\s]+/).filter(Boolean) : undefined;
    const doImport = out.import === true || out.import === "true";
    const limit = out.limit ? Number(out.limit) : 25;
    const res = await searchPublicFeeds({ keywords, limit });
    if (doImport) {
      const imp = importDiscoveredJobs(res.jobs.filter((j) => !j.alreadyQueued));
      console.log(`discover: imported=${imp.imported} skipped=${imp.skipped} (feeds: ${JSON.stringify(res.sources)})`);
    } else {
      for (const j of res.jobs) {
        console.log(
          `${String(j.previewFit ?? "?").padStart(2)}/10  ${j.company?.slice(0, 24).padEnd(24)}  ${j.title?.slice(0, 40)}  [${j.source}]`
        );
      }
      console.log(`\ndiscover: ${res.jobs.length} hits — feeds ${JSON.stringify(res.sources)}`);
      console.log("Tip: add --import to queue matches");
    }
    return;
  }

  if (cmd === "source") {
    const res = await runJobSource();
    console.log(
      `job:source done. parsed=${res.parsed} inserted=${res.inserted} updated=${res.updated} skipped=${res.skipped}`
    );
    return;
  }

  if (cmd === "cannon") {
    const force = out.force === true || out.force === "true";
    const res = await runJobCannon(generateForJob, { force });
    buildDashboard();
    console.log(`job:cannon done. packed=${res.packed} ranked=${res.ranked} queue=${res.queueSize}`);
    return;
  }

  if (cmd === "cv:pdf") {
    const res = await exportCvPdf();
    console.log(`cv:pdf ${res.wrote ? "wrote" : "skipped"}: ${res.pdfPath}`);
    return;
  }

  if (cmd === "job:pdf") {
    const slug = typeof out.slug === "string" ? out.slug : undefined;
    const entries = exists(JOBS_DIR) ? fs.readdirSync(JOBS_DIR) : [];
    const targets = slug ? [slug] : entries;

    let wrote = 0;
    for (const s of targets) {
      const jobDir = path.join(JOBS_DIR, s);
      if (!exists(jobDir)) continue;
      const r = await exportJobPdf({ jobDir });
      if (r.wrote) wrote++;
    }

    console.log(`job:pdf done. Wrote ${wrote} pdf(s).`);
    return;
  }

  if (cmd === "list") {
    listJobs();
    return;
  }

  if (cmd === "score") {
    const slug = typeof out.slug === "string" ? out.slug : undefined;
    await jobScore(slug);
    console.log("Scored.");
    return;
  }

  if (cmd === "pack") {
    const slug = typeof out.slug === "string" ? out.slug : undefined;
    await jobPack(slug);
    console.log("Packed. See generated files + PasteBank_All.txt.");
    return;
  }

  console.log(`Unknown cmd: ${cmd}`);
}

export { generateForJob };

const isCliEntry =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("cli.ts") || process.argv[1].endsWith("cli.js"));

if (isCliEntry) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

