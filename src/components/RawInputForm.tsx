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
    if (lang === 'es') {
      setRawText(`Bastián Vance
Bastián Tech S.L.
bastian.vance@devmail.org  |  (321) 900-2009

Biografía: Soy Bastián. Construyo sistemas backend de alto tráfico. Actualmente trabajo como ingeniero backend en AppStream Tech instalados en Vigo desde marzo de 2023. En AppStream, construí una cola de procesamiento web distribuida en Node.js capaz de manejar más de 1500 consultas simultáneas sin errores, mejorando el rendimiento global por 30 por ciento. Ayudé con la configuración de Docker e introduje normativas de ESLint para todo el equipo de ingeniería.

Antes de eso, estudié en la Universidad y me gradué en 2021 de Licenciado en Informática. Durante la carrera estuve a tiempo parcial como desarrollador en StreamCast en Redmond desde enero de 2021 hasta febrero de 2023. Programé con javascript vainilla, armé herramientas integras de control y migré un antiguo panel JQuery a React 18, depurando más de 20 fallos de interfaz críticos.

Mis habilidades son: JS, TypeScript, NodeJS, ExpressJS, Docker, AWS S3, Redis, PostgreSQL, Jest, Git.
Idiomas hablados: Español (Nativo), Inglés (C1).`);
    } else {
      setRawText(`Bastian Vance
Bastada Eng Corp
bastada@devmail.org  |  (321) 900-2009

Summary: I'm Bastian. I build high-volume backends. I currently work as a senior backend engineer at AppStream Tech in Seattle since March 2023. At AppStream, I built a brand new web-scraping queue in Node.js that processes over 1500 concurrent items without failing and improved speeds by 30 percent. Also helped setup our Docker container setup, and introduced team-wide ESLint settings for better code reviews.

Before this, I studied at the University of Washington and graduated in 2021 with a BS in Computer Science. During college I was a part-time developer at StreamCast in Redmond from Jan 2021 to Feb 2023. There I wrote vanilla javascript, built internal tools, helped migrate an old jQuery app to React, and fixed about 20 critical UI bugs that clients reported.

Skills I have: JS, TypeScript, NodeJS, ExpressJS, Docker, AWS S3, Redis, PostgreSQL, Jest for testing, Git.
Spoken languages: English and German.`);
    }
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
