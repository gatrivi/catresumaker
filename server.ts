import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy initializer for Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it in Settings > Secrets.");
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
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

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

// --- ENDPOINTS ---

// 1. Parse initial resume block text
app.post("/api/resume/parse-init", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
       res.status(400).json({ error: "Missing or empty rawText property" });
       return;
    }

    const ai = getGeminiClient();
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an ATS resume parsing engine. You output structured JSON strictly matching the defined schema layout. Ensure you generate 3-5 polished, metric-driven action bullets per job experience.",
        responseMimeType: "application/json",
        responseSchema: RESUME_SCHEMA,
        temperature: 0.2
      }
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

    const ai = getGeminiClient();
    
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an incremental update resolver for structured resumes. You return a JSON object with 'explanationOfChanges' and 'updatedResume' based on the requested log update.",
        responseMimeType: "application/json",
        responseSchema: UPDATE_RESPONSE_SCHEMA,
        temperature: 0.3
      }
    });

    const parsedJsonText = response.text;
    if (!parsedJsonText) {
      throw new Error("No output was generated from the Gemini model.");
    }

    const updateResponse = JSON.parse(parsedJsonText);
    res.json({
      success: true,
      explanationOfChanges: updateResponse.explanationOfChanges,
      updatedResume: updateResponse.updatedResume
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
  if (process.env.NODE_ENV !== "production") {
    console.log("Loading Vite Dev Mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Loading Production assets form 'dist'...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
