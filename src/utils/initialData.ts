import { ResumeData } from "../types.ts";

/** Canonical Jul-2026 CV — sourced from resume.md / RESUME_DEV.html */
export const SAMPLE_RESUME: ResumeData = {
  id: "profile-jul2026",
  label: "Dev CV Jul 2026",
  updatedAt: new Date().toISOString(),
  personalInfo: {
    name: "Gaston Alejandro Trivi",
    title: "React Developer · Production Reliability · Real-Time AI Tooling",
    email: "gatrivi.dev@gmail.com",
    phone: "+54 11 5619-9363",
    website: "devtrivi.gatrivi.com",
    location: "Olivos, Buenos Aires, Argentina",
    summary:
      "Production-focused React developer shipping real-time medical tooling and reliability-first frontends. Built CatIntAssist, a daily-used interpreter workspace emphasizing stability, fault-tolerant API orchestration, and zero-downtime release workflows. Comfortable integrating AI services (Deepgram, Gemini/Google APIs, local LLMs via Ollama/LM Studio) into responsive, accessible UIs."
  },
  education: [
    {
      id: "edu-1",
      institution: "Plataforma 5",
      degree: "Full Stack Web Development Bootcamp",
      location: "",
      dates: "03/2021 – 05/2021",
      description: "700+ hours, modern PERN-stack application development."
    }
  ],
  experience: [
    {
      id: "exp-1",
      company: "CatIntAssist (self-built production tool)",
      title: "Founding Developer & End User",
      location: "Olivos, Buenos Aires · Remote",
      dates: "2024 – Present",
      bullets: [
        "Shipped a real-time medical interpreter dashboard used daily in live clinical sessions (transcription → translation → operator workflow).",
        "“Zero downtime” mindset: defined session-fatal threshold as app downtime > 3s (interpreters blocked on the line), then designed deploy safeguards and fallbacks around that failure mode.",
        "Safe deploy workflow: rolled features in “baby steps” (~3–4 features/day for ~1.5 months) against a prioritized feature doc; 0 breaking releases over 12+ months.",
        "Deepgram resilience: when auto language detection failed, ran dual transcription streams (ES/EN) and selected the higher-confidence stream; surfaced 3–4 tentative transcriptions during uncertainty so the interpreter always had usable context.",
        "Data cleanup and UX guardrails: de-duplicated identical transcriptions via string comparison; improved pattern detection (e.g., phone numbers) to reduce operator friction.",
        "Cost and incident response: cut token spend with narrow prompts; kept a prompt/config bank for outages, reverted to the latest known-working configuration, and patched production from console-log evidence."
      ],
      current: true
    },
    {
      id: "exp-2",
      company: "Zengasoft",
      title: "Web & React Developer",
      location: "Remote",
      dates: "03/2023 – Present",
      bullets: [
        "Built advanced medical intake forms with React conditional logic to reduce input friction and improve data quality.",
        "Designed a HIPAA-aligned data/reporting approach for private medical data flows.",
        "Migrated to optimized hosting and CI/CD pipelines, reducing page load times by up to 40%."
      ],
      current: true
    },
    {
      id: "exp-3",
      company: "Freelance / Contract",
      title: "Medical Interpreter",
      location: "Remote",
      dates: "2020 – Present",
      bullets: [
        "Bilingual interpretation in high-acuity clinical settings; time-critical translation verification workflows shaped CatIntAssist product requirements."
      ],
      current: true
    },
    {
      id: "exp-4",
      company: "Preply",
      title: "JavaScript Tutor",
      location: "Remote",
      dates: "10/2022 – Present",
      bullets: [
        "Mentored students through advanced JavaScript bootcamps with a production-minded focus on debugging, code quality, and maintainable patterns."
      ],
      current: true
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "CatIntAssist",
      description:
        "Real-time medical interpreter workspace: streaming transcription/translation, dual-language workflow, session safeguards.",
      technologies: ["React", "TypeScript", "Node.js", "Deepgram", "Gemini"],
      bullets: [],
      url: "https://catintassist.gatrivi.com"
    },
    {
      id: "proj-2",
      name: "Tmm Store",
      description:
        "Zero-backend WhatsApp ordering SPA for SMBs: multi-step menu → cart → checkout with MercadoPago dispatch and secure admin auth.",
      technologies: ["React", "WhatsApp", "MercadoPago"],
      bullets: [],
      url: "https://github.com/gatrivi/Tmm-store"
    },
    {
      id: "proj-3",
      name: "Cathedral",
      description:
        "AI-augmented liturgical prayer companion: always-on Divine Office generator with audio via Google GenAI + Piper TTS.",
      technologies: ["React", "Google GenAI", "Piper TTS"],
      bullets: [],
      url: "https://cathedral.gatrivi.com"
    },
    {
      id: "proj-4",
      name: "CatReader",
      description:
        "Cross-device PDF/TXT reader with zero-auth sync; enrichment pipeline using Gemini OCR and Google Drive.",
      technologies: ["React", "kvdb.io", "Gemini OCR"],
      bullets: [],
      url: "https://github.com/gatrivi/catreader"
    },
    {
      id: "proj-5",
      name: "Rosario Cards",
      description:
        "Interactive digital rosary with guided mysteries (Framer Motion), optimized for offline airplane-mode use.",
      technologies: ["React", "Framer Motion"],
      bullets: [],
      url: "https://rosario.gatrivi.com"
    },
    {
      id: "proj-6",
      name: "Catpholio1",
      description:
        "Multi-route React 19 portfolio engine bundling a product store and white-label landing pages into one deployable package.",
      technologies: ["React 19", "TypeScript"],
      bullets: [],
      url: "https://github.com/gatrivi/Catpholio1"
    }
  ],
  skills: [
    {
      id: "skill-1",
      category: "Frontend",
      items: ["React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion", "JavaScript", "HTML5", "CSS3"]
    },
    {
      id: "skill-2",
      category: "Backend",
      items: ["Node.js", "Express", "REST APIs"]
    },
    {
      id: "skill-3",
      category: "CI/CD & Infra",
      items: ["Git", "GitHub Actions", "Vercel", "Netlify", "Docker", "Kubernetes"]
    },
    {
      id: "skill-4",
      category: "Reliability",
      items: ["Caching", "rate-limit handling", "rollback planning", "safe deploys", "incident response"]
    },
    {
      id: "skill-5",
      category: "AI & Audio",
      items: ["Deepgram", "Google Translate", "Gemini API", "Ollama", "LM Studio", "Piper TTS"]
    },
    {
      id: "skill-6",
      category: "Data & Security",
      items: ["kvdb.io", "idb-keyval", "SHA-256 auth", "API hardening"]
    },
    {
      id: "skill-7",
      category: "Remote workflow",
      items: ["Tailscale", "SSH", "AI CLI agents"]
    }
  ],
  languages: ["English (C2)", "Spanish (native)"],
  certifications: []
};

export const TEMPLATES = [
  { id: "ats-classic", name: "ATS Classic", description: "Standard, clean single-column structure optimized to score maximum readability on screening bots." },
  { id: "modern-serif", name: "Modern Editorial", description: "Elegant serif display headers and spacious columns for a polished editorial layout." },
  { id: "clean-minimal", name: "Slate Minimal", description: "Contemporary layout with subtle slate accents, minimalist divider lines, and balanced geometry." },
  { id: "tech-mono", name: "Terminal Mono", description: "Technical, monospace layout featuring brutalist structural borders, perfect for engineers." }
];
