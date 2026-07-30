import express from "express";
import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { getLLMStatus, callLLMChat } from "./job-cannon/ai/llmClient";
import { safeParseJson } from "./job-cannon/ai/safeJson";
import { getDataRoot, getJobCannonRoot } from "./job-cannon/projectRoot";
import { registerAuthAndUserRoutes } from "./server/routes/authAndJobs";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

const hasGeminiKey = !!process.env.GEMINI_API_KEY;
const hasFreeLLMApiKey = !!process.env.FREELLMAPI_API_KEY;
const hasNvidiaKey = !!process.env.NVIDIA_API_KEY;

function safeParseJsonLocal(text: string): any {
  return safeParseJson(text);
}

async function callLLMForResume(systemPrompt: string, userPrompt: string): Promise<string> {
  const { content } = await callLLMChat(systemPrompt, userPrompt, { temperature: 0.2 });
  return content;
}

// Lazy initializer for Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing. Set it in your local `.env` file (or environment variables) before using the AI endpoints."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Global server check
app.get("/api/health", (req, res) => {
  const llm = getLLMStatus();
  res.json({
    status: "ok",
    hasApiKey: llm.available,
    hasGeminiKey,
    hasFreeLLMApiKey,
    hasNvidiaKey,
    llmProvider: llm.provider,
    llmModel: llm.model,
  });
});

const DATA_ROOT = getDataRoot();
const LEGACY_JOB_CANNON = getJobCannonRoot();
registerAuthAndUserRoutes(app, DATA_ROOT, LEGACY_JOB_CANNON);

// JSON Schema for Resume Parsing
const RESUME_SCHEMA = {
  type: Type.OBJECT,
  description: "A professional, highly structured ATS-friendly resume parsed from raw text.",
  properties: {
    personalInfo: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        website: { type: Type.STRING },
        location: { type: Type.STRING },
        summary: { type: Type.STRING, description: "A high-impact 2-3 sentence professional summary focusing on core value." },
      },
      required: ["name", "title", "email", "phone", "summary"]
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          location: { type: Type.STRING },
          dates: { type: Type.STRING, description: "e.g., 2018 - 2022 or June 2020" },
          description: { type: Type.STRING, description: "GPA, awards, or major courses (optional)" },
        },
        required: ["institution", "degree", "dates"]
      }
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          location: { type: Type.STRING },
          dates: { type: Type.STRING, description: "e.g., Jan 2022 - Present or 2020 - 2021" },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-5 high-impact bullet points. Each bullet should follow the STAR method (Situation, Task, Action, Result), use action verbs, and quantify achievements where possible."
          },
          current: { type: Type.BOOLEAN, description: "True if is current job" },
        },
        required: ["company", "title", "dates", "bullets", "current"]
      }
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-3 bullet points emphasizing engineering accomplishments." },
          url: { type: Type.STRING, description: "e.g., GitHub link or website link" }
        },
        required: ["name", "description", "technologies", "bullets"]
      }
    },
    skills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "e.g., Languages, Frameworks, Tools, Soft Skills" },
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["category", "items"]
      }
    },
    languages: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    certifications: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["personalInfo", "education", "experience", "projects", "skills", "languages", "certifications"]
};

// Plain-text JSON structure guidance for FreeLLMAPI.
// Gemini enforces the schema via `responseSchema`, but FreeLLMAPI is prompt-based.
const RESUME_JSON_STRUCTURE = `
Return ONLY valid JSON (no markdown/code fences, no extra commentary) with this exact top-level shape:
{
  "personalInfo": { "name": string, "title": string, "email": string, "phone": string, "website": string, "location": string, "summary": string },
  "education": [{ "institution": string, "degree": string, "location": string, "dates": string, "description": string }],
  "experience": [{ "company": string, "title": string, "location": string, "dates": string, "bullets": [string], "current": boolean }],
  "projects": [{ "name": string, "description": string, "technologies": [string], "bullets": [string], "url": string }],
  "skills": [{ "category": string, "items": [string] }],
  "languages": [string],
  "certifications": [string]
}

Required rules:
- personalInfo.summary must be a polished 2-3 sentence professional summary.
- experience[].bullets must be 3-5 STAR-method bullets (action verbs, preferably quantified).
- projects[].bullets must be 1-3 accomplishment bullets.
`;

const UPDATE_RESPONSE_JSON_STRUCTURE = `
Return ONLY valid JSON with this exact top-level shape:
{
  "explanationOfChanges": string,
  "updatedResume": (same structure as the resume JSON described below)
}

` + RESUME_JSON_STRUCTURE;

// --- ENDPOINTS ---

// 1. Parse initial resume block text
app.post("/api/resume/parse-init", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
       res.status(400).json({ error: "Missing or empty rawText property" });
       return;
    }

    const prompt = `
You are a top-tier Professional Resume Consultant and an expert at parsing raw, messy career bio information into perfect, polished, ATS (Applicant Tracking System)-optimized resumes.

Task: Parse the following block of plain text into a detailed, structured, pristine resumes profile.

Rules:
1. Standardize formatting into clean professional styling.
2. Formulate bullets in the experience and projects sections using strong action verbs (e.g., Created, Engineered, Optimized, Directed, Delivered) and keep them concise, focused on impact and metrics if possible.
3. Classify tech tools and languages into neat categories under the 'skills' section.
4. Try to write a high-level 2-3 sentence 'summary' for the personalInfo block that reads like an elite industry statement.
5. If some standard fields (like email or location) are missing, make a best guess or construct placeholder-clear strings, but do not ignore fields.

Raw career text to parse:
"""
${rawText}
"""
    `;

    if (!getLLMStatus().available && !hasGeminiKey) {
      throw new Error(
        "AI offline. Set NVIDIA_API_KEY, FREELLMAPI_API_KEY, or GEMINI_API_KEY in your local `.env` before using the AI endpoints."
      );
    }

    if (getLLMStatus().available || hasFreeLLMApiKey || hasNvidiaKey) {
      const systemInstruction = "You output ONLY valid JSON. " + RESUME_JSON_STRUCTURE;
      const content = await callLLMForResume(systemInstruction, prompt);
      const parsedData = safeParseJsonLocal(content);
      res.json({ success: true, resume: parsedData });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are an ATS resume parsing engine. You output structured JSON strictly matching the defined schema layout. Ensure you generate 3-5 polished, metric-driven action bullets per job experience.",
        responseMimeType: "application/json",
        responseSchema: RESUME_SCHEMA,
        temperature: 0.2,
      },
    });

    const parsedJsonText = response.text;
    if (!parsedJsonText) {
      throw new Error("No output was generated from the Gemini model.");
    }

    const parsedData = JSON.parse(parsedJsonText);
    res.json({ success: true, resume: parsedData });
  } catch (error: any) {
    console.error("Parse Resume Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during resume construction."
    });
  }
});

// 2. Format a daily log update and merge into the resume
app.post("/api/resume/apply-update", async (req, res) => {
  try {
    const { currentResume, logText } = req.body;
    if (!currentResume) {
       res.status(400).json({ error: "Missing currentResume state" });
       return;
    }
    if (!logText || !logText.trim()) {
       res.status(400).json({ error: "Missing daily log entry text" });
       return;
    }

    // Schema representing the updated resume and a change report
    const UPDATE_RESPONSE_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        explanationOfChanges: {
          type: Type.STRING,
          description: "A bulleted explanation detailing exactly which sections were updated and why (e.g., 'Added a bullet to Experience @ Google detailing React debounced elements, updated Frontend category with Tailwind')."
        },
        updatedResume: RESUME_SCHEMA
      },
      required: ["explanationOfChanges", "updatedResume"]
    };

    const prompt = `
You are an expert AI Career Coach that acts as an incremental resume sync service.
The user enters a short personal update / daily log of what they did today at work or in a project. Your job is to cleanly merge this update into their existing resume.

Daily Log/Update entered by user:
"""
${logText}
"""

Existing Structured Resume:
${JSON.stringify(currentResume, null, 2)}

Instructions:
1. Locate the most appropriate section of the resume to integrate this update:
   - If it details custom accomplishments at a job, append/integrate a high-quality bullet point into that specific job experience (usually the 'current' job, or match by keywords/context).
   - If it mentions a new product/project, update the 'projects' array or append a new project.
   - If it notes learning a new technology or tool, ensure that technology/tool is integrated into the appropriate category inside 'skills' (create the category if missing).
   - Cleanly refine the wording to be ATS-ready (use active engineering voice, quantitative outcomes if implied).
2. Do NOT discard any existing data! Keep historical entries intact unless the update is explicitly correcting or updating dates/scores.
3. Document *what* you changed in 'explanationOfChanges' so the user knows exactly how their daily log was merged!
4. Output the strict updated resume along with this change history.
`;

    if (!getLLMStatus().available && !hasGeminiKey) {
      throw new Error(
        "AI offline. Set NVIDIA_API_KEY, FREELLMAPI_API_KEY, or GEMINI_API_KEY in your local `.env` before using the AI endpoints."
      );
    }

    if (getLLMStatus().available || hasFreeLLMApiKey || hasNvidiaKey) {
      const systemInstruction = "You output ONLY valid JSON. " + UPDATE_RESPONSE_JSON_STRUCTURE;
      const content = await callLLMForResume(systemInstruction, prompt);
      const updateResponse = safeParseJsonLocal(content);
      res.json({
        success: true,
        explanationOfChanges: updateResponse.explanationOfChanges,
        updatedResume: updateResponse.updatedResume,
      });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are an incremental update resolver for structured resumes. You return a JSON object with 'explanationOfChanges' and 'updatedResume' based on the requested log update.",
        responseMimeType: "application/json",
        responseSchema: UPDATE_RESPONSE_SCHEMA,
        temperature: 0.3,
      },
    });

    const parsedJsonText = response.text;
    if (!parsedJsonText) {
      throw new Error("No output was generated from the Gemini model.");
    }

    const updateResponse = JSON.parse(parsedJsonText);
    res.json({
      success: true,
      explanationOfChanges: updateResponse.explanationOfChanges,
      updatedResume: updateResponse.updatedResume,
    });
  } catch (error: any) {
    console.error("Apply Update Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during incremental resume updates."
    });
  }
});

// Configure Vite or Static Asset Serving
async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction =
    process.env.NODE_ENV === "production" || (hasDist && process.env.USE_VITE_DEV !== "1");

  if (!isProduction) {
    console.log("Loading Vite Dev Mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production SPA from dist/ (API at /api/*)...");
    app.use(express.static(distPath, { index: false, maxAge: "1h" }));

    // Frontend default: root and all non-API routes → index.html
    app.get("/", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server on http://0.0.0.0:${PORT} (${isProduction ? "production SPA + /api" : "dev"})`);
  });
}

startServer();
