import fs from "fs";
import { loadCandidateProfile } from "../profile/loadCandidateProfile";
import { getWorkspace } from "../workspace";

export function loadResumeContext(): string {
  const ws = getWorkspace();
  const resumePath = ws.resumeMdPath;
  let resumeText = "";
  if (fs.existsSync(resumePath)) {
    resumeText = fs.readFileSync(resumePath, "utf8").slice(0, 12000);
  }

  const candidateProfile = loadCandidateProfile();
  const proofs = candidateProfile.proofProjects
    .map((p) => `- ${p.name}${p.github ? ` (${p.github})` : ""}: ${p.description}`)
    .join("\n");

  return `Candidate: ${candidateProfile.fullName}
Email (use exactly): ${candidateProfile.email}
Location: ${candidateProfile.location}
LinkedIn: ${candidateProfile.linkedin}
GitHub: ${candidateProfile.github}
Portfolio: ${candidateProfile.portfolio}

Proof projects (only cite these):
${proofs}

Resume excerpt:
${resumeText || "(no resume.md yet — use candidate profile fields)"}`;
}
