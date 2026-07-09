import { clamp } from "./utils";

export type FitResult = {
  score0to10: number;
  applyDecision: "APPLY" | "MAYBE" | "SKIP";
  reasons: string[];
  riskFlags: string[];
};

const hasAny = (haystack: string, needles: string[]): boolean => {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
};

export function scoreJobFit(jobText: string): FitResult {
  const t = jobText.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  const riskFlags: string[] = [];

  // 1) React/TS/Vite match
  if (hasAny(t, ["react"])) {
    score += 3;
    reasons.push("React mentioned");
  }
  if (hasAny(t, ["typescript", "type script", "ts"])) {
    score += 2;
    reasons.push("TypeScript mentioned");
  }
  if (hasAny(t, ["tailwind"])) {
    score += 1;
    reasons.push("Tailwind mentioned");
  }
  if (hasAny(t, ["vite"])) {
    score += 1;
    reasons.push("Vite mentioned");
  }

  // 2) Junior/semi realism
  const isSenior =
    hasAny(t, ["senior", "principal", "staff", "lead"]) ||
    /\b(10\+|8\+|7\+)\s*years\b/i.test(jobText);
  const mentionsJunior =
    hasAny(t, ["junior", "entry", "entry-level", "mid level", "intern"]) ||
    /\b(0-?1|1-?2)\s*\+?\s*years\b/i.test(jobText);
  if (mentionsJunior) {
    score += 2;
    reasons.push("Junior/entry language present");
  }
  if (isSenior) {
    score -= 2;
    riskFlags.push("senior-only phrasing");
    reasons.push("senior/lead language present (risk)");
  }

  // 3) Remote/LATAM compatibility
  if (hasAny(t, ["remote", "fully remote"])) {
    score += 1;
    reasons.push("Remote mentioned");
  }
  if (hasAny(t, ["latam", "latin america", "argentina", "buenos aires", "remote-latam"])) {
    score += 1;
    reasons.push("LATAM/Argentina language present");
  }

  // 4) English requirement
  if (hasAny(t, ["english", "fluent", "c1", "c2", "b2"])) {
    score += 1;
    reasons.push("English requirement mentioned");
  }

  // 5) API/dashboard/product relevance
  if (hasAny(t, ["api", "rest", "graphql", "integration"])) {
    score += 2;
    reasons.push("API/integration mentioned");
  }
  if (hasAny(t, ["dashboard", "ui", "product", "frontend", "application"])) {
    score += 1;
    reasons.push("frontend/product language present");
  }

  // 6) Risk flags
  if (hasAny(t, ["degree is required", "four-year college", "bachelor", "degree required"])) {
    score -= 2;
    riskFlags.push("degree hard requirement");
  }
  if (hasAny(t, ["unpaid test", "test"],) && hasAny(t, ["unpaid"])) {
    score -= 1;
    riskFlags.push("unpaid test risk");
  }
  if (hasAny(t, ["crypto", "gambling", "weird", "casino"])) {
    score -= 2;
    riskFlags.push("crypto/gambling/weirdness");
  }

  score = clamp(score, 0, 10);

  const seniorOnlyRisk = isSenior && !mentionsJunior;

  let applyDecision: FitResult["applyDecision"] = "SKIP";
  if (score >= 7 && !seniorOnlyRisk) applyDecision = "APPLY";
  else if (score >= 5) applyDecision = "MAYBE";

  return {
    score0to10: score,
    applyDecision,
    reasons,
    riskFlags,
  };
}

