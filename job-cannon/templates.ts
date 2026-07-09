import { CandidateProfile } from "./candidateProfile";

export function formatApplicationPack(params: {
  jobCompany: string;
  jobRole: string;
  jobLink: string;
  fitScore: number;
  riskFlags: string[];
  candidate: CandidateProfile;
  proofProjectText: { projectName: string; projectLink?: string; explanation: string };
  formAnswers: Record<string, string>;
  application100: string;
  application50: string;
  salaryAnswer: string;
  availabilityAnswer: string;
  technicalTalkingPoint: string;
  recruiterDM: string;
  followUpMessage: string;
  interviewPrepTalkingPoint: string;
  claimSafetyNotes: string[];
  whyThisRole?: string;
  aiMeta?: { provider: string; model: string };
}) {
  const {
    jobCompany,
    jobRole,
    jobLink,
    fitScore,
    riskFlags,
    candidate,
    proofProjectText,
    formAnswers,
    application100,
    application50,
    salaryAnswer,
    availabilityAnswer,
    technicalTalkingPoint,
    recruiterDM,
    followUpMessage,
    interviewPrepTalkingPoint,
    claimSafetyNotes,
    whyThisRole,
    aiMeta,
  } = params;

  const formSection = Object.entries(formAnswers)
    .map(([k, v]) => `${k}\n${v}`)
    .join("\n\n");

  return `# ApplicationPack — ${jobCompany} | ${jobRole}

Job link:
${jobLink}

Fit score:
${fitScore}/10

Risk flags:
${riskFlags.length ? riskFlags.map((r) => `- ${r}`).join("\n") : "- none"}

---

## 1) Application (100 words)
${application100}

---

## 2) Application (50 words)
${application50}

---

## 3) Form answers (copy/paste)
${formSection}

---

## 4) Salary answer
${salaryAnswer}

---

## 5) Availability answer
${availabilityAnswer}

---

## 6) Project to show
${proofProjectText.projectName}

Explanation:
${proofProjectText.explanation}
${proofProjectText.projectLink ? `\nProject link:\n${proofProjectText.projectLink}` : ""}

---

## 7) Technical talking point (interview)
${technicalTalkingPoint}

---

## 8) Recruiter DM (copy/paste)
${recruiterDM}

---

## 9) Follow-up message (copy/paste)
${followUpMessage}

---

## 10) Interview prep talking point
${interviewPrepTalkingPoint}

---

${whyThisRole ? `## 11) Why this role\n${whyThisRole}\n\n---\n\n` : ""}## ${whyThisRole ? "12" : "11"} Claim-safety check notes
${claimSafetyNotes.length ? claimSafetyNotes.map((n) => `- ${n}`).join("\n") : "- none"}
${aiMeta ? `\n\n---\n\n_AI: ${aiMeta.provider} / ${aiMeta.model}_` : ""}
`;
}

