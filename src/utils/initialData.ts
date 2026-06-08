import { ResumeData } from "../types.ts";

export const SAMPLE_RESUME: ResumeData = {
  id: "profile-1",
  label: "Software Engineer Profile",
  updatedAt: new Date().toISOString(),
  personalInfo: {
    name: "Gaston Alejandro Trivi",
    title: "React Developer · Medical Interpreter · Production-Shipper",
    email: "gatrivi.dev@gmail.com",
    phone: "+54 11 5619-9363",
    website: "https://devtrivi.gatrivi.com",
    location: "Olivos, Buenos Aires",
    summary:
      "I already knew how to build — this app taught me I could be responsible for production. Skilled React developer and seasoned medical interpreter who builds production-hardened applications. Experienced integrating AI APIs and backend services into fast, reliable user interfaces."
  },
  education: [
    {
      id: "edu-1",
      institution: "Plataforma 5",
      degree: "Full Stack Web Development Bootcamp",
      location: "Argentina",
      dates: "03/2021 – 05/2021",
      description: "Intensive 700+ hour program covering modern PERN stack application development."
    }
  ],
  experience: [
    {
      id: "exp-1",
      company: "CatIntAssist (Self-built Production Tool)",
      title: "Founding Developer & End User",
      location: "Olivos, Buenos Aires",
      dates: "2024 - Present",
      bullets: [
        "Built and shipped a real-time medical interpreter dashboard used daily in live clinical sessions; downtime equals lost income.",
        "Designed a safe deploy workflow with atomic changes and rollback plans to prevent breaking releases (zero broken releases in 12+ months).",
        "Handled full-stack incident response across transcription + translation flows; managed API costs and rate limits in a budget-constrained environment.",
        "Iterated UX under pressure by distinguishing cosmetic bugs from session-fatal failures during active interpreting calls."
      ],
      current: true
    },
    {
      id: "exp-2",
      company: "Zengasoft",
      title: "Web & React Developer",
      location: "Argentina",
      dates: "03/2023 – Present",
      bullets: [
        "Developed advanced medical intake forms and questionnaires with React conditional logic to reduce input errors and improve insights.",
        "Architected HIPAA-compliant infrastructure and reporting for private medical data.",
        "Migrated websites to optimized hosting platforms and configured CI/CD pipelines, reducing page load times by up to 40%."
      ],
      current: false
    },
    {
      id: "exp-3",
      company: "Freelance / Contract",
      title: "Medical Interpreter",
      location: "Argentina",
      dates: "2020 — Present",
      bullets: [
        "Provided bilingual medical interpretation in high-acuity clinical settings; familiar with medical terminology and HIPAA-adjacent workflows.",
        "Optimized workflows that directly shaped product requirements for CatIntAssist."
      ],
      current: true
    },
    {
      id: "exp-4",
      company: "Preply",
      title: "Javascript Tutor",
      location: "Argentina",
      dates: "10/2022 – Present",
      bullets: [
        "Mentored students through advanced JS bootcamps and helped them secure professional developer roles.",
        "Focused on practical, production-minded debugging and code quality under real constraints."
      ],
      current: true
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "CatIntAssist",
      description:
        "AI-powered medical interpreter workspace — real-time transcription/translation plus productivity tooling used in daily clinical sessions (dual-language streaming and suggested translations).",
      technologies: ["React", "TypeScript", "Node.js", "Express", "Gemini API", "Tailwind CSS"],
      bullets: [
        "Implemented mission-critical tooling: auto-hold timers, number protection with post-call HIPAA purges, and duplicate-suppression logic for fast transcription.",
        "Built backend prompt/schema pipelines to enforce structured JSON outputs for resume-ready ATS rendering."
      ],
      url: "https://catintassist.gatrivi.com"
    },
    {
      id: "proj-2",
      name: "Tmm Store",
      description: "Zero-backend WhatsApp ordering SPA for SMBs with a branded admin dashboard and payment integration.",
      technologies: ["React", "WhatsApp", "Stripe", "MercadoPago"],
      bullets: [
        "Built multi-step checkout flow and WhatsApp dispatch to streamline customer ordering.",
        "Created a white-label admin experience with secure, SHA-256 auth (no dedicated backend)."
      ],
      url: "https://github.com/gatrivi/Tmm-store"
    },
    {
      id: "proj-3",
      name: "Cathedral",
      description: "AI-augmented liturgical prayer companion that generates prayers and audio for each canonical hour.",
      technologies: ["React", "Gemini API", "Piper TTS"],
      bullets: [
        "Implemented always-on prayer generation with focus-mode UX and ambient experiences.",
        "Designed prompt + schema flows for consistent content structuring and audio output."
      ],
      url: "https://cathedral.gatrivi.com"
    },
    {
      id: "proj-4",
      name: "CatReader",
      description: "Cross-device PDF & TXT reader with zero-auth sync and Gemini OCR enrichment.",
      technologies: ["React", "Gemini OCR", "kvdb.io", "Google Drive"],
      bullets: [
        "Built an enrichment pipeline that turns scanned resumes into searchable structured content.",
        "Optimized offline-friendly reading flows to keep documents accessible without login."
      ],
      url: "https://github.com/gatrivi/catreader"
    },
    {
      id: "proj-5",
      name: "Rosario Cards",
      description: "Digital rosary with interactive beads and sacred artwork, optimized for offline airplane mode.",
      technologies: ["React", "Framer Motion"],
      bullets: [
        "Implemented interactive bead counting and guided mysteries with smooth animations.",
        "Added offline mode so the experience works without network connectivity."
      ],
      url: "https://rosario.gatrivi.com"
    },
    {
      id: "proj-6",
      name: "Catpholio1",
      description: "Multi-route React 19 portfolio + store engine with animated route transitions and white-label landing pages.",
      technologies: ["React 19", "TypeScript"],
      bullets: [
        "Built a modular multi-route SPA to host different branded pages in a single deployable package.",
        "Delivered smooth navigation UX optimized for fast perceived performance."
      ],
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
        "Tailscale + SSH remote AI workflows",
        "Local LLM deployment (Ollama / LM Studio)",
        "WSL audio TTS pipelines (Piper / Omnivoice)",
        "Native dev environments on Android (Termux)"
      ]
    }
  ],
  languages: ["Castilian Spanish (Native)", "English (Professional)"],
  certifications: []
};

// Simple templates
export const TEMPLATES = [
  { id: "ats-classic", name: "ATS Classic", description: "Standard, clean single-column structure optimized to score maximum readability on screening bots." },
  { id: "modern-serif", name: "Modern Editorial", description: "Elegant serif display headers and spacious columns for a polished editorial layout." },
  { id: "clean-minimal", name: "Slate Minimal", description: "Contemporary layout with subtle slate accents, minimalist divider lines, and balanced geometry." },
  { id: "tech-mono", name: "Terminal Mono", description: "Technical, monospace layout featuring brutalist structural borders, perfect for engineers." }
];
