import { loadCandidateProfile } from "../profile/loadCandidateProfile";
import { validateGeneratedText } from "../truthGuard";
import { callLLMChat, getLLMStatus } from "./llmClient";
import { loadResumeContext } from "./loadResumeContext";
import { safeParseJson } from "./safeJson";

export type TailoredApplication = {
  application100: string;
  application50: string;
  technicalTalkingPoint: string;
  recruiterDM: string;
  followUpMessage: string;
  interviewPrepTalkingPoint: string;
  whyThisRole: string;
  interviewPrepAddon: string;
  claimSafetyNotes: string[];
  aiProvider: string;
  aiModel: string;
};

const JSON_SHAPE = `{
  "application100": "string (~100 words, direct cover letter opening)",
  "application50": "string (~50 words, shorter variant)",
  "technicalTalkingPoint": "string (1 concrete React/API/state pattern from proof project)",
  "recruiterDM": "string (short LinkedIn-style DM)",
  "followUpMessage": "string (polite follow-up after applying)",
  "interviewPrepTalkingPoint": "string (one feature to defend end-to-end)",
  "whyThisRole": "string (2-3 sentences, specific to this job)",
  "interviewPrepAddon": "string (markdown: 3 job-specific interview questions + brief prep notes)"
}`;

function buildSystemPrompt(): string {
  const candidateProfile = loadCandidateProfile();
  return `You are a job-application writing assistant for a real React/TypeScript developer.
Output ONLY valid JSON matching this shape (no markdown fences, no commentary):
${JSON_SHAPE}

Hard rules (violations = rejection):
- NEVER invent years of experience or seniority titles (no "senior", "lead", "principal", "staff").
- NEVER use hype/AI clichés: expert, world-class, excited to, leverage, rockstar, ninja, guru, 10x.
- ONLY cite proof projects listed in the candidate context — do not invent employers or products.
- Use email exactly: ${candidateProfile.email}
- Tone: direct, calm, specific — like a skilled developer writing to a hiring manager.
- Mention the chosen proof project with concrete UI/API/reliability details from the job posting.
- English application copy; candidate is bilingual (English fluent, Spanish native) — mention only if relevant.
- Do not claim a college degree unless explicitly in resume context.`;
}

function buildUserPrompt(params: {
  jobCompany: string;
  jobRole: string;
  jobText: string;
  jobLink: string;
  fitScore: number;
  riskFlags: string[];
  proofProjectName: string;
  proofProjectLink?: string;
  proofExplanation: string;
  fixInstructions?: string;
}): string {
  const resumeContext = loadResumeContext();
  return `Tailor application assets for this job.

Company: ${params.jobCompany}
Role: ${params.jobRole}
Job link: ${params.jobLink}
Fit score: ${params.fitScore}/10
Risk flags: ${params.riskFlags.length ? params.riskFlags.join(", ") : "none"}

Primary proof project: ${params.proofProjectName}
${params.proofProjectLink ? `Proof link: ${params.proofProjectLink}` : ""}
Why this proof: ${params.proofExplanation}

Job posting:
"""
${params.jobText.slice(0, 14000)}
"""

Candidate context:
${resumeContext}

${params.fixInstructions ? `Fix these truth-guard problems from prior draft:\n${params.fixInstructions}` : ""}`;
}

function parseTailoredJson(raw: string): Omit<TailoredApplication, "claimSafetyNotes" | "aiProvider" | "aiModel"> {
  const parsed = safeParseJson(raw) as Record<string, unknown>;
  const req = (k: string) => {
    const v = parsed[k];
    if (typeof v !== "string" || !v.trim()) throw new Error(`Missing or invalid field: ${k}`);
    return v.trim();
  };
  return {
    application100: req("application100"),
    application50: req("application50"),
    technicalTalkingPoint: req("technicalTalkingPoint"),
    recruiterDM: req("recruiterDM"),
    followUpMessage: req("followUpMessage"),
    interviewPrepTalkingPoint: req("interviewPrepTalkingPoint"),
    whyThisRole: req("whyThisRole"),
    interviewPrepAddon: req("interviewPrepAddon"),
  };
}

function runTruthGuard(text: string) {
  const candidateProfile = loadCandidateProfile();
  return validateGeneratedText({
    text,
    email: candidateProfile.email,
    expectedEmail: candidateProfile.email,
  });
}

export async function tailorApplicationPack(params: {
  jobCompany: string;
  jobRole: string;
  jobText: string;
  jobLink: string;
  fitScore: number;
  riskFlags: string[];
  proofProjectName: string;
  proofProjectLink?: string;
  proofExplanation: string;
}): Promise<TailoredApplication | null> {
  if (!getLLMStatus().available) return null;

  const system = buildSystemPrompt();
  let fixInstructions: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { content, provider, model } = await callLLMChat(
        system,
        buildUserPrompt({ ...params, fixInstructions }),
        { temperature: 0.35, maxTokens: 4096 }
      );

      const parsed = parseTailoredJson(content);
      const combined =
        parsed.application100 +
        "\n" +
        parsed.application50 +
        "\n" +
        parsed.recruiterDM +
        "\n" +
        parsed.whyThisRole;

      const guard = runTruthGuard(combined);
      const claimSafetyNotes = [
        "AI-tailored draft — review before sending.",
        `Generated via ${provider}/${model}.`,
      ];

      if (!guard.ok) {
        if (attempt === 0) {
          fixInstructions = guard.problems.join("; ");
          continue;
        }
        claimSafetyNotes.push(`Truth-guard warnings: ${guard.problems.join("; ")}`);
      }

      return {
        ...parsed,
        claimSafetyNotes,
        aiProvider: provider,
        aiModel: model,
      };
    } catch {
      if (attempt === 1) return null;
    }
  }

  return null;
}
