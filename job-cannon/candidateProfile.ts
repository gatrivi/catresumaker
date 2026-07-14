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
  email: "devtrivi@zengasoft.com",
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
        "Daily-use React interpreter workstation: live EN↔ES STT, tab/mic/VB-Cable audio routing, reconnect diagnostics, productivity tracking.",
    },
    {
      id: "tmmstore",
      name: "Tmm Store / Trufi",
      github: "https://github.com/gatrivi/Tmm-store",
      description:
        "White-label SMB ordering SPA (Menu/Pedidos/Premium): cart/checkout, WhatsApp, MercadoPago, branded admin.",
    },
    {
      id: "catts",
      name: "CatTS",
      github: "https://github.com/gatrivi/catts",
      description:
        "Local audiobook + voice-clone stack (Kokoro/XTTS, Whisper, Argos): FastAPI jobs, live interpreting TTS, CPU/AMD.",
    },
    {
      id: "rosario",
      name: "Rosario Cards",
      github: "https://github.com/gatrivi/Rosario-cards-v1",
      description:
        "Visual-first digital rosary: interactive bead graph, pinch-zoom, hold-to-charge prayer UX, mobile-first offline.",
    },
    {
      id: "catreader",
      name: "CatReader",
      github: "https://github.com/gatrivi/catreader",
      description:
        "React/Vite document reader experience with persistence/sync and data-heavy UI behavior (PDF/TXT reading + enrichment flows).",
    },
  ],
};

export const forbiddenEmailDomains = ["gatrivi.dev@gmail.com"];

