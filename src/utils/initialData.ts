import { ResumeData } from "../types.ts";

export const SAMPLE_RESUME: ResumeData = {
  id: "profile-1",
  label: "ATS Resume (Local Defaults)",
  updatedAt: new Date().toISOString(),
  personalInfo: {
    name: "Gaston Alejandro Trivi",
    title: "React Developer · Medical Interpreter · Production-Shipper",
    email: "gatrivi.dev@gmail.com",
    phone: "+54 11 5619-9363",
    website: "devtrivi.gatrivi.com",
    location: "Olivos, Buenos Aires",
    summary:
      "I already knew how to build — this app taught me I could be responsible for production. Skilled React developer and seasoned medical interpreter who builds production-hardened applications. Creator of CatIntAssist, a real-time interpreter workspace utilized daily to earn a living; this forced a ruthless prioritization of stability, speed, and zero-downtime deployments. Adept at integrating AI APIs, local LLMs, and robust backend services into highly optimized, fault-tolerant user interfaces. Open for full-stack or frontend roles where reliability matters and downtime is not an option."
  },
  education: [
    {
      id: "edu-1",
      institution: "Plataforma 5",
      degree: "Full Stack Web Development Bootcamp",
      location: "",
      dates: "03/2021 – 05/2021",
      description: "Intensive 700+ hour program covering modern PERN stack application development."
    }
  ],
  experience: [
    {
      id: "exp-1",
      company: "CatIntAssist",
      title: "Founding Developer & End User",
      location: "",
      dates: "2024 — Present",
      bullets: [
        "Production Engineering: Built and shipped a real-time medical interpreter dashboard used daily in live clinical sessions. Acted as both developer and primary user, resulting in a product where downtime equals lost income.",
        'Zero-Downtime Deployments: Developed a "safe deploy" workflow utilizing small atomic changes and instant rollback plans, achieving zero breaking releases in 12+ months.',
        "Incident Response & API Management: Handled full-stack incident response—from transcription dropouts to translation fallback cascades—without a dedicated ops team. Managed API costs and rate limits (Deepgram, Google Translate) in a strict budget-constrained environment.",
        "UX Iteration: Debugged under pressure during active interpreting calls, building deep intuition for which bugs are merely cosmetic versus session-fatal."
      ],
      current: true
    },
    {
      id: "exp-2",
      company: "Zengasoft",
      title: "Web & React Developer",
      location: "",
      dates: "03/2023 – Present",
      bullets: [
        "Frontend Development: Developed advanced medical intake forms and questionnaires to streamline data collection, improve insights, and prevent errors using React dynamic conditional logic.",
        "Architecture & Security: Architected HIPAA-compliant data infrastructure and reporting for private medical data.",
        "Optimization: Migrated websites to optimized hosting platforms and configured CI/CD pipelines, reducing page load times by up to 40%."
      ],
      current: true
    },
    {
      id: "exp-3",
      company: "Freelance / Contract",
      title: "Medical Interpreter",
      location: "",
      dates: "2020 — Present",
      bullets: [
        "Domain Expertise: Provided bilingual medical interpretation in high-acuity clinical settings. Deep familiarity with medical terminology, HIPAA-adjacent workflows, and the cognitive load of simultaneous interpretation.",
        "Workflow Optimization: Leveraged firsthand experience with industry pain points (juggling tabs, tracking billable minutes, verifying translations under time pressure) to directly shape the product requirements for CatIntAssist."
      ],
      current: true
    },
    {
      id: "exp-4",
      company: "Preply",
      title: "Javascript Tutor",
      location: "",
      dates: "10/2022 – Present",
      bullets: [
        "Mentorship: Coached students through advanced JS bootcamps, successfully supporting them in securing professional developer roles."
      ],
      current: true
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "CatIntAssist",
      description:
        "AI-powered medical interpreter workspace — real-time transcription, translation, and productivity dashboard built by an interpreter, for interpreters. Features dual-language parallel streams with no lag on speaker switch, side-by-side suggested translation, and live earnings/break tracking. Includes mission-critical tooling: auto hold timers, number protectors with post-call HIPAA purges, a live word-count guard for relay compliance, and an algorithm that suppresses duplicate phrases from fast transcription.",
      technologies: ["React 19", "TypeScript", "Node.js", "Express", "Gemini API"],
      bullets: [],
      url: "https://catintassist.gatrivi.com"
    },
    {
      id: "proj-2",
      name: "Tmm Store",
      description:
        "Zero-backend WhatsApp ordering SPA for SMBs. A white-label ordering system for small food businesses featuring a digital menu, cart, multi-step checkout, WhatsApp dispatch, and MercadoPago integration. Operates with a zero-backend architecture via a branded admin dashboard with SHA-256 auth.",
      technologies: ["React", "WhatsApp", "MercadoPago", "Stripe (if used)"],
      bullets: [],
      url: "https://github.com/gatrivi/Tmm-store"
    },
    {
      id: "proj-3",
      name: "Cathedral",
      description:
        "AI-augmented liturgical prayer companion. An immersive, always-on Divine Office app that auto-generates prayers and audio for each canonical hour using Google GenAI and Piper TTS. Features ambient soundscapes, focus mode, and sacred art backgrounds.",
      technologies: ["React", "Google GenAI", "Piper TTS"],
      bullets: [],
      url: "https://cathedral.gatrivi.com"
    },
    {
      id: "proj-4",
      name: "CatReader",
      description:
        "Cross-device PDF & TXT reader with zero-auth sync. An industry-standard e-reader syncing progress across devices without login via kvdb.io. Features AI-powered library enrichment via Gemini OCR, Google Drive integration, and static site generation.",
      technologies: ["React", "kvdb.io", "Gemini OCR", "Google Drive"],
      bullets: [],
      url: "https://github.com/gatrivi/catreader"
    },
    {
      id: "proj-5",
      name: "Rosario Cards",
      description:
        "Digital rosary with interactive beads and sacred art. A contemplative web app featuring an interactive bead counter, guided mysteries, and Framer Motion animations, optimized with an offline airplane mode.",
      technologies: ["React", "Framer Motion"],
      bullets: [],
      url: "https://rosario.gatrivi.com"
    },
    {
      id: "proj-6",
      name: "Catpholio1",
      description:
        "Multi-route developer portfolio engine. A multi-route React 19 SPA that showcases projects, runs a product store, and hosts a white-label restaurant landing page in one deployable package with animated route transitions.",
      technologies: ["React 19", "TypeScript"],
      bullets: [],
      url: "https://devtrivi.gatrivi.com"
    }
  ],
  skills: [
    {
      id: "skill-1",
      category: "Frontend",
      items: ["React 19", "TypeScript", "Vite 6", "Tailwind CSS v4", "Framer Motion", "HTML5/CSS3"]
    },
    {
      id: "skill-2",
      category: "Backend & APIs",
      items: ["Node.js", "REST APIs", "Deepgram", "Google Translate", "Gemini API", "Vercel Functions"]
    },
    {
      id: "skill-3",
      category: "Tools & Platforms",
      items: ["Git", "Vercel", "Netlify", "kvdb.io", "idb-keyval", "CI/CD"]
    },
    {
      id: "skill-4",
      category: "Design & UI",
      items: ["UI/UX", "Responsive Design", "Glassmorphism", "Dark Mode"]
    },
    {
      id: "skill-5",
      category: "Advanced Engineering & AI Workflows",
      items: [
        "Mobile-to-Desktop Remote Architecture: Tailscale for encrypted tunneling and Termius via SSH to manage CLI-based AI agents (Kimi, Gemini).",
        "Native Mobile Linux Environments: Termux to run AI coding assistants natively on Android.",
        "Local AI & LLM Deployment: Ollama + LM Studio with open-weight LLMs (Qwen Coder), optimizing VRAM usage on a 16GB AMD RX 6600.",
        "WSL Audio Synthesis: Piper-TTS / Omnivoice via WSL for ultra-low latency synthesized audio pipelines."
      ]
    }
  ],
  languages: [],
  certifications: []
};

// Simple templates
export const TEMPLATES = [
  { id: "ats-classic", name: "ATS Classic", description: "Standard, clean single-column structure optimized to score maximum readability on screening bots." },
  { id: "modern-serif", name: "Modern Editorial", description: "Elegant serif display headers and spacious columns for a polished editorial layout." },
  { id: "clean-minimal", name: "Slate Minimal", description: "Contemporary layout with subtle slate accents, minimalist divider lines, and balanced geometry." },
  { id: "tech-mono", name: "Terminal Mono", description: "Technical, monospace layout featuring brutalist structural borders, perfect for engineers." }
];
