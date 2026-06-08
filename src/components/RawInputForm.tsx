import React, { useState } from "react";
import { Sparkles, Loader2, AlertCircle, FileText } from "lucide-react";
import { resources } from "../utils/translations";

interface RawInputFormProps {
  onSuccess: (parsedResumeData: any) => void;
  lang?: 'es' | 'en';
}

export default function RawInputForm({ onSuccess, lang = 'en' }: RawInputFormProps) {
  const t = resources[lang];
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = lang === 'es' ? [
    "Contactando con el analizador de Gemini...",
    "Reconstruyendo el resumen profesional de alto impacto...",
    "Normalizando historiales laborales con verbos del método STAR...",
    "Validating strict ATS categorization rules...",
    "Estructurando la salida limpia del esquema JSON del currículum..."
  ] : [
    "Contacting Gemini Parser...",
    "Reconstructing professional summary...",
    "Normalizing work histories into STAR bullet formats...",
    "Validating strict ATS categorization rules...",
    "Structuring clean resume JSON schema outputs..."
  ];

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setLoading(true);
    setError(null);
    setStepIndex(0);

    // Create a smooth step-progression interval to give feedback
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const response = await fetch("/api/resume/parse-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      const resData = await response.json();
      clearInterval(interval);

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || (lang === 'es' ? "No se pudo analizar el historial. Verifica que la API Key esté configurada." : "Failed to parse career history. Ensure the server is online."));
      }

      // Generate random temporary IDs for our arrays
      const parsed = resData.resume;
      
      const prepareParsedData = {
        ...parsed,
        id: "profile-" + Date.now(),
        label: (lang === 'es' ? "CV Construido por IA - " : "AI Constructed Resume - ") + new Date().toLocaleDateString(),
        updatedAt: new Date().toISOString(),
        education: (parsed.education || []).map((edu: any, i: number) => ({
          ...edu,
          id: `edu-parsed-${i}-${Date.now()}`
        })),
        experience: (parsed.experience || []).map((exp: any, i: number) => ({
          ...exp,
          id: `exp-parsed-${i}-${Date.now()}`
        })),
        projects: (parsed.projects || []).map((proj: any, i: number) => ({
          ...proj,
          id: `proj-parsed-${i}-${Date.now()}`
        })),
        skills: (parsed.skills || []).map((sk: any, i: number) => ({
          ...sk,
          id: `skill-parsed-${i}-${Date.now()}`
        })),
        languages: parsed.languages || [],
        certifications: parsed.certifications || []
      };

      onSuccess(prepareParsedData);
      setRawText("");
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setError(err.message || (lang === 'es' ? "Ocurrió un error de comunicación con el servidor." : "Something went wrong while communicating with the server."));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSamplePaste = () => {
    // Replace the demo text with the user's real CV so the app works even when Gemini is temporarily unavailable.
    setRawText(`## Gaston Alejandro Trivi
**React Developer · Medical Interpreter · Production-Shipper**
📍 Olivos, Buenos Aires | 📧 gatrivi.dev@gmail.com | 📞 +54 11 5619-9363
🌐 devtrivi.gatrivi.com
💼 linkedin.com/in/gatrivi
💻 github.com/gatrivi
---
### Professional Summary
"I already knew how to build — this app taught me I could be responsible for production."
Skilled React developer and seasoned medical interpreter who builds production-hardened applications. Creator of CatIntAssist, a real-time interpreter workspace utilized daily to earn a living; this forced a ruthless prioritization of stability, speed, and zero-downtime deployments. Adept at integrating AI APIs, local LLMs, and robust backend services into highly optimized, fault-tolerant user interfaces.
Open for full-stack or frontend roles where reliability matters and downtime is not an option.
---
### Technical Skills
**Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Framer Motion, HTML5/CSS3  
**Backend & APIs**: Node.js, REST APIs, Deepgram, Google Translate, Gemini API, Vercel Functions  
**Tools & Platforms**: Git, Vercel, Netlify, kvdb.io, idb-keyval, CI/CD  
**Design & UI**: UI/UX, Responsive Design, Glassmorphism, Dark Mode
---
### Work Experience
**Founding Developer & End User** | CatIntAssist (Self-built Production Tool) | 2024 — Present
- Production Engineering: Built and shipped a real-time medical interpreter dashboard used daily in live clinical sessions. Acted as both developer and primary user.
- Zero-Downtime Deployments: Developed a safe deploy workflow with atomic changes and rollback plans, achieving zero breaking releases in 12+ months.
- Incident Response & API Management: Handled full-stack incident response without a dedicated ops team; managed API costs and rate limits.
- UX Iteration: Debugged under pressure during active interpreting calls to identify session-fatal issues.

**Web & React Developer** | Zengasoft | 03/2023 – Present
- Developed advanced medical intake forms and questionnaires with React conditional logic to improve accuracy and insights.
- Architected HIPAA-compliant data infrastructure and reporting for private medical data.
- Migrated websites to optimized hosting platforms and configured CI/CD pipelines, reducing page load times by up to 40%.

**Medical Interpreter** | Freelance / Contract | 2020 — Present
- Provided bilingual medical interpretation in high-acuity clinical settings; familiar with medical terminology and HIPAA-adjacent workflows.
- Optimized workflows that directly shaped the product requirements for CatIntAssist.

**Javascript Tutor** | Preply | 10/2022 – Present
- Mentored students through advanced JS bootcamps and helped them secure professional developer roles.
---
### Featured Projects
- CatIntAssist (catintassist.gatrivi.com): AI-powered medical interpreter workspace (real-time transcription/translation + productivity tooling).
- Tmm Store (GitHub: github.com/gatrivi/Tmm-store): Zero-backend WhatsApp ordering SPA with Stripe/MercadoPago integration.
- Cathedral (cathedral.gatrivi.com): AI-augmented liturgical prayer companion using Gemini + Piper TTS.
- CatReader (GitHub: github.com/gatrivi/catreader): Cross-device PDF/TXT reader with zero-auth sync and Gemini OCR enrichment.
- Rosario Cards (rosario.gatrivi.com): Interactive digital rosary with airplane-mode offline focus.
- Catpholio1 (devtrivi.gatrivi.com | GitHub: github.com/gatrivi/Catpholio1): Multi-route React 19 portfolio/store engine.
---
### Advanced Engineering & AI Workflows
- Mobile-to-Desktop Remote Architecture: Tailscale + Termius/SSH to manage CLI-based AI agents.
- Local AI & LLM Deployment: Ollama + LM Studio with optimized VRAM usage on 16GB RX 6600.
- WSL Audio Synthesis: Piper-TTS / Omnivoice for ultra-low latency TTS pipelines.
-
### Education
**Full Stack Web Development Bootcamp** | Plataforma 5 | 03/2021 – 05/2021
- 700+ hour program covering modern PERN stack application development.`);
  };

  const CONSTANT_IDEAS = [
    t.tip1,
    t.tip2,
    t.tip3
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-tr from-indigo-500 to-sky-500 rounded-lg text-white">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100 text-lg">{t.constructionMatrix}</h3>
          <p className="text-xs text-slate-400">{t.matrixDesc}</p>
        </div>
      </div>

      <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200 flex flex-col gap-1">
        <span className="font-bold">{t.warningOverwritingTitle}</span>
        <span>{t.warningOverwritingDesc}</span>
      </div>

      <form onSubmit={handleIngest} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            {t.rawTextLabel}
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={loading}
            placeholder={t.rawTextPlaceholder}
            className="w-full h-64 p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-slate-950 resize-y font-sans transition-all"
          />
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-900/50 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-bold">{t.parseFailed}</span> {error}
              <p className="mt-1 text-[11px] text-rose-400/80">{t.addApiKeyTip}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            type="button"
            onClick={handleLoadSamplePaste}
            disabled={loading}
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            {t.loadSampleBtn}
          </button>

          <button
            type="submit"
            disabled={loading || !rawText.trim()}
            className="bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 text-white font-medium text-sm px-5 py-2.5 rounded-lg inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-650/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                <span className="animate-pulse">{steps[stepIndex]}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-350" />
                {t.buildResumeBtn}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick advice panel */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">{t.tipsTitle}</h4>
        <ul className="text-xs text-slate-400 flex flex-col gap-2 pl-1 font-sans">
          {CONSTANT_IDEAS.map((idea, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-sky-400 shrink-0 mt-1">•</span>
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
