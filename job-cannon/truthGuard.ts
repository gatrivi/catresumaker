const bannedEmailDomains = ["gatrivi.dev@gmail.com"];

export type TruthGuardReport = {
  ok: boolean;
  problems: string[];
};

function containsAny(text: string, needles: string[]): boolean {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

export function validateGeneratedText(params: {
  text: string;
  email: string;
  expectedEmail: string;
}): TruthGuardReport {
  const problems: string[] = [];
  const { text, email, expectedEmail } = params;

  if (
    containsAny(text, [
      "expert",
      "world-class",
      "top-tier",
      "leverage",
      "excited to",
      "i am excited",
      "rockstar",
      "ninja",
      "guru",
      "10x",
    ])
  ) {
    problems.push("AI-ish/hype language detected.");
  }

  // Avoid claiming years or senior levels we don't have.
  if (/\b\d+\s*\+?\s*years\b/i.test(text) || /\b\d+\s*-\s*\d+\s*years\b/i.test(text)) {
    problems.push("Mentions years of experience.");
  }

  if (containsAny(text, ["senior engineer", "principal", "staff", "lead"])) {
    // We can still apply if job is senior; but we should not claim title as our own.
    problems.push("Contains seniority title claims.");
  }

  if (email !== expectedEmail) {
    problems.push("Email mismatch (forbidden or different domain).");
  }

  if (containsAny(text, bannedEmailDomains)) {
    problems.push("Forbidden email domain mentioned.");
  }

  // Dead/placeholder links and empty URLs.
  if (
    containsAny(text, ["example.com", "your-link", "todo", "todo:", "[todo]", "(none)", "(job link not provided)", "job link not provided"])
  ) {
    problems.push("Dead/placeholder link markers detected.");
  }

  // Detect empty markdown links: [text]()
  if (/\]\(\s*\)/.test(text)) {
    problems.push("Empty URL in markdown link detected.");
  }

  // Detect empty parentheses that look like placeholders.
  // (Avoid broad matching; empty URLs are already caught by markdown-link emptiness + placeholder markers.)

  return { ok: problems.length === 0, problems };
}

