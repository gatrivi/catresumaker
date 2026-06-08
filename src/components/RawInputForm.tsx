import React, { useState } from "react";
import { Sparkles, Loader2, AlertCircle, FileText } from "lucide-react";

interface RawInputFormProps {
  onSuccess: (parsedResumeData: any) => void;
}

const CONSTANT_IDEAS = [
  "Copy and paste your messy LinkedIn profile page directly.",
  "Type standard paragraphs: 'I am baseline developer bastada, studied at Stanford, worked at Google since 2022 writing clean TS, added new search page.'",
  "Paste old PDF resume text blocks that lost formatting."
];

export default function RawInputForm({ onSuccess }: RawInputFormProps) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
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
        throw new Error(resData.error || "Failed to parse career history. Ensure the server is online.");
      }

      // Generate random temporary IDs for our arrays (since the LLM creates names, but not front-end unique IDs)
      const parsed = resData.resume;
      
      const prepareParsedData = {
        ...parsed,
        id: "profile-" + Date.now(),
        label: "AI Constructed Resume - " + new Date().toLocaleDateString(),
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
      setError(err.message || "Something went wrong while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSamplePaste = () => {
    setRawText(`Bastian Vance
Bastada Eng Corp
bastada@devmail.org  |  (321) 900-2009

Summary: I'm Bastian. I build high-volume backends. I currently work as a senior backend engineer at AppStream Tech in Seattle since March 2023. At AppStream, I built a brand new web-scraping queue in Node.js that processes over 1500 concurrent items without failing and improved speeds by 30 percent. Also helped setup our Docker container setup, and introduced team-wide ESLint settings for better code reviews.

Before this, I studied at the University of Washington and graduated in 2021 with a BS in Computer Science. During college I was a part-time developer at StreamCast in Redmond from Jan 2021 to Feb 2023. There I wrote vanilla javascript, built internal tools, helped migrate an old jQuery app to React, and fixed about 20 critical UI bugs that clients reported.

Skills I have: JS, TypeScript, NodeJS, ExpressJS, Docker, AWS S3, Redis, PostgreSQL, Jest for testing, Git.
Spoken languages: English and German.`);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-150 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-lg text-white">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900 text-lg">AI Construction Matrix</h3>
          <p className="text-xs text-neutral-500">Paste your messy career logs to instantly manufacture an ATS-perfect document</p>
        </div>
      </div>

      <form onSubmit={handleIngest} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1.5 uppercase tracking-wider">
            Raw Career Text, Messy Bio or Pasted Profile
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={loading}
            placeholder="Example: I worked at Acme Inc as Tech Lead between 2021-2024. I managed a team of 4 engineers and we rebuilt the checkout page using React and Tailwind CSS..."
            className="w-full h-64 p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white resize-y font-sans transition-all"
          />
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Parsing failed:</span> {error}
              <p className="mt-1 text-[11px] text-rose-600">Please make sure the development server has the Gemini API Key configured in Environment Variables.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            type="button"
            onClick={handleLoadSamplePaste}
            disabled={loading}
            className="text-xs text-neutral-600 hover:text-sky-700 hover:bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            Load Sample Profile Ingestion
          </button>

          <button
            type="submit"
            disabled={loading || !rawText.trim()}
            className="bg-neutral-900 border border-neutral-900 hover:bg-sky-600 hover:border-sky-600 text-white font-medium text-sm px-5 py-2.5 rounded-lg inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-neutral-100/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                <span className="animate-pulse">{steps[stepIndex]}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-sky-400" />
                Build My Resume
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick advice panel */}
      <div className="mt-6 pt-5 border-t border-neutral-100">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2.5">Tips for Elite ATS Construction</h4>
        <ul className="text-xs text-neutral-600 flex flex-col gap-2 pl-1 font-sans">
          {CONSTANT_IDEAS.map((idea, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-sky-500 shrink-0 mt-1">•</span>
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
