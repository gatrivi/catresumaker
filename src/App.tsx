import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Sparkles, 
  Plus, 
  History, 
  Printer, 
  Undo, 
  User, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  Award, 
  Eye, 
  AlertCircle,
  HelpCircle,
  Globe,
  CheckCircle2,
  X,
  RefreshCw,
  Trash
} from "lucide-react";
import { ResumeData, WorkLogEntry } from "./types";
import { SAMPLE_RESUME } from "./utils/initialData";
import ResumePreview from "./components/ResumePreview";
import RawInputForm from "./components/RawInputForm";
import LogUpdateForm from "./components/LogUpdateForm";
import { resources } from "./utils/translations";

export default function App() {
  console.log("[CatResumeMaker] App() render start", {
    ts: Date.now(),
    browserLang: navigator.language,
    hasLocalStorageResume: !!localStorage.getItem("catresumaker_resume"),
    hasLocalStorageLogs: !!localStorage.getItem("catresumaker_logs"),
    hasVisitedBefore: localStorage.getItem("catresumaker_onboard_seen") !== null
  });

  // Persistence with local storage
  const [resume, setResume] = useState<ResumeData>(() => {
    const saved = localStorage.getItem("catresumaker_resume");
    return saved ? JSON.parse(saved) : SAMPLE_RESUME;
  });

  const [logs, setLogs] = useState<WorkLogEntry[]>(() => {
    const saved = localStorage.getItem("catresumaker_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const [templateId, setTemplateId] = useState<'ats-classic' | 'modern-serif' | 'clean-minimal' | 'tech-mono'>(() => {
    return (localStorage.getItem("catresumaker_template_id") as any) || "ats-classic";
  });

  const [activeTab, setActiveTab] = useState<'timeline' | 'edit-fields' | 'builder'>('timeline');
  const [editSection, setEditSection] = useState<'personal' | 'experience' | 'education' | 'skills' | 'extras'>('personal');
  const [showPrintHint, setShowPrintHint] = useState(false);
  
  // Real-time API Connection monitoring
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isSlowWakeup, setIsSlowWakeup] = useState(false);

  // Internationalization settings
  const browserLang = navigator.language.startsWith('es') ? 'es' : 'en';
  const [lang, setLang] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem("catresumaker_lang");
    return (saved as any) || (browserLang as any);
  });

  const [flashLang, setFlashLang] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasVisitedBefore, setHasVisitedBefore] = useState(() => {
    return localStorage.getItem("catresumaker_onboard_seen") !== null;
  });

  const t = resources[lang];

  console.log("[CatResumeMaker] App() derived state", {
    lang,
    templateId,
    activeTab,
    editSection,
    resumeKeys: Object.keys(resume || {})
  });

  // Sync states to local storage
  useEffect(() => {
    console.log("[CatResumeMaker] persist resume to localStorage", {
      bytes: JSON.stringify(resume).length
    });
    localStorage.setItem("catresumaker_resume", JSON.stringify(resume));
  }, [resume]);

  useEffect(() => {
    localStorage.setItem("catresumaker_logs", JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem("catresumaker_template_id", templateId);
  }, [templateId]);

  useEffect(() => {
    localStorage.setItem("catresumaker_lang", lang);
  }, [lang]);

  // Track idle state: if first-time user is idle for 2s, flash the language toggle
  useEffect(() => {
    if (!hasVisitedBefore) {
      let isIdle = true;
      const handleUserActivity = () => {
        isIdle = false;
        setFlashLang(false);
        window.removeEventListener("click", handleUserActivity);
        window.removeEventListener("keydown", handleUserActivity);
      };

      window.addEventListener("click", handleUserActivity);
      window.addEventListener("keydown", handleUserActivity);

      // Start idle detection timer (2 seconds)
      const timer = setTimeout(() => {
        if (isIdle) {
          setFlashLang(true);
        }
      }, 2000);

      // Also trigger initial tutorial popup if it's their absolute first time
      const tutorialDelayedOpen = setTimeout(() => {
        if (isIdle) {
          setShowTutorial(true);
        }
      }, 3500);

      return () => {
        clearTimeout(timer);
        clearTimeout(tutorialDelayedOpen);
        window.removeEventListener("click", handleUserActivity);
        window.removeEventListener("keydown", handleUserActivity);
      };
    }
  }, [hasVisitedBefore]);

  // Check health and measure latency with the backend
  const verifySystemConnectivity = async () => {
    setIsCheckingConnection(true);
    setIsSlowWakeup(false);
    const startTime = performance.now();
    
    // Set a timer to detect slow connection (e.g. 2.5 seconds)
    const slowTimer = setTimeout(() => {
      setIsSlowWakeup(true);
    }, 2500);

    try {
      console.log("[CatResumeMaker] calling /api/health");
      const res = await fetch("/api/health");
      console.log("[CatResumeMaker] /api/health status", res.status);
      const data = await res.json();
      console.log("[CatResumeMaker] /api/health payload", data);
      const endTime = performance.now();
      setConnectionLatency(Math.round(endTime - startTime));
      setApiConnected(data.hasApiKey);
    } catch {
      console.warn("[CatResumeMaker] /api/health failed (fetch/JSON)");
      setApiConnected(false);
      setConnectionLatency(null);
    } finally {
      clearTimeout(slowTimer);
      setIsSlowWakeup(false);
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    console.log("[CatResumeMaker] verifySystemConnectivity() effect firing");
    verifySystemConnectivity();
  }, []);

  const handleUpdateResume = (newResume: ResumeData) => {
    setResume({
      ...newResume,
      updatedAt: new Date().toISOString()
    });
  };

  const handleResetToDefault = () => {
    const confirmationText = lang === 'es' 
      ? "¿Deseas restaurar el perfil de demostración? Se borrarán tus cambios actuales." 
      : "This will overwrite your current changes with the default sample profile. Continue?";
    if (window.confirm(confirmationText)) {
      setResume(SAMPLE_RESUME);
      setLogs([]);
      setActiveTab("timeline");
    }
  };

  const handlePrint = () => {
    setShowPrintHint(true);
    setTimeout(() => {
      window.print();
    }, 450);
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
    setFlashLang(false);
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("catresumaker_onboard_seen", "true");
    setHasVisitedBefore(true);
  };

  // Inline Manual Field editors helpers
  const updatePersonalInfo = (field: string, value: string) => {
    handleUpdateResume({
      ...resume,
      personalInfo: {
        ...resume.personalInfo,
        [field]: value
      }
    });
  };

  const handleAddExperience = () => {
    const fresh: any = {
      id: "exp-" + Date.now(),
      company: lang === 'es' ? "Nombre de la Empresa" : "Company Name",
      title: lang === 'es' ? "Título del Puesto" : "Job Title",
      dates: lang === 'es' ? "2024 - Presente" : "2024 - Present",
      location: lang === 'es' ? "Ciudad, País" : "City, State",
      bullets: [lang === 'es' ? "Logré la misión X aplicando tecnología Y resultando en la métrica Z." : "Accomplished mission X by applying technology Y resulting in Z metric."],
      current: true
    };
    handleUpdateResume({
      ...resume,
      experience: [fresh, ...resume.experience]
    });
  };

  const handleDeleteExperience = (id: string) => {
    handleUpdateResume({
      ...resume,
      experience: resume.experience.filter((e) => e.id !== id)
    });
  };

  const handleExpChange = (id: string, field: string, value: any) => {
    handleUpdateResume({
      ...resume,
      experience: resume.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    });
  };

  const handleExpBulletChange = (expId: string, bulletIndex: number, text: string) => {
    handleUpdateResume({
      ...resume,
      experience: resume.experience.map((e) => {
        if (e.id === expId) {
          const updatedBullets = [...e.bullets];
          updatedBullets[bulletIndex] = text;
          return { ...e, bullets: updatedBullets };
        }
        return e;
      })
    });
  };

  const handleAddExpBullet = (expId: string) => {
    handleUpdateResume({
      ...resume,
      experience: resume.experience.map((e) => {
        if (e.id === expId) {
          return { ...e, bullets: [...e.bullets, lang === 'es' ? "Añadí un logro cuantificado de alto nivel profesional." : "Added high-quality accomplishment bullet."] };
        }
        return e;
      })
    });
  };

  const handleDeleteExpBullet = (expId: string, bulletIndex: number) => {
    handleUpdateResume({
      ...resume,
      experience: resume.experience.map((e) => {
        if (e.id === expId) {
          return { ...e, bullets: e.bullets.filter((_, idx) => idx !== bulletIndex) };
        }
        return e;
      })
    });
  };

  const handleAddEducation = () => {
    const fresh = {
      id: "edu-" + Date.now(),
      institution: lang === 'es' ? "Institución Educativa" : "Institution",
      degree: lang === 'es' ? "Título o Licenciatura" : "Degree",
      dates: "2020 - 2024",
      location: lang === 'es' ? "Ciudad, País" : "City, State",
      description: ""
    };
    handleUpdateResume({
      ...resume,
      education: [...resume.education, fresh]
    });
  };

  const handleDeleteEducation = (id: string) => {
    handleUpdateResume({
      ...resume,
      education: resume.education.filter((e) => e.id !== id)
    });
  };

  const handleEduChange = (id: string, field: string, value: string) => {
    handleUpdateResume({
      ...resume,
      education: resume.education.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    });
  };

  const handleUpdateSkillsList = (groupId: string, text: string) => {
    const items = text.split(",").map((s) => s.trim()).filter(Boolean);
    handleUpdateResume({
      ...resume,
      skills: resume.skills.map((s) => (s.id === groupId ? { ...s, items } : s))
    });
  };

  const handleAddSkillGroup = () => {
    const fresh = {
      id: "skill-group-" + Date.now(),
      category: lang === 'es' ? "Nombre de Categoría" : "Category Name",
      items: ["Skill One", "Skill Two"]
    };
    handleUpdateResume({
      ...resume,
      skills: [...resume.skills, fresh]
    });
  };

  const handleDeleteSkillGroup = (id: string) => {
    handleUpdateResume({
      ...resume,
      skills: resume.skills.filter((s) => s.id !== id)
    });
  };

  const handleSkillGroupCategory = (id: string, category: string) => {
    handleUpdateResume({
      ...resume,
      skills: resume.skills.map((s) => (s.id === id ? { ...s, category } : s))
    });
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col font-sans select-none antialiased">
      {/* Print-Only helper warning overlay (hidden on actual papers) */}
      {showPrintHint && (
        <div className="bg-sky-600 text-white py-2 px-4 text-xs font-semibold flex justify-between items-center no-print shadow-md tracking-wide animate-in fade-in duration-200">
          <span>{t.proTipPrint}</span>
          <button 
            onClick={() => setShowPrintHint(false)} 
            className="bg-sky-700 hover:bg-sky-800 text-white text-[10px] font-bold px-2 py-1 rounded transition-all uppercase tracking-wider cursor-pointer"
          >
            {t.gotIt}
          </button>
        </div>
      )}

      {/* Render Server Sleep Tier Wakeup Warning */}
      {isSlowWakeup && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-750 to-amber-600 text-white py-2.5 px-4 text-xs font-semibold flex flex-col sm:flex-row gap-2 justify-between items-center no-print shadow-lg tracking-wide animate-in slide-in-from-top duration-300 z-50 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="animate-spin text-amber-200 font-mono inline-block">☕</span>
            <span>
              {lang === 'es'
                ? "El servidor alojado en Render está despertando (Tasa Gratuita) — Esto toma unos 50 s. ¡Gracias por tu paciencia!"
                : "Render Free-Tier Server is waking up from sleep — This process takes about ~50 seconds initially. Thank you for your patience!"}
            </span>
          </div>
          <span className="text-[9px] bg-amber-900/60 uppercase tracking-widest px-2 py-0.5 rounded text-amber-200 font-bold">
            {lang === 'es' ? "DESPERTANDO SERVIDOR" : "WARMING UP ENGINE"}
          </span>
        </div>
      )}

      {/* Primary Navigation Hub */}
      <nav className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40" id="global-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* The adorable custom dog app icon requested! */}
            <div className="relative group shrink-0">
              <img 
                src="/src/assets/app_icon.png" 
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-md transform group-hover:scale-105 transition-all outline-none"
                alt="Dog Icon Logo" 
              />
              <span className="absolute -bottom-1 -right-1 bg-sky-500 w-3 h-3 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base flex items-center gap-1.5 leading-none">
                {t.appName}
                <span className="text-[10px] tracking-wide font-extrabold uppercase bg-sky-950/50 text-sky-400 px-1.5 py-0.5 rounded-md border border-sky-800/40">
                  {t.atsStandard}
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-tight">{t.continuousPipeline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time backend readiness check widget to eliminate stuck anxieties */}
            <div 
              onClick={verifySystemConnectivity}
              title="Click to check connectivity latency with the Gemini engine"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-all ${
                apiConnected === true 
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300 hover:bg-emerald-950/60" 
                  : apiConnected === false 
                    ? "bg-rose-950/40 border-rose-800/50 text-rose-300 hover:bg-rose-950/60 animate-pulse" 
                    : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                apiConnected === true 
                  ? "bg-emerald-400" 
                  : apiConnected === false 
                    ? "bg-rose-400" 
                    : "bg-slate-400 animate-pulse"
              }`} />
              <span className="font-mono">
                {isCheckingConnection 
                  ? t.connectionTesting 
                  : apiConnected === true 
                    ? `${t.connectionHealthy} (${connectionLatency || 0}ms)` 
                    : "Gemini Key Offline"}
              </span>
            </div>

            {/* Language Selection Toggle and Idle Flash trigger */}
            <button
              onClick={() => {
                setLang(lang === 'en' ? 'es' : 'en');
                setFlashLang(false);
              }}
              className={`p-2 rounded-lg border text-xs font-bold transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
                flashLang 
                  ? "animate-flash-attention bg-indigo-600 text-white border-indigo-400" 
                  : "bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300 hover:border-slate-600"
              }`}
              title="Español / English Toggle"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? "ES" : "EN"}</span>
            </button>

            {/* Quick Tutorial Onboarding Trigger */}
            <button
              onClick={handleOpenTutorial}
              className={`p-2 rounded-lg border text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600 transition-all cursor-pointer flex items-center gap-1 justify-center focus:outline-none ${
                !hasVisitedBefore ? "animate-pulse border-sky-800 text-sky-300 font-bold" : ""
              }`}
              title="Onboarding Guide"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline text-xs">{t.onboardingBtn}</span>
            </button>

            <button
              onClick={handleResetToDefault}
              className="text-slate-400 hover:text-white text-xs px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-all cursor-pointer font-medium flex items-center gap-1"
              title="Re-populate demo records"
            >
              <Undo className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.resetDemo}</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-indigo-650 border border-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printExport}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Tutorial Guide Onboarding Popover / Modal Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-text">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative text-left">
            <button 
              onClick={handleCloseTutorial}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                <HelpCircle className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{t.stepTitle}</h3>
                <p className="text-xs text-slate-400">{t.appName} — {t.atsStandard}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-850">
              {t.firstTimeDesc}
            </p>

            <div className="flex flex-col gap-4 mb-6">
              <div className="flex gap-3">
                <span className="text-indigo-400 font-mono text-xs font-bold shrink-0">01</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{t.step1Title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.step1Desc}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-indigo-400 font-mono text-xs font-bold shrink-0">02</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{t.step2Title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.step2Desc}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-indigo-400 font-mono text-xs font-bold shrink-0">03</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{t.step3Title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.step3Desc}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-indigo-400 font-mono text-xs font-bold shrink-0">04</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{t.step4Title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.step4Desc}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCloseTutorial}
              className="w-full bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all uppercase tracking-wider cursor-pointer"
            >
              {t.closeGuide}
            </button>
          </div>
        </div>
      )}

      {/* Main Multi-Column Space Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 relative select-text" id="workspace">
        
        {/* LEFT COMPONENT: CONTROL RAIL (5 Columns on desktop) */}
        <div className="no-print lg:col-span-5 flex flex-col gap-6" id="workspace-controls">
          
          {/* Template Choices Selector Grid */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg" id="widget-template-picker">
            <h3 className="font-semibold text-slate-400 text-xs uppercase tracking-wider mb-3 font-mono">
              {t.renderingTemplate}
            </h3>
            
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "ats-classic", name: lang === 'es' ? "Clásico ATS" : "ATS Classic", description: lang === 'es' ? "Columna vertical estricta diseñada para máxima legibilidad artificial." : "Standard, clean single-column structure optimized to score maximum readability on screening bots." },
                { id: "modern-serif", name: lang === 'es' ? "Editorial Elegante" : "Modern Editorial", description: lang === 'es' ? "Tipografía serif estilizada con amplios márgenes para roles de liderazgo." : "Elegant serif display headers and spacious columns for a polished editorial layout." },
                { id: "clean-minimal", name: lang === 'es' ? "Slate Minimal" : "Slate Minimal", description: lang === 'es' ? "Accentos color pizarra, líneas sutiles y geometría minimalista." : "Contemporary layout with subtle slate accents, minimalist divider lines, and balanced geometry." },
                { id: "tech-mono", name: lang === 'es' ? "Terminal Técnico" : "Terminal Mono", description: lang === 'es' ? "Bordes de estructura cuadriculada, ideal para analistas e informáticos." : "Technical, monospace layout featuring brutalist structural borders, perfect for engineers." }
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setTemplateId(tpl.id as any)}
                  className={`p-3 text-left rounded-lg border transition-all text-xs flex flex-col justify-between h-20 group relative cursor-pointer ${
                    templateId === tpl.id
                      ? "border-sky-500 bg-sky-950/20 ring-1 ring-sky-500"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950"
                  }`}
                  id={`temp-select-${tpl.id}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-slate-100 text-xs group-hover:text-sky-400 transition-colors">{tpl.name}</span>
                    {templateId === tpl.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug mt-1 font-sans">{tpl.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Core Action Menu Tags Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex shadow-lg shrink-0" id="tab-controls-container">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'timeline'
                  ? "bg-slate-950 hover:bg-slate-950 text-white shadow-md border border-slate-800"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
              id="tab-toggle-timeline"
            >
              <History className="w-3.5 h-3.5" />
              {t.dayToDaySync}
            </button>

            <button
              onClick={() => setActiveTab('edit-fields')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'edit-fields'
                  ? "bg-slate-950 hover:bg-slate-950 text-white shadow-md border border-slate-800"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
              id="tab-toggle-edit-fields"
            >
              <User className="w-3.5 h-3.5" />
              {t.manualCorrection}
            </button>

            <button
              onClick={() => setActiveTab('builder')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'builder'
                  ? "bg-slate-950 hover:bg-slate-950 text-white shadow-md border border-slate-800"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
              id="tab-toggle-builder"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {t.rebuildBase}
            </button>
          </div>

          {/* RENDER ACTIVE TAB CONTROL FLOW */}
          
          {/* TAB 1: Day-To-Day Logger Timeline form */}
          {activeTab === 'timeline' && (
            <div className="animate-in fade-in duration-150">
              <LogUpdateForm 
                currentResume={resume} 
                onUpdateResume={handleUpdateResume}
                logs={logs}
                onSetLogs={setLogs}
                lang={lang}
              />
            </div>
          )}

          {/* TAB 2: Completely Rebuild CV Base profile via Artificial Intelligence */}
          {activeTab === 'builder' && (
            <div className="animate-in fade-in duration-150 flex flex-col gap-4">
              <RawInputForm 
                lang={lang} 
                onSuccess={(data) => {
                  handleUpdateResume(data);
                  setActiveTab('timeline');
                }} 
              />
            </div>
          )}

          {/* TAB 3: Precision Tweaks Manual Editor */}
          {activeTab === 'edit-fields' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg animate-in fade-in duration-150 flex flex-col gap-5">
              
              {/* Internal Category menu list selectors */}
              <div className="flex border-b border-slate-850 pb-2 flex-wrap gap-1">
                {[
                  { id: 'personal', label: lang === 'es' ? "Contacto" : "Contact", icon: User },
                  { id: 'experience', label: lang === 'es' ? "Experiencia" : "Experience", icon: Briefcase },
                  { id: 'education', label: lang === 'es' ? "Educación" : "Education", icon: GraduationCap },
                  { id: 'skills', label: lang === 'es' ? "Habilidades" : "Skills", icon: Wrench },
                  { id: 'extras', label: lang === 'es' ? "Otros" : "Other", icon: Award }
                ].map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setEditSection(sec.id as any)}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        editSection === sec.id
                          ? "bg-slate-800 text-white border border-slate-700 font-bold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <Icon className="w-3 h-3 text-sky-400" />
                      {sec.label}
                    </button>
                  );
                })}
              </div>

              {/* SECTION: PERSONAL CONTACT AND HEADER FIELDS */}
              {editSection === 'personal' && (
                <div className="flex flex-col gap-3.5">
                  <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wider font-mono">
                    {lang === 'es' ? "Detalles de Datos Personales" : "Contact & Cover details"}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        {lang === 'es' ? "Nombre Completo" : "Full Name"}
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.name}
                        onChange={(e) => updatePersonalInfo('name', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        {lang === 'es' ? "Título Profesional" : "Target Title"}
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.title}
                        onChange={(e) => updatePersonalInfo('title', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        {lang === 'es' ? "Correo Electrónico" : "Email Address"}
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.email}
                        onChange={(e) => updatePersonalInfo('email', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        {lang === 'es' ? "Teléfono de Contacto" : "Telephone"}
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.phone}
                        onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        {lang === 'es' ? "Ubicación (Ciudad, País)" : "Location (City, ST)"}
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.location || ""}
                        onChange={(e) => updatePersonalInfo('location', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        {lang === 'es' ? "Sitio Web o Portafolio" : "Website URL"}
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.website || ""}
                        onChange={(e) => updatePersonalInfo('website', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                      {lang === 'es' ? "Perfil Profesional Resumido" : "Creative Summary Block"}
                    </label>
                    <textarea
                      value={resume.personalInfo.summary}
                      onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                      className="w-full h-24 p-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none font-sans"
                    />
                  </div>
                </div>
              )}

              {/* SECTION: EXPERIENCE MODIFICATION MATRICES */}
              {editSection === 'experience' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wider font-mono">
                      {lang === 'es' ? "Matriz Historial Laboral" : "Work History Matrix"}
                    </h4>
                    <button
                      onClick={handleAddExperience}
                      className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> {lang === 'es' ? "Añadir Puesto" : "Add Position"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
                    {resume.experience.map((exp) => (
                      <div key={exp.id} className="p-3 bg-slate-950 border border-slate-850 rounded-lg flex flex-col gap-2.5 relative group">
                        <button
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="absolute right-2 top-2 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all cursor-pointer opacity-40 group-hover:opacity-100"
                          title={lang === 'es' ? "Eliminar posición" : "Delete position"}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Empresa" : "Company"}</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => handleExpChange(exp.id, 'company', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Cargo" : "Title"}</label>
                            <input
                              type="text"
                              value={exp.title}
                              onChange={(e) => handleExpChange(exp.id, 'title', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-slate-700"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Fechas" : "Dates"}</label>
                            <input
                              type="text"
                              value={exp.dates}
                              onChange={(e) => handleExpChange(exp.id, 'dates', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Ubicación" : "Location"}</label>
                            <input
                              type="text"
                              value={exp.location || ""}
                              onChange={(e) => handleExpChange(exp.id, 'location', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-slate-700"
                            />
                          </div>
                        </div>

                        {/* Bullet achievements customization lists inside experience */}
                        <div className="mt-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'es' ? "Logros Clave" : "Bullet Accomplishments"}</span>
                            <button
                              onClick={() => handleAddExpBullet(exp.id)}
                              className="text-[9px] font-bold text-sky-400 hover:underline flex items-center gap-0.5"
                            >
                              + {lang === 'es' ? "Añadir viñeta" : "Add Bullet"}
                            </button>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {exp.bullets.map((bullet, idx) => (
                              <div key={idx} className="flex gap-1.5 items-start">
                                <textarea
                                  value={bullet}
                                  onChange={(e) => handleExpBulletChange(exp.id, idx, e.target.value)}
                                  className="flex-1 p-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-200 leading-relaxed resize-none font-sans focus:outline-none focus:border-slate-700"
                                />
                                <button
                                  onClick={() => handleDeleteExpBullet(exp.id, idx)}
                                  className="text-slate-500 hover:text-rose-450 shrink-0 p-1 cursor-pointer font-bold text-md"
                                  title="Remove bullet"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: EDUCATION LIST STYLING */}
              {editSection === 'education' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wider font-mono">
                      {lang === 'es' ? "Programas Académicos" : "Education Programs"}
                    </h4>
                    <button
                      onClick={handleAddEducation}
                      className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> {lang === 'es' ? "Añadir curso" : "Add Program"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {resume.education.map((edu) => (
                      <div key={edu.id} className="p-3 bg-slate-950 border border-slate-850 rounded-lg flex flex-col gap-2 relative group">
                        <button
                          onClick={() => handleDeleteEducation(edu.id)}
                          className="absolute right-2 top-2 p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer opacity-40 group-hover:opacity-100"
                          title="Delete education"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Institución / Universidad" : "Institution / College"}</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => handleEduChange(edu.id, 'institution', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Grado / Título" : "Degree"}</label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => handleEduChange(edu.id, 'degree', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Fechas" : "Dates"}</label>
                            <input
                              type="text"
                              value={edu.dates}
                              onChange={(e) => handleEduChange(edu.id, 'dates', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Descripción de Honores / Notas" : "Description / Honors (Optional)"}</label>
                          <input
                            type="text"
                            value={edu.description || ""}
                            onChange={(e) => handleEduChange(edu.id, 'description', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: TECHNICAL SKILLS CLASSIFICATIONS */}
              {editSection === 'skills' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wider font-mono">
                      {lang === 'es' ? "Mapa de Habilidades Técnicas" : "Skill Classification Map"}
                    </h4>
                    <button
                      onClick={handleAddSkillGroup}
                      className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> {lang === 'es' ? "Añadir categoría" : "Add Category"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {resume.skills.map((grp) => (
                      <div key={grp.id} className="p-3 bg-slate-950 border border-slate-850 rounded-lg flex flex-col gap-2 relative group">
                        <button
                          onClick={() => handleDeleteSkillGroup(grp.id)}
                          className="absolute right-2 top-2 p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer opacity-40 group-hover:opacity-100"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Título de Categoría" : "Category Title"}</label>
                          <input
                            type="text"
                            value={grp.category}
                            onChange={(e) => handleSkillGroupCategory(grp.id, e.target.value)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-bold text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase">{lang === 'es' ? "Habilidades (Separadas por comas)" : "Skills (Separated by commas)"}</label>
                          <input
                            type="text"
                            defaultValue={grp.items.join(", ")}
                            onBlur={(e) => handleUpdateSkillsList(grp.id, e.target.value)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-cyan-300"
                            placeholder="React, TypeScript, NextJS"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: LANGUAGES & CERTIFICATES */}
              {editSection === 'extras' && (
                <div className="flex flex-col gap-4">
                  <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wider font-mono">
                    {lang === 'es' ? "Idiomas y Certificaciones" : "Languages & Certifications"}
                  </h4>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                      {lang === 'es' ? "Idiomas Hablados (Separados por comas)" : "Spoken Languages (separated by commas)"}
                    </label>
                    <input
                      type="text"
                      value={resume.languages.join(", ")}
                      onChange={(e) => handleUpdateResume({
                        ...resume,
                        languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                      {lang === 'es' ? "Certificaciones Profesionales" : "Certifications (separated by commas)"}
                    </label>
                    <textarea
                      value={resume.certifications.join(", ")}
                      onChange={(e) => handleUpdateResume({
                        ...resume,
                        certifications: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      })}
                      className="w-full h-24 p-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: HIGH-DENSITY INTERACTIVE RESUME canvas */}
        <div className="lg:col-span-7 flex flex-col gap-4 w-full items-center" id="workspace-preview-zone">
          <div className="w-full max-w-[800px] flex items-center justify-between no-print border-b border-slate-850 pb-2">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-slate-400 shrink-0" />
              {lang === 'es' ? "Simulación de Impresión PDF (Formato A4)" : "Interactive PDF Simulation Screen (A4 Aspect Ratio)"}
            </span>
            <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-900 border border-slate-850 px-2 py-0.5 rounded tracking-wider">
              {lang === 'es' ? "Actualizado: " : "Updated: "}
              {resume.updatedAt ? new Date(resume.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Recently"}
            </span>
          </div>

          {/* Paper preview sheet */}
          <div className="w-full flex flex-col justify-center overflow-x-auto p-1 py-4 sm:p-4 rounded-xl bg-slate-950 border border-slate-850 shadow-inner max-w-[800px]">
            <ResumePreview data={resume} templateId={templateId} />
            
            {/* Elegant, subtle watermark beneath the CV preview page */}
            <div className="text-center mt-3 text-[11px] text-slate-500 tracking-wider hover:text-slate-400 transition-colors uppercase font-mono no-print">
              ✨ {t.watermark} ✨
            </div>
          </div>
        </div>

      </main>

      {/* Footer System Branding Grid with watermark representation */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500 no-print" id="global-footer">
        <p className="font-semibold text-slate-400 leading-normal flex items-center justify-center gap-1.5 font-mono uppercase tracking-widest text-[10px]">
          {t.footerTag}
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          {t.designedWith}
        </p>
        <p className="text-[10px] text-slate-600/80 font-bold tracking-widest uppercase mt-4 block">
          ⚡ {t.watermark} ⚡
        </p>
      </footer>
    </div>
  );
}
