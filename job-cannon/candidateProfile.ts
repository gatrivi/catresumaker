export type CandidateProfile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  currentCompany: string;
  desiredSalary: string;
  desiredSalaryIfForcedNumber: string;
  startTiming: string;
  proofProjects: Array<{
    id: string;
    name: string;
    github?: string;
    url?: string;
    description: string;
  }>;
};

export const candidateProfile: CandidateProfile = {
  fullName: "Gastón Alejandro Trivi",
  email: "gatrivi@gmail.com",
  phone: "+54 9 11 5619 9363",
  location: "Olivos, Buenos Aires, Argentina",
  linkedin: "https://linkedin.com/in/gatrivi",
  github: "https://github.com/gatrivi",
  portfolio: "https://devtrivi.zengasoft.com",
  currentCompany: "Independent React Developer / Freelance Contractor",
  desiredSalary: "USD 36,000–42,000 / year, flexible depending on scope and benefits",
  desiredSalaryIfForcedNumber: "USD 36,000 / year",
  startTiming: "Available to start within 2 weeks; open to an earlier start if useful.",
  proofProjects: [
    {
      id: "catintassist",
      name: "CatIntAssist",
      github: "https://github.com/gatrivi/catintassist",
      description:
        "React workstation for bilingual medical interpretation workflows, built for reliability under real-time usage and frequent updates.",
    },
    {
      id: "catreader",
      name: "CatReader",
      github: "https://github.com/gatrivi/catreader",
      description:
        "React/Vite document reader experience with persistence/sync and data-heavy UI behavior (PDF/TXT reading + enrichment flows).",
    },
    {
      id: "tmmstore",
      name: "Tmm Store",
      github: "https://github.com/gatrivi/Tmm-store",
      description:
        "SMB React ordering flow: menu/cart/checkout UX plus operational admin patterns (real product-style frontend).",
    },
  ],
};

export const forbiddenEmailDomains = ["gatrivi.dev@gmail.com"];

