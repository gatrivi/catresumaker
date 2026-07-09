/** Minimal resume.md for AI job tailoring from structured resume JSON. */
export function resumeToMarkdown(resume: {
  personalInfo?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    summary?: string;
  };
  experience?: Array<{ company?: string; title?: string; dates?: string; bullets?: string[] }>;
  skills?: Array<{ category?: string; items?: string[] }>;
  projects?: Array<{ name?: string; description?: string; technologies?: string[] }>;
}): string {
  const p = resume.personalInfo ?? {};
  const lines: string[] = [
    p.name ?? "",
    p.title ?? "",
    [p.email, p.phone, p.location].filter(Boolean).join(" | "),
    p.website ?? "",
    "",
    "SUMMARY",
    p.summary ?? "",
    "",
  ];

  if (resume.experience?.length) {
    lines.push("EXPERIENCE");
    for (const exp of resume.experience) {
      lines.push(`${exp.title ?? ""} — ${exp.company ?? ""} (${exp.dates ?? ""})`);
      for (const b of exp.bullets ?? []) lines.push(`- ${b}`);
      lines.push("");
    }
  }

  if (resume.skills?.length) {
    lines.push("SKILLS");
    for (const s of resume.skills) {
      lines.push(`${s.category ?? ""}: ${(s.items ?? []).join(", ")}`);
    }
    lines.push("");
  }

  if (resume.projects?.length) {
    lines.push("PROJECTS");
    for (const pr of resume.projects) {
      lines.push(`${pr.name ?? ""}: ${pr.description ?? ""}`);
      if (pr.technologies?.length) lines.push(`Tech: ${pr.technologies.join(", ")}`);
    }
  }

  return lines.join("\n").trim() + "\n";
}
