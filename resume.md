Gaston Alejandro Trivi
React Developer · Production Reliability · Real-Time AI Tooling
Location: Olivos, Buenos Aires, Argentina
Email: gatrivi.dev@gmail.com | Phone: +54 11 5619-9363
Website: devtrivi.gatrivi.com | LinkedIn: linkedin.com/in/gatrivi | GitHub: github.com/gatrivi

PROFESSIONAL SUMMARY
Production-focused React developer shipping real-time medical tooling and reliability-first frontends. Built CatIntAssist, a daily-used interpreter workspace emphasizing stability, fault-tolerant API orchestration, and zero-downtime release workflows. Comfortable integrating AI services (Deepgram, Gemini/Google APIs, local LLMs via Ollama/LM Studio) into responsive, accessible UIs.

SKILLS
Frontend: React, TypeScript, Vite, Tailwind CSS, Framer Motion, JavaScript, HTML5, CSS3
Backend: Node.js, Express, REST APIs
CI/CD & Infra: Git, GitHub Actions, Vercel, Netlify, Docker, Kubernetes
Reliability: Caching, rate-limit handling, rollback planning, safe deploys, incident response
AI & Audio: Deepgram, Google Translate, Gemini API, Ollama, LM Studio, Piper TTS
Data & Security: kvdb.io, idb-keyval, SHA-256 auth, API hardening
Remote workflow: Tailscale, SSH, AI CLI agents

WORK EXPERIENCE
Founding Developer & End User — CatIntAssist (self-built production tool)
2024 – Present

Shipped a real-time medical interpreter dashboard used daily in live clinical sessions (transcription → translation → operator workflow).
“Zero downtime” mindset: defined session-fatal threshold as app downtime > 3s (interpreters blocked on the line), then designed deploy safeguards and fallbacks around that failure mode.
Safe deploy workflow: rolled features in “baby steps” (~3–4 features/day for ~1.5 months) against a prioritized feature doc; 0 breaking releases over 12+ months.
Deepgram resilience: when auto language detection failed, ran dual transcription streams (ES/EN) and selected the higher-confidence stream; surfaced 3–4 tentative transcriptions during uncertainty so the interpreter always had usable context.
Data cleanup and UX guardrails: de-duplicated identical transcriptions via string comparison; improved pattern detection (e.g., phone numbers) to reduce operator friction.
Cost and incident response: cut token spend with narrow prompts; kept a prompt/config bank for outages, reverted to the latest known-working configuration, and patched production from console-log evidence.

Web & React Developer — Zengasoft
03/2023 – Present

Built advanced medical intake forms with React conditional logic to reduce input friction and improve data quality.
Designed a HIPAA-aligned data/reporting approach for private medical data flows.
Migrated to optimized hosting and CI/CD pipelines, reducing page load times by up to 40%.

Medical Interpreter — Freelance / Contract
2020 – Present

Bilingual interpretation in high-acuity clinical settings; time-critical translation verification workflows shaped CatIntAssist product requirements.

JavaScript Tutor — Preply
10/2022 – Present

Mentored students through advanced JavaScript bootcamps with a production-minded focus on debugging, code quality, and maintainable patterns.

FEATURED PROJECTS
CatIntAssist — catintassist.gatrivi.com
Real-time medical interpreter workspace: streaming transcription/translation, dual-language workflow, session safeguards.

Tmm Store — github.com/gatrivi/Tmm-store
Zero-backend WhatsApp ordering SPA for SMBs: multi-step menu → cart → checkout with MercadoPago dispatch and secure admin auth.

Cathedral — cathedral.gatrivi.com
AI-augmented liturgical prayer companion: always-on Divine Office generator with audio via Google GenAI + Piper TTS.

CatReader — github.com/gatrivi/catreader
Cross-device PDF/TXT reader with zero-auth sync; enrichment pipeline using Gemini OCR and Google Drive.

Rosario Cards — rosario.gatrivi.com
Interactive digital rosary with guided mysteries (Framer Motion), optimized for offline airplane-mode use.

Catpholio1 — github.com/gatrivi/Catpholio1
Multi-route React 19 portfolio engine bundling a product store and white-label landing pages into one deployable package.

EDUCATION
Full Stack Web Development Bootcamp — Plataforma 5
03/2021 – 05/2021 | 700+ hours, modern PERN-stack application development.
