import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type FormAnswers = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  availability: string;
  salaryExpectation: string;
  workAuthorization?: string;
  englishLevel?: string;
  noticePeriod?: string;
  preferredRole?: string;
  summary50?: string;
  summary100?: string;
  recruiterDM?: string;
  [k: string]: unknown;
};

import { getWorkspace } from "../workspace";

function formAnswersPath() {
  return getWorkspace().formAnswersPath;
}

export function loadFormAnswers(): FormAnswers {
  const p = formAnswersPath();
  if (!fs.existsSync(p)) {
    // Default placeholders (no invented private data).
    return {
      fullName: "[PLACEHOLDER]",
      email: "[PLACEHOLDER]",
      phone: "[PLACEHOLDER]",
      location: "[PLACEHOLDER]",
      linkedin: "[PLACEHOLDER]",
      github: "[PLACEHOLDER]",
      portfolio: "[PLACEHOLDER]",
      availability: "[PLACEHOLDER]",
      salaryExpectation: "[PLACEHOLDER]",
    };
  }
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw) as FormAnswers;
  return parsed;
}

