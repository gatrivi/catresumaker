"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path14 = __toESM(require("path"), 1);
var import_fs15 = __toESM(require("fs"), 1);
var import_genai2 = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);

// job-cannon/ai/llmClient.ts
var import_genai = require("@google/genai");
var geminiClient = null;
function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");
    geminiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "catresumaker-job-os" } }
    });
  }
  return geminiClient;
}
function getLLMStatus() {
  const providers = {
    nvidia: !!process.env.NVIDIA_API_KEY,
    freellmapi: !!process.env.FREELLMAPI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY
  };
  const order = ["nvidia", "freellmapi", "gemini"];
  const active = order.find((p) => providers[p]) ?? null;
  const model = active ? active === "nvidia" ? process.env.NVIDIA_MODEL || "z-ai/glm-5.2" : active === "freellmapi" ? process.env.FREELLMAPI_MODEL || "auto" : process.env.GEMINI_MODEL || "gemini-2.0-flash" : null;
  return {
    available: !!active,
    provider: active,
    model,
    providers
  };
}
async function callOpenAICompatible(params) {
  const base = params.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt }
      ],
      temperature: params.temperature ?? 0.35,
      max_tokens: params.maxTokens ?? 4096
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LLM request failed (${response.status}). ${text.slice(0, 400)}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned an empty or invalid response.");
  }
  return content;
}
async function callGeminiChat(systemPrompt, userPrompt, temperature = 0.35) {
  const ai = getGeminiClient();
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature
    }
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned empty content.");
  return text;
}
async function callLLMChat(systemPrompt, userPrompt, opts) {
  const status = getLLMStatus();
  if (!status.available) {
    throw new Error(
      "AI offline. Set NVIDIA_API_KEY, FREELLMAPI_API_KEY, or GEMINI_API_KEY in `.env`."
    );
  }
  const tryOrder = opts?.provider ? [opts.provider] : ["nvidia", "freellmapi", "gemini"].filter((p) => status.providers[p]);
  let lastError = null;
  for (const provider of tryOrder) {
    try {
      if (provider === "nvidia" && process.env.NVIDIA_API_KEY) {
        const content = await callOpenAICompatible({
          baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
          apiKey: process.env.NVIDIA_API_KEY,
          model: process.env.NVIDIA_MODEL || "z-ai/glm-5.2",
          systemPrompt,
          userPrompt,
          temperature: opts?.temperature,
          maxTokens: opts?.maxTokens
        });
        return { content, provider, model: process.env.NVIDIA_MODEL || "z-ai/glm-5.2" };
      }
      if (provider === "freellmapi" && process.env.FREELLMAPI_API_KEY) {
        const content = await callOpenAICompatible({
          baseUrl: process.env.FREELLMAPI_BASE_URL || "http://localhost:3001/v1",
          apiKey: process.env.FREELLMAPI_API_KEY,
          model: process.env.FREELLMAPI_MODEL || "auto",
          systemPrompt,
          userPrompt,
          temperature: opts?.temperature,
          maxTokens: opts?.maxTokens
        });
        return { content, provider, model: process.env.FREELLMAPI_MODEL || "auto" };
      }
      if (provider === "gemini" && process.env.GEMINI_API_KEY) {
        const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        const content = await callGeminiChat(systemPrompt, userPrompt, opts?.temperature);
        return { content, provider, model };
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error("No LLM provider available.");
}

// job-cannon/ai/safeJson.ts
function safeParseJson(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Failed to parse JSON output from the AI model.");
  }
}

// job-cannon/projectRoot.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_meta = {};
var cachedRoot = null;
function getProjectRoot() {
  if (cachedRoot) return cachedRoot;
  if (process.env.CATRESUMAKER_ROOT) {
    cachedRoot = import_path.default.resolve(process.env.CATRESUMAKER_ROOT);
    return cachedRoot;
  }
  const cwd = process.cwd();
  if (import_fs.default.existsSync(import_path.default.join(cwd, "job-cannon"))) {
    cachedRoot = cwd;
    return cachedRoot;
  }
  try {
    const here = import_path.default.dirname((0, import_url.fileURLToPath)(import_meta.url));
    const fromHere = import_path.default.join(here, "..");
    if (import_fs.default.existsSync(import_path.default.join(fromHere, "job-cannon"))) {
      cachedRoot = import_path.default.resolve(fromHere);
      return cachedRoot;
    }
    const fromJobCannon = here;
    if (import_fs.default.existsSync(import_path.default.join(fromJobCannon, "jobs"))) {
      cachedRoot = import_path.default.resolve(fromJobCannon, "..");
      return cachedRoot;
    }
  } catch {
  }
  cachedRoot = cwd;
  return cachedRoot;
}
function getJobCannonRoot() {
  return import_path.default.join(getProjectRoot(), "job-cannon");
}
function getDataRoot() {
  if (process.env.DATA_ROOT) {
    return import_path.default.resolve(process.env.DATA_ROOT);
  }
  return import_path.default.join(getProjectRoot(), "data");
}

// server/routes/authAndJobs.ts
var import_path13 = __toESM(require("path"), 1);

// server/auth/userStore.ts
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);

// server/auth/password.ts
var import_crypto = require("crypto");
var import_util = require("util");
var scryptAsync = (0, import_util.promisify)(import_crypto.scrypt);
async function hashPassword(password) {
  const salt = (0, import_crypto.randomBytes)(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return (0, import_crypto.timingSafeEqual)(hashBuf, derived);
}

// job-cannon/workspace.ts
var import_async_hooks = require("async_hooks");
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var storage = new import_async_hooks.AsyncLocalStorage();
function getLegacyWorkspace() {
  const LEGACY_ROOT = getJobCannonRoot();
  return {
    userId: "legacy",
    root: LEGACY_ROOT,
    jobsDir: import_path2.default.join(LEGACY_ROOT, "jobs"),
    queuePath: import_path2.default.join(LEGACY_ROOT, "ApplyQueue.json"),
    inboxPath: import_path2.default.join(LEGACY_ROOT, "inbox", "jobs.txt"),
    rankedPath: import_path2.default.join(LEGACY_ROOT, "RankedJobs.md"),
    pasteBankAllPath: import_path2.default.join(LEGACY_ROOT, "PasteBank_All.txt"),
    formAnswersPath: import_path2.default.join(LEGACY_ROOT, "profile", "FormAnswers.json"),
    candidateProfilePath: import_path2.default.join(LEGACY_ROOT, "profile", "candidateProfile.json"),
    resumeMdPath: import_path2.default.join(getProjectRoot(), "resume.md")
  };
}
function getUserWorkspace(userId, dataRoot) {
  const root = import_path2.default.join(dataRoot, "users", userId, "job-cannon");
  return {
    userId,
    root,
    jobsDir: import_path2.default.join(root, "jobs"),
    queuePath: import_path2.default.join(root, "ApplyQueue.json"),
    inboxPath: import_path2.default.join(root, "inbox", "jobs.txt"),
    rankedPath: import_path2.default.join(root, "RankedJobs.md"),
    pasteBankAllPath: import_path2.default.join(root, "PasteBank_All.txt"),
    formAnswersPath: import_path2.default.join(root, "profile", "FormAnswers.json"),
    candidateProfilePath: import_path2.default.join(root, "profile", "candidateProfile.json"),
    resumeMdPath: import_path2.default.join(dataRoot, "users", userId, "resume.md")
  };
}
function getWorkspace() {
  return storage.getStore() ?? getLegacyWorkspace();
}
async function runWithWorkspaceAsync(ws, fn) {
  return storage.run(ws, async () => await fn());
}
function ensureDir(p) {
  import_fs2.default.mkdirSync(p, { recursive: true });
}
function ensureUserWorkspace(ws) {
  ensureDir(ws.jobsDir);
  ensureDir(import_path2.default.dirname(ws.inboxPath));
  ensureDir(import_path2.default.dirname(ws.formAnswersPath));
  if (!import_fs2.default.existsSync(ws.queuePath)) {
    import_fs2.default.writeFileSync(ws.queuePath, "[]\n", "utf8");
  }
  if (!import_fs2.default.existsSync(ws.inboxPath)) {
    import_fs2.default.writeFileSync(
      ws.inboxPath,
      "---JOB---\nURL: \nTitle: \nCompany: \nSource: Pasted\n\nPaste full job text here...\n",
      "utf8"
    );
  }
}

// job-cannon/candidateProfile.ts
var candidateProfile = {
  fullName: "Gast\xF3n Alejandro Trivi",
  email: "gatrivi@gmail.com",
  phone: "+54 9 11 5619 9363",
  location: "Olivos, Buenos Aires, Argentina",
  linkedin: "https://linkedin.com/in/gatrivi",
  github: "https://github.com/gatrivi",
  portfolio: "https://devtrivi.zengasoft.com",
  currentCompany: "Independent React Developer / Freelance Contractor",
  desiredSalary: "USD 36,000\u201342,000 / year, flexible depending on scope and benefits",
  desiredSalaryIfForcedNumber: "USD 36,000 / year",
  startTiming: "Available to start within 2 weeks; open to an earlier start if useful.",
  proofProjects: [
    {
      id: "catintassist",
      name: "CatIntAssist",
      github: "https://github.com/gatrivi/catintassist",
      description: "React workstation for bilingual medical interpretation workflows, built for reliability under real-time usage and frequent updates."
    },
    {
      id: "catreader",
      name: "CatReader",
      github: "https://github.com/gatrivi/catreader",
      description: "React/Vite document reader experience with persistence/sync and data-heavy UI behavior (PDF/TXT reading + enrichment flows)."
    },
    {
      id: "tmmstore",
      name: "Tmm Store",
      github: "https://github.com/gatrivi/Tmm-store",
      description: "SMB React ordering flow: menu/cart/checkout UX plus operational admin patterns (real product-style frontend)."
    }
  ]
};

// server/auth/userStore.ts
var UserStore = class {
  constructor(dataRoot) {
    this.dataRoot = dataRoot;
    import_fs3.default.mkdirSync(this.dataRoot, { recursive: true });
    import_fs3.default.mkdirSync(import_path3.default.join(this.dataRoot, "users"), { recursive: true });
    if (!import_fs3.default.existsSync(this.indexPath())) {
      this.saveIndex({ users: [] });
    }
  }
  indexPath() {
    return import_path3.default.join(this.dataRoot, "users-index.json");
  }
  loadIndex() {
    return JSON.parse(import_fs3.default.readFileSync(this.indexPath(), "utf8"));
  }
  saveIndex(index) {
    import_fs3.default.writeFileSync(this.indexPath(), JSON.stringify(index, null, 2) + "\n", "utf8");
  }
  findByEmail(email) {
    const norm = email.trim().toLowerCase();
    return this.loadIndex().users.find((u) => u.email === norm);
  }
  findById(id) {
    return this.loadIndex().users.find((u) => u.id === id);
  }
  async register(email, password, name) {
    const normEmail = email.trim().toLowerCase();
    if (!normEmail || !password || password.length < 8) {
      throw new Error("Email required and password must be at least 8 characters.");
    }
    if (this.findByEmail(normEmail)) {
      throw new Error("An account with this email already exists.");
    }
    const user = {
      id: import_crypto2.default.randomUUID(),
      email: normEmail,
      name: name.trim() || normEmail.split("@")[0],
      passwordHash: await hashPassword(password),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const index = this.loadIndex();
    index.users.push(user);
    this.saveIndex(index);
    this.initUserData(user);
    return user;
  }
  async login(email, password) {
    const user = this.findByEmail(email);
    if (!user || !await verifyPassword(password, user.passwordHash)) {
      throw new Error("Invalid email or password.");
    }
    return user;
  }
  userDir(userId) {
    return import_path3.default.join(this.dataRoot, "users", userId);
  }
  initUserData(user) {
    const dir = this.userDir(user.id);
    import_fs3.default.mkdirSync(dir, { recursive: true });
    const ws = getUserWorkspace(user.id, this.dataRoot);
    ensureUserWorkspace(ws);
    const template = {
      fullName: user.name,
      email: user.email,
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      currentCompany: "Independent Developer",
      desiredSalary: "Flexible depending on scope and benefits",
      desiredSalaryIfForcedNumber: "",
      startTiming: "Available within 2 weeks",
      proofProjects: [
        {
          id: "project-1",
          name: "Your best project",
          github: "",
          description: "Replace with your real React/TypeScript proof project."
        }
      ]
    };
    const profilePath = import_path3.default.join(dir, "candidateProfile.json");
    if (!import_fs3.default.existsSync(profilePath)) {
      import_fs3.default.writeFileSync(profilePath, JSON.stringify(template, null, 2) + "\n", "utf8");
      import_fs3.default.writeFileSync(ws.candidateProfilePath, JSON.stringify(template, null, 2) + "\n", "utf8");
    }
    if (!import_fs3.default.existsSync(ws.formAnswersPath)) {
      import_fs3.default.writeFileSync(
        ws.formAnswersPath,
        JSON.stringify(
          {
            fullName: user.name,
            email: user.email,
            phone: "",
            location: "",
            linkedin: "",
            github: "",
            portfolio: "",
            availability: "Within 2 weeks",
            salaryExpectation: "Flexible"
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
    }
    if (!import_fs3.default.existsSync(import_path3.default.join(dir, "resume.json"))) import_fs3.default.writeFileSync(import_path3.default.join(dir, "resume.json"), "null\n", "utf8");
    if (!import_fs3.default.existsSync(import_path3.default.join(dir, "logs.json"))) import_fs3.default.writeFileSync(import_path3.default.join(dir, "logs.json"), "[]\n", "utf8");
    if (!import_fs3.default.existsSync(import_path3.default.join(dir, "settings.json"))) {
      import_fs3.default.writeFileSync(import_path3.default.join(dir, "settings.json"), JSON.stringify({ templateId: "ats-classic", lang: "es" }, null, 2) + "\n", "utf8");
    }
  }
  /** Copy legacy repo job-cannon into this user's workspace (one-time). */
  claimLegacyJobCannon(userId, legacyRoot) {
    const ws = getUserWorkspace(userId, this.dataRoot);
    ensureUserWorkspace(ws);
    const existing = import_fs3.default.existsSync(ws.jobsDir) ? import_fs3.default.readdirSync(ws.jobsDir) : [];
    if (existing.length > 0) {
      return { copied: false, reason: "User workspace already has jobs." };
    }
    const legacyJobs = import_path3.default.join(legacyRoot, "jobs");
    if (!import_fs3.default.existsSync(legacyJobs)) {
      return { copied: false, reason: "No legacy jobs folder." };
    }
    this.copyDir(legacyJobs, ws.jobsDir);
    const legacyQueue = import_path3.default.join(legacyRoot, "ApplyQueue.json");
    if (import_fs3.default.existsSync(legacyQueue)) import_fs3.default.copyFileSync(legacyQueue, ws.queuePath);
    const legacyInbox = import_path3.default.join(legacyRoot, "inbox");
    if (import_fs3.default.existsSync(legacyInbox)) this.copyDir(legacyInbox, import_path3.default.dirname(ws.inboxPath));
    const legacyProfileDir = import_path3.default.join(legacyRoot, "profile");
    if (import_fs3.default.existsSync(legacyProfileDir)) this.copyDir(legacyProfileDir, import_path3.default.dirname(ws.formAnswersPath));
    const profileJson = JSON.stringify(candidateProfile, null, 2) + "\n";
    import_fs3.default.writeFileSync(ws.candidateProfilePath, profileJson, "utf8");
    import_fs3.default.writeFileSync(import_path3.default.join(this.userDir(userId), "candidateProfile.json"), profileJson, "utf8");
    return { copied: true };
  }
  copyDir(src, dest) {
    import_fs3.default.mkdirSync(dest, { recursive: true });
    for (const entry of import_fs3.default.readdirSync(src, { withFileTypes: true })) {
      const s = import_path3.default.join(src, entry.name);
      const d = import_path3.default.join(dest, entry.name);
      if (entry.isDirectory()) this.copyDir(s, d);
      else import_fs3.default.copyFileSync(s, d);
    }
  }
};

// server/userData.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
var UserDataStore = class {
  constructor(dataRoot) {
    this.dataRoot = dataRoot;
  }
  userDir(userId) {
    return import_path4.default.join(this.dataRoot, "users", userId);
  }
  readJson(userId, file, fallback) {
    const p = import_path4.default.join(this.userDir(userId), file);
    if (!import_fs4.default.existsSync(p)) return fallback;
    try {
      return JSON.parse(import_fs4.default.readFileSync(p, "utf8"));
    } catch {
      return fallback;
    }
  }
  writeJson(userId, file, data) {
    const dir = this.userDir(userId);
    import_fs4.default.mkdirSync(dir, { recursive: true });
    import_fs4.default.writeFileSync(import_path4.default.join(dir, file), JSON.stringify(data, null, 2) + "\n", "utf8");
  }
  writeText(userId, file, text) {
    const dir = this.userDir(userId);
    import_fs4.default.mkdirSync(dir, { recursive: true });
    import_fs4.default.writeFileSync(import_path4.default.join(dir, file), text, "utf8");
  }
  readText(userId, file) {
    const p = import_path4.default.join(this.userDir(userId), file);
    return import_fs4.default.existsSync(p) ? import_fs4.default.readFileSync(p, "utf8") : null;
  }
};

// server/auth/tokens.ts
var import_crypto3 = require("crypto");
var TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function b64url(data) {
  return Buffer.from(data, "utf8").toString("base64url");
}
function unb64url(data) {
  return Buffer.from(data, "base64url").toString("utf8");
}
function secret() {
  const s = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }
  return s || "dev-only-change-me-before-sharing";
}
function signToken(payload) {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadPart = b64url(JSON.stringify(body));
  const sig = (0, import_crypto3.createHmac)("sha256", secret()).update(`${header}.${payloadPart}`).digest("base64url");
  return `${header}.${payloadPart}.${sig}`;
}
function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payloadPart, sig] = parts;
  const expected = (0, import_crypto3.createHmac)("sha256", secret()).update(`${header}.${payloadPart}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !(0, import_crypto3.timingSafeEqual)(a, b)) return null;
  try {
    const payload = JSON.parse(unb64url(payloadPart));
    if (!payload.userId || !payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// server/auth/middleware.ts
function extractBearer(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}
function createAuthMiddleware(getUserById) {
  return (req, res, next) => {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ success: false, error: "Login required." });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ success: false, error: "Session expired. Please log in again." });
      return;
    }
    const user = getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ success: false, error: "User not found." });
      return;
    }
    req.user = user;
    req.token = token;
    next();
  };
}

// job-cannon/applyQueue.ts
var import_fs5 = __toESM(require("fs"), 1);
var import_path5 = __toESM(require("path"), 1);
var import_url2 = require("url");
var import_crypto4 = __toESM(require("crypto"), 1);
var import_meta2 = {};
var __filename = (0, import_url2.fileURLToPath)(import_meta2.url);
var __dirname = import_path5.default.dirname(__filename);
var QUEUE_PATH_LEGACY = import_path5.default.join(getJobCannonRoot(), "ApplyQueue.json");
function queuePath() {
  return getWorkspace().queuePath ?? QUEUE_PATH_LEGACY;
}
function ensureQueueFile() {
  const QUEUE_PATH = queuePath();
  if (!import_fs5.default.existsSync(QUEUE_PATH)) {
    import_fs5.default.mkdirSync(import_path5.default.dirname(QUEUE_PATH), { recursive: true });
    import_fs5.default.writeFileSync(QUEUE_PATH, "[]\n", "utf8");
  }
}
function loadApplyQueue() {
  ensureQueueFile();
  const raw = import_fs5.default.readFileSync(queuePath(), "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}
function saveApplyQueue(queue) {
  ensureQueueFile();
  import_fs5.default.writeFileSync(queuePath(), JSON.stringify(queue, null, 2) + "\n", "utf8");
}
function normalizeUrl(url) {
  if (!url) return void 0;
  try {
    const u = new URL(url);
    u.hash = "";
    const toStrip = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"];
    for (const k of toStrip) {
      u.searchParams.delete(k);
    }
    const s = u.toString().replace(/\/+$/, "");
    return s;
  } catch {
    return url.trim();
  }
}
function companyTitleKey(company, title) {
  const c = (company ?? "").trim().toLowerCase();
  const t = (title ?? "").trim().toLowerCase();
  if (!c && !t) return void 0;
  return `${c}||${t}`;
}
function approxTextHash(text) {
  const normalized = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().toLowerCase();
  return import_crypto4.default.createHash("sha256").update(normalized, "utf8").digest("hex");
}
function updatedAtNowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function stableSortQueue(queue) {
  const copy = [...queue];
  copy.sort((a, b) => {
    const pA = typeof a.priority === "number" ? a.priority : -1;
    const pB = typeof b.priority === "number" ? b.priority : -1;
    if (pA !== pB) return pB - pA;
    const fA = typeof a.fitScore === "number" ? a.fitScore : -1;
    const fB = typeof b.fitScore === "number" ? b.fitScore : -1;
    if (fA !== fB) return fB - fA;
    const uA = a.dates?.updatedAt ? Date.parse(a.dates.updatedAt) : 0;
    const uB = b.dates?.updatedAt ? Date.parse(b.dates.updatedAt) : 0;
    return uB - uA;
  });
  return copy;
}
function findDuplicateIndex(queue, candidate) {
  const candUrlNorm = normalizeUrl(candidate.url);
  const candCompanyTitle = companyTitleKey(candidate.company, candidate.title);
  const candHash = candidate.rawTextHash;
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    const qUrlNorm = normalizeUrl(q.url);
    const qCompanyTitle = companyTitleKey(q.company, q.title);
    const qHash = q.rawTextHash;
    if (candUrlNorm && qUrlNorm && candUrlNorm === qUrlNorm) return i;
    if (candCompanyTitle && qCompanyTitle && candCompanyTitle === qCompanyTitle) return i;
    if (candHash && qHash && candHash === qHash) return i;
  }
  return null;
}
function upsertJobInQueue(job) {
  const queue = loadApplyQueue();
  const candidate = {
    ...job,
    dates: {
      ...job.dates,
      updatedAt: job.dates?.updatedAt ?? updatedAtNowISO()
    }
  };
  const dupIndex = findDuplicateIndex(queue, candidate);
  if (dupIndex === null) {
    const inserted = {
      ...candidate,
      dates: {
        ...candidate.dates,
        updatedAt: updatedAtNowISO(),
        sourcedAt: candidate.dates?.sourcedAt ?? (candidate.status === "sourced" ? updatedAtNowISO() : void 0)
      }
    };
    queue.push(inserted);
    saveApplyQueue(stableSortQueue(queue));
    return inserted;
  }
  const existing = queue[dupIndex];
  const merged = {
    ...existing,
    ...candidate,
    // Never change identity fields on upsert; keep stable slug/id.
    id: existing.id,
    slug: existing.slug,
    dates: {
      ...existing.dates ?? { updatedAt: updatedAtNowISO() },
      ...candidate.dates ?? {},
      updatedAt: updatedAtNowISO()
    }
  };
  if (merged.status === "sourced" && !merged.dates.sourcedAt) {
    merged.dates.sourcedAt = updatedAtNowISO();
  }
  queue[dupIndex] = merged;
  saveApplyQueue(stableSortQueue(queue));
  return merged;
}
function updateJobStatus(id, patch) {
  const queue = loadApplyQueue();
  const idx = queue.findIndex((j) => j.id === id || j.slug === id);
  if (idx === -1) return null;
  const existing = queue[idx];
  const merged = {
    ...existing,
    ...patch,
    dates: {
      ...existing.dates ?? { updatedAt: updatedAtNowISO() },
      ...patch.dates ?? {},
      updatedAt: updatedAtNowISO()
    }
  };
  queue[idx] = merged;
  saveApplyQueue(stableSortQueue(queue));
  return merged;
}

// job-cannon/pdf/exportJobPdf.ts
var import_fs7 = __toESM(require("fs"), 1);
var import_path6 = __toESM(require("path"), 1);

// job-cannon/pdf/markdownToText.ts
function markdownToText(markdown) {
  const md = markdown.replace(/\r\n/g, "\n");
  let out = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, a, b) => `${a}: ${b}`);
  out = out.replace(/```[\s\S]*?\n([\s\S]*?)```/g, (_m, inner) => inner);
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/^\s*>\s?/gm, "");
  out = out.replace(/^\s*---+\s*$/gm, "");
  out = out.replace(/^\s*[-*+]\s+/gm, "");
  out = out.replace(/^\s*\d+\.\s+/gm, "");
  out = out.replace(/(\*\*|__)(.*?)\1/g, "$2");
  out = out.replace(/(\*|_)(.*?)\1/g, "$2");
  out = out.replace(/\n{4,}/g, "\n\n\n");
  return out.trim() + "\n";
}

// job-cannon/pdf/renderPdf.ts
var import_fs6 = __toESM(require("fs"), 1);
var import_pdfkit = __toESM(require("pdfkit"), 1);
async function renderPdfText(params) {
  const { title, text, outputPath } = params;
  await new Promise((resolve, reject) => {
    const doc = new import_pdfkit.default({ size: "A4", margin: 40 });
    const stream = import_fs6.default.createWriteStream(outputPath);
    doc.pipe(stream);
    if (title) {
      doc.fontSize(16).text(title, { align: "left" });
      doc.moveDown(0.5);
    }
    doc.fontSize(11).text(text, {
      align: "left",
      width: 500
    });
    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

// job-cannon/pdf/exportJobPdf.ts
async function exportJobPdf(params) {
  const { jobDir } = params;
  const sourceMdPath = params.sourceMdPath ?? import_path6.default.join(jobDir, "generated", "ApplicationPack.md");
  const pdfPath = import_path6.default.join(jobDir, "generated", "ApplicationPack.pdf");
  if (!import_fs7.default.existsSync(sourceMdPath)) {
    return { pdfPath, wrote: false };
  }
  const md = import_fs7.default.readFileSync(sourceMdPath, "utf8");
  const text = markdownToText(md);
  await renderPdfText({
    title: "ApplicationPack",
    text,
    outputPath: pdfPath
  });
  return { pdfPath, wrote: true };
}

// job-cannon/cli.ts
var import_fs14 = __toESM(require("fs"), 1);
var import_path12 = __toESM(require("path"), 1);
var import_url6 = require("url");

// job-cannon/profile/loadCandidateProfile.ts
var import_fs8 = __toESM(require("fs"), 1);
var import_path7 = __toESM(require("path"), 1);
function loadCandidateProfile() {
  const ws = getWorkspace();
  const p = ws.candidateProfilePath;
  if (!import_fs8.default.existsSync(p)) {
    const alt = import_path7.default.join(import_path7.default.dirname(ws.root), "candidateProfile.json");
    if (import_fs8.default.existsSync(alt)) {
      return JSON.parse(import_fs8.default.readFileSync(alt, "utf8"));
    }
    return candidateProfile;
  }
  return JSON.parse(import_fs8.default.readFileSync(p, "utf8"));
}

// job-cannon/utils.ts
function slugify(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 80);
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function dedupeLines(text) {
  const lines = text.split(/\r?\n/);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const l of lines) {
    const key = l.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out.join("\n");
}

// job-cannon/fitScore.ts
var hasAny = (haystack, needles) => {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
};
function scoreJobFit(jobText) {
  const t = jobText.toLowerCase();
  let score = 0;
  const reasons = [];
  const riskFlags = [];
  if (hasAny(t, ["react"])) {
    score += 3;
    reasons.push("React mentioned");
  }
  if (hasAny(t, ["typescript", "type script", "ts"])) {
    score += 2;
    reasons.push("TypeScript mentioned");
  }
  if (hasAny(t, ["tailwind"])) {
    score += 1;
    reasons.push("Tailwind mentioned");
  }
  if (hasAny(t, ["vite"])) {
    score += 1;
    reasons.push("Vite mentioned");
  }
  const isSenior = hasAny(t, ["senior", "principal", "staff", "lead"]) || /\b(10\+|8\+|7\+)\s*years\b/i.test(jobText);
  const mentionsJunior = hasAny(t, ["junior", "entry", "entry-level", "mid level", "intern"]) || /\b(0-?1|1-?2)\s*\+?\s*years\b/i.test(jobText);
  if (mentionsJunior) {
    score += 2;
    reasons.push("Junior/entry language present");
  }
  if (isSenior) {
    score -= 2;
    riskFlags.push("senior-only phrasing");
    reasons.push("senior/lead language present (risk)");
  }
  if (hasAny(t, ["remote", "fully remote"])) {
    score += 1;
    reasons.push("Remote mentioned");
  }
  if (hasAny(t, ["latam", "latin america", "argentina", "buenos aires", "remote-latam"])) {
    score += 1;
    reasons.push("LATAM/Argentina language present");
  }
  if (hasAny(t, ["english", "fluent", "c1", "c2", "b2"])) {
    score += 1;
    reasons.push("English requirement mentioned");
  }
  if (hasAny(t, ["api", "rest", "graphql", "integration"])) {
    score += 2;
    reasons.push("API/integration mentioned");
  }
  if (hasAny(t, ["dashboard", "ui", "product", "frontend", "application"])) {
    score += 1;
    reasons.push("frontend/product language present");
  }
  if (hasAny(t, ["degree is required", "four-year college", "bachelor", "degree required"])) {
    score -= 2;
    riskFlags.push("degree hard requirement");
  }
  if (hasAny(t, ["unpaid test", "test"]) && hasAny(t, ["unpaid"])) {
    score -= 1;
    riskFlags.push("unpaid test risk");
  }
  if (hasAny(t, ["crypto", "gambling", "weird", "casino"])) {
    score -= 2;
    riskFlags.push("crypto/gambling/weirdness");
  }
  score = clamp(score, 0, 10);
  const seniorOnlyRisk = isSenior && !mentionsJunior;
  let applyDecision = "SKIP";
  if (score >= 7 && !seniorOnlyRisk) applyDecision = "APPLY";
  else if (score >= 5) applyDecision = "MAYBE";
  return {
    score0to10: score,
    applyDecision,
    reasons,
    riskFlags
  };
}

// job-cannon/proofMatch.ts
function hasAny2(haystack, needles) {
  const t = haystack.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}
function pickProofProject(jobText, projects) {
  const t = jobText.toLowerCase();
  const preferCatIntAssist = hasAny2(t, ["dashboard", "real-time", "real time", "live", "api", "integration", "bilingual", "medical", "transcription", "translation", "workflow"]) || hasAny2(t, ["reliability", "production", "stable", "debug"]);
  const preferCatReader = hasAny2(t, ["pdf", "reader", "ocr", "document", "content", "persistence", "sync", "data heavy", "data-heavy"]);
  const preferTmmStore = hasAny2(t, ["landing", "ecommerce", "checkout", "cart", "whatsapp", "menu", "orders", "commerce"]);
  let chosen = projects.find((p) => p.id === "catintassist") ?? projects[0];
  if (preferCatReader) chosen = projects.find((p) => p.id === "catreader") ?? chosen;
  if (preferTmmStore) chosen = projects.find((p) => p.id === "tmmstore") ?? chosen;
  if (preferCatIntAssist && !preferCatReader && !preferTmmStore) chosen = projects.find((p) => p.id === "catintassist") ?? chosen;
  const explanationLines = [];
  explanationLines.push(chosen.description);
  if (preferCatReader) explanationLines.push("Job language matches data-heavy UI + document-like UX (CatReader).");
  if (preferCatIntAssist) explanationLines.push("Job language matches production workflow UI + API integration (CatIntAssist).");
  if (preferTmmStore) explanationLines.push("Job language matches landing/ecommerce/ordering UX (Tmm Store).");
  return {
    projectId: chosen.id,
    projectName: chosen.name,
    projectLink: chosen.github,
    explanation: dedupeLines(explanationLines.join("\n"))
  };
}

// job-cannon/truthGuard.ts
var bannedEmailDomains = ["gatrivi.dev@gmail.com"];
function containsAny(text, needles) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}
function validateGeneratedText(params) {
  const problems = [];
  const { text, email, expectedEmail } = params;
  if (containsAny(text, [
    "expert",
    "world-class",
    "top-tier",
    "leverage",
    "excited to",
    "i am excited",
    "rockstar",
    "ninja",
    "guru",
    "10x"
  ])) {
    problems.push("AI-ish/hype language detected.");
  }
  if (/\b\d+\s*\+?\s*years\b/i.test(text) || /\b\d+\s*-\s*\d+\s*years\b/i.test(text)) {
    problems.push("Mentions years of experience.");
  }
  if (containsAny(text, ["senior engineer", "principal", "staff", "lead"])) {
    problems.push("Contains seniority title claims.");
  }
  if (email !== expectedEmail) {
    problems.push("Email mismatch (forbidden or different domain).");
  }
  if (containsAny(text, bannedEmailDomains)) {
    problems.push("Forbidden email domain mentioned.");
  }
  if (containsAny(text, ["example.com", "your-link", "todo", "todo:", "[todo]", "(none)", "(job link not provided)", "job link not provided"])) {
    problems.push("Dead/placeholder link markers detected.");
  }
  if (/\]\(\s*\)/.test(text)) {
    problems.push("Empty URL in markdown link detected.");
  }
  return { ok: problems.length === 0, problems };
}

// job-cannon/templates.ts
function formatApplicationPack(params) {
  const {
    jobCompany,
    jobRole,
    jobLink,
    fitScore,
    riskFlags,
    candidate,
    proofProjectText,
    formAnswers,
    application100,
    application50,
    salaryAnswer,
    availabilityAnswer,
    technicalTalkingPoint,
    recruiterDM,
    followUpMessage,
    interviewPrepTalkingPoint,
    claimSafetyNotes,
    whyThisRole,
    aiMeta
  } = params;
  const formSection = Object.entries(formAnswers).map(([k, v]) => `${k}
${v}`).join("\n\n");
  return `# ApplicationPack \u2014 ${jobCompany} | ${jobRole}

Job link:
${jobLink}

Fit score:
${fitScore}/10

Risk flags:
${riskFlags.length ? riskFlags.map((r) => `- ${r}`).join("\n") : "- none"}

---

## 1) Application (100 words)
${application100}

---

## 2) Application (50 words)
${application50}

---

## 3) Form answers (copy/paste)
${formSection}

---

## 4) Salary answer
${salaryAnswer}

---

## 5) Availability answer
${availabilityAnswer}

---

## 6) Project to show
${proofProjectText.projectName}

Explanation:
${proofProjectText.explanation}
${proofProjectText.projectLink ? `
Project link:
${proofProjectText.projectLink}` : ""}

---

## 7) Technical talking point (interview)
${technicalTalkingPoint}

---

## 8) Recruiter DM (copy/paste)
${recruiterDM}

---

## 9) Follow-up message (copy/paste)
${followUpMessage}

---

## 10) Interview prep talking point
${interviewPrepTalkingPoint}

---

${whyThisRole ? `## 11) Why this role
${whyThisRole}

---

` : ""}## ${whyThisRole ? "12" : "11"} Claim-safety check notes
${claimSafetyNotes.length ? claimSafetyNotes.map((n) => `- ${n}`).join("\n") : "- none"}
${aiMeta ? `

---

_AI: ${aiMeta.provider} / ${aiMeta.model}_` : ""}
`;
}

// job-cannon/runner.ts
var import_fs10 = __toESM(require("fs"), 1);
var import_path9 = __toESM(require("path"), 1);
var import_crypto6 = __toESM(require("crypto"), 1);
var import_url3 = require("url");

// job-cannon/jobSource.ts
var import_fs9 = __toESM(require("fs"), 1);
var import_path8 = __toESM(require("path"), 1);
var import_crypto5 = __toESM(require("crypto"), 1);
function normalizeUrl2(url) {
  if (!url) return void 0;
  try {
    const u = new URL(url);
    u.hash = "";
    const toStrip = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"];
    for (const k of toStrip) u.searchParams.delete(k);
    return u.toString().replace(/\/+$/, "");
  } catch {
    return url.trim().replace(/\/+$/, "");
  }
}
function extractField(line) {
  const m = line.match(/^([A-Za-z][A-Za-z0-9 /_-]*):\s*(.*)$/);
  if (!m) return null;
  const key = m[1].trim();
  const value = m[2].trim();
  return { key, value };
}
function parseJobBlock(block) {
  const text = block.trim();
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  let url;
  let title;
  let company;
  let source;
  let i = 0;
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    const f = extractField(l);
    if (!f) break;
    const k = f.key.toLowerCase();
    const v = f.value;
    if (k === "url") url = v;
    else if (k === "title") title = v;
    else if (k === "company") company = v;
    else if (k === "source") source = v;
    else {
    }
  }
  const rawText = text;
  return { url, title, company, source, rawText };
}
function sha256(text) {
  return import_crypto5.default.createHash("sha256").update(text, "utf8").digest("hex");
}
function ensureDir2(p) {
  import_fs9.default.mkdirSync(p, { recursive: true });
}
async function jobSource(inboxFilePath, jobsDirPath) {
  const result = { parsed: 0, inserted: 0, updated: 0, skipped: 0 };
  if (!import_fs9.default.existsSync(inboxFilePath)) {
    throw new Error(`Missing inbox file: ${inboxFilePath}`);
  }
  const content = import_fs9.default.readFileSync(inboxFilePath, "utf8");
  const blocks = content.split(/^---JOB---$/m).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const parsed = parseJobBlock(block);
    if (!parsed) continue;
    result.parsed++;
    const urlNorm = normalizeUrl2(parsed.url);
    const company = parsed.company ?? "Unknown company";
    const title = parsed.title ?? "React/front-end role";
    const rawTextHash = approxTextHash(parsed.rawText) || sha256(parsed.rawText);
    const id = sha256(`${urlNorm ?? ""}||${company}||${title}||${rawTextHash}`).slice(0, 20);
    const slug = slugify(`${company}-${title}-${urlNorm ?? rawTextHash.slice(0, 8)}`);
    const queueBefore = loadApplyQueue();
    const companyTitleKey2 = `${company.trim().toLowerCase()}||${title.trim().toLowerCase()}`;
    const duplicate = queueBefore.find((j) => {
      const jUrl = normalizeUrl2(j.url);
      const jKey = `${(j.company ?? "").trim().toLowerCase()}||${(j.title ?? "").trim().toLowerCase()}`;
      if (urlNorm && jUrl && urlNorm === jUrl) return true;
      if (companyTitleKey2 && jKey && companyTitleKey2 === jKey) return true;
      if (j.rawTextHash && j.rawTextHash === rawTextHash) return true;
      return false;
    });
    const upserted = upsertJobInQueue({
      id,
      slug,
      company,
      title,
      url: urlNorm,
      source: parsed.source,
      rawTextHash,
      status: "sourced",
      decision: "UNKNOWN",
      dates: { updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
    if (duplicate && duplicate.rawTextHash === rawTextHash) {
      result.skipped++;
    } else if (duplicate) {
      result.updated++;
    } else {
      result.inserted++;
    }
    const jobDir = import_path8.default.join(jobsDirPath, upserted.slug);
    ensureDir2(jobDir);
    import_fs9.default.writeFileSync(import_path8.default.join(jobDir, "job.md"), parsed.rawText, "utf8");
    import_fs9.default.writeFileSync(
      import_path8.default.join(jobDir, "meta.json"),
      JSON.stringify(
        {
          source: parsed.source ?? "inbox",
          jobCompany: company,
          jobRole: title,
          jobLink: urlNorm,
          createdAtISO: (/* @__PURE__ */ new Date()).toISOString()
        },
        null,
        2
      ),
      "utf8"
    );
  }
  return result;
}

// job-cannon/runner.ts
var import_meta3 = {};
var __filename2 = (0, import_url3.fileURLToPath)(import_meta3.url);
var __dirname2 = import_path9.default.dirname(__filename2);
function jobsDir() {
  return getWorkspace().jobsDir;
}
function inboxPath() {
  return getWorkspace().inboxPath;
}
function rankedPath() {
  return getWorkspace().rankedPath;
}
function pasteBankAllPath() {
  return getWorkspace().pasteBankAllPath;
}
function exists(p) {
  try {
    import_fs10.default.accessSync(p);
    return true;
  } catch {
    return false;
  }
}
function sha2562(text) {
  return import_crypto6.default.createHash("sha256").update(text, "utf8").digest("hex");
}
function ensureDir3(p) {
  import_fs10.default.mkdirSync(p, { recursive: true });
}
function writeRankedJobs(queue) {
  const ranked = stableSortQueue(queue).filter((j) => (j.decision ?? "UNKNOWN") !== "SKIP" && (j.status === "ranked" || j.status === "apply_today")).slice(0, 30);
  const lines = ["# Ranked Jobs", "", "| Company | Role | Link | Fit | Risk | Priority | Status |", "|---|---|---|---:|---|---:|---|"];
  for (const j of ranked) {
    lines.push(
      `| ${j.company ?? "Unknown"} | ${j.title ?? "React role"} | ${j.url ?? "(none)"} | ${j.fitScore ?? ""} | ${j.riskFlags?.length ? j.riskFlags.join(", ") : "-"} | ${j.priority ?? ""} | ${j.status} |`
    );
  }
  import_fs10.default.writeFileSync(rankedPath(), lines.join("\n"), "utf8");
}
function createPasteBankBundle() {
  const dir = jobsDir();
  const entries = exists(dir) ? import_fs10.default.readdirSync(dir) : [];
  const parts = [];
  for (const slug of entries) {
    const p = import_path9.default.join(dir, slug, "generated", "PasteBank.txt");
    if (!exists(p)) continue;
    parts.push(`===== ${slug} =====
` + import_fs10.default.readFileSync(p, "utf8"));
  }
  if (parts.length) {
    import_fs10.default.writeFileSync(pasteBankAllPath(), parts.join("\n\n"), "utf8");
  }
}
function syncJobsDirToQueue() {
  const dir = jobsDir();
  if (!exists(dir)) return { synced: 0, total: 0 };
  let synced = 0;
  const slugs = import_fs10.default.readdirSync(dir);
  for (const slug of slugs) {
    const jobDir = import_path9.default.join(dir, slug);
    const metaPath = import_path9.default.join(jobDir, "meta.json");
    const jobMdPath = import_path9.default.join(jobDir, "job.md");
    if (!exists(metaPath) || !exists(jobMdPath)) continue;
    const meta = JSON.parse(import_fs10.default.readFileSync(metaPath, "utf8"));
    const rawText = import_fs10.default.readFileSync(jobMdPath, "utf8");
    const rawTextHash = approxTextHash(rawText);
    const company = meta.jobCompany;
    const title = meta.jobRole;
    const url = meta.jobLink;
    const id = sha2562(`${url ?? ""}||${company}||${title}||${rawTextHash}`).slice(0, 20);
    const queue = loadApplyQueue();
    const already = queue.find((j) => j.slug === slug || j.id === id);
    if (already) continue;
    const hasPack = exists(import_path9.default.join(jobDir, "generated", "ApplicationPack.md"));
    upsertJobInQueue({
      id,
      slug,
      company,
      title,
      url,
      source: meta.source,
      rawTextHash,
      status: hasPack ? "apply_today" : "sourced",
      decision: "UNKNOWN",
      dates: { sourcedAt: meta.createdAtISO, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
    synced++;
  }
  return { synced, total: slugs.length };
}
async function runJobSource() {
  const inbox = inboxPath();
  if (!exists(inbox)) {
    ensureDir3(import_path9.default.dirname(inbox));
    import_fs10.default.writeFileSync(inbox, "---JOB---\nURL: \nTitle: \nCompany: \nSource: Pasted\n\nPaste full job text here...\n", "utf8");
  }
  return jobSource(inbox, jobsDir());
}
function addJobDirect(input) {
  const company = input.company?.trim() || "Unknown company";
  const title = input.title?.trim() || "React/front-end role";
  const rawText = input.rawText.trim();
  if (!rawText) throw new Error("Job description text is required.");
  const rawTextHash = approxTextHash(rawText);
  const id = sha2562(`${input.url ?? ""}||${company}||${title}||${rawTextHash}`).slice(0, 20);
  const slug = slugify(`${company}-${title}-${input.url ?? rawTextHash.slice(0, 8)}`);
  const jobDir = import_path9.default.join(jobsDir(), slug);
  ensureDir3(jobDir);
  import_fs10.default.writeFileSync(import_path9.default.join(jobDir, "job.md"), rawText, "utf8");
  import_fs10.default.writeFileSync(
    import_path9.default.join(jobDir, "meta.json"),
    JSON.stringify(
      {
        source: input.source ?? "dashboard",
        jobCompany: company,
        jobRole: title,
        jobLink: input.url,
        createdAtISO: (/* @__PURE__ */ new Date()).toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
  return upsertJobInQueue({
    id,
    slug,
    company,
    title,
    url: input.url,
    source: input.source ?? "dashboard",
    rawTextHash,
    status: "sourced",
    decision: "UNKNOWN",
    dates: { sourcedAt: (/* @__PURE__ */ new Date()).toISOString(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
  });
}
function getJobArtifacts(slug) {
  const jobDir = import_path9.default.join(jobsDir(), slug);
  if (!exists(jobDir)) return null;
  const read = (rel) => {
    const p = import_path9.default.join(jobDir, rel);
    return exists(p) ? import_fs10.default.readFileSync(p, "utf8") : void 0;
  };
  const scoreRaw = read("generated/score.json");
  let score;
  if (scoreRaw) {
    try {
      const parsed = JSON.parse(scoreRaw);
      score = { fit: parsed.fit ?? parsed };
    } catch {
    }
  }
  return {
    slug,
    applicationPack: read("generated/ApplicationPack.md"),
    pasteBank: read("generated/PasteBank.txt"),
    interviewPrep: read("generated/InterviewPrep.md"),
    followUps: read("generated/FollowUps.md"),
    state: read("generated/state.md"),
    score
  };
}
async function runJobCannon(generateForJob2, flags = {}) {
  const queue = loadApplyQueue();
  const targets = queue.filter(
    (j) => ["new", "sourced", "shortlisted", "ranked", "apply_today"].includes(j.status)
  );
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let packed = 0;
  let ranked = 0;
  for (const record of targets) {
    const jobDir = import_path9.default.join(jobsDir(), record.slug);
    const jobMdPath = import_path9.default.join(jobDir, "job.md");
    if (!exists(jobDir) || !exists(jobMdPath)) {
      record.status = "archived";
      record.decision = "UNKNOWN";
      record.notes = (record.notes ? record.notes + "\n" : "") + "Missing job.md under jobs/<slug>.";
      continue;
    }
    const jobText = import_fs10.default.readFileSync(jobMdPath, "utf8");
    const fit = scoreJobFit(jobText);
    record.fitScore = fit.score0to10;
    record.riskFlags = fit.riskFlags;
    record.decision = fit.applyDecision;
    record.priority = fit.score0to10;
    record.dates.rankedAt = record.dates.rankedAt ?? now;
    const packAlready = exists(import_path9.default.join(jobDir, "generated", "ApplicationPack.md")) && exists(import_path9.default.join(jobDir, "generated", "PasteBank.txt"));
    const shouldPack = fit.applyDecision === "APPLY" && fit.score0to10 >= 7 && (flags.force || !packAlready);
    if (shouldPack) {
      await generateForJob2(jobDir);
      record.status = "apply_today";
      record.dates.packedAt = now;
      record.generatedPaths = {
        dir: import_path9.default.join(jobDir, "generated"),
        applicationPackMd: "ApplicationPack.md",
        pasteBankTxt: "PasteBank.txt",
        followUpsMd: "FollowUps.md",
        interviewPrepMd: "InterviewPrep.md"
      };
      packed++;
    } else if (packAlready && fit.applyDecision === "APPLY" && fit.score0to10 >= 7) {
      record.status = "apply_today";
    } else {
      record.status = "ranked";
      ranked++;
    }
    record.nextAction = record.status === "apply_today" ? "Manually submit application (copy/paste pack)" : "Review and shortlist";
    record.nextActionAt = now;
    record.dates.updatedAt = now;
  }
  saveApplyQueue(stableSortQueue(queue));
  createPasteBankBundle();
  writeRankedJobs(queue);
  return { packed, ranked, queueSize: queue.length };
}

// job-cannon/profile/loadFormAnswers.ts
var import_fs11 = __toESM(require("fs"), 1);
var import_path10 = __toESM(require("path"), 1);
var import_url4 = require("url");
var import_meta4 = {};
var __filename3 = (0, import_url4.fileURLToPath)(import_meta4.url);
var __dirname3 = import_path10.default.dirname(__filename3);
function formAnswersPath() {
  return getWorkspace().formAnswersPath;
}
function loadFormAnswers() {
  const p = formAnswersPath();
  if (!import_fs11.default.existsSync(p)) {
    return {
      fullName: "[PLACEHOLDER]",
      email: "[PLACEHOLDER]",
      phone: "[PLACEHOLDER]",
      location: "[PLACEHOLDER]",
      linkedin: "[PLACEHOLDER]",
      github: "[PLACEHOLDER]",
      portfolio: "[PLACEHOLDER]",
      availability: "[PLACEHOLDER]",
      salaryExpectation: "[PLACEHOLDER]"
    };
  }
  const raw = import_fs11.default.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw);
  return parsed;
}

// job-cannon/ai/loadResumeContext.ts
var import_fs12 = __toESM(require("fs"), 1);
function loadResumeContext() {
  const ws = getWorkspace();
  const resumePath = ws.resumeMdPath;
  let resumeText = "";
  if (import_fs12.default.existsSync(resumePath)) {
    resumeText = import_fs12.default.readFileSync(resumePath, "utf8").slice(0, 12e3);
  }
  const candidateProfile2 = loadCandidateProfile();
  const proofs = candidateProfile2.proofProjects.map((p) => `- ${p.name}${p.github ? ` (${p.github})` : ""}: ${p.description}`).join("\n");
  return `Candidate: ${candidateProfile2.fullName}
Email (use exactly): ${candidateProfile2.email}
Location: ${candidateProfile2.location}
LinkedIn: ${candidateProfile2.linkedin}
GitHub: ${candidateProfile2.github}
Portfolio: ${candidateProfile2.portfolio}

Proof projects (only cite these):
${proofs}

Resume excerpt:
${resumeText || "(no resume.md yet \u2014 use candidate profile fields)"}`;
}

// job-cannon/ai/tailorPack.ts
var JSON_SHAPE = `{
  "application100": "string (~100 words, direct cover letter opening)",
  "application50": "string (~50 words, shorter variant)",
  "technicalTalkingPoint": "string (1 concrete React/API/state pattern from proof project)",
  "recruiterDM": "string (short LinkedIn-style DM)",
  "followUpMessage": "string (polite follow-up after applying)",
  "interviewPrepTalkingPoint": "string (one feature to defend end-to-end)",
  "whyThisRole": "string (2-3 sentences, specific to this job)",
  "interviewPrepAddon": "string (markdown: 3 job-specific interview questions + brief prep notes)"
}`;
function buildSystemPrompt() {
  const candidateProfile2 = loadCandidateProfile();
  return `You are a job-application writing assistant for a real React/TypeScript developer.
Output ONLY valid JSON matching this shape (no markdown fences, no commentary):
${JSON_SHAPE}

Hard rules (violations = rejection):
- NEVER invent years of experience or seniority titles (no "senior", "lead", "principal", "staff").
- NEVER use hype/AI clich\xE9s: expert, world-class, excited to, leverage, rockstar, ninja, guru, 10x.
- ONLY cite proof projects listed in the candidate context \u2014 do not invent employers or products.
- Use email exactly: ${candidateProfile2.email}
- Tone: direct, calm, specific \u2014 like a skilled developer writing to a hiring manager.
- Mention the chosen proof project with concrete UI/API/reliability details from the job posting.
- English application copy; candidate is bilingual (English fluent, Spanish native) \u2014 mention only if relevant.
- Do not claim a college degree unless explicitly in resume context.`;
}
function buildUserPrompt(params) {
  const resumeContext = loadResumeContext();
  return `Tailor application assets for this job.

Company: ${params.jobCompany}
Role: ${params.jobRole}
Job link: ${params.jobLink}
Fit score: ${params.fitScore}/10
Risk flags: ${params.riskFlags.length ? params.riskFlags.join(", ") : "none"}

Primary proof project: ${params.proofProjectName}
${params.proofProjectLink ? `Proof link: ${params.proofProjectLink}` : ""}
Why this proof: ${params.proofExplanation}

Job posting:
"""
${params.jobText.slice(0, 14e3)}
"""

Candidate context:
${resumeContext}

${params.fixInstructions ? `Fix these truth-guard problems from prior draft:
${params.fixInstructions}` : ""}`;
}
function parseTailoredJson(raw) {
  const parsed = safeParseJson(raw);
  const req = (k) => {
    const v = parsed[k];
    if (typeof v !== "string" || !v.trim()) throw new Error(`Missing or invalid field: ${k}`);
    return v.trim();
  };
  return {
    application100: req("application100"),
    application50: req("application50"),
    technicalTalkingPoint: req("technicalTalkingPoint"),
    recruiterDM: req("recruiterDM"),
    followUpMessage: req("followUpMessage"),
    interviewPrepTalkingPoint: req("interviewPrepTalkingPoint"),
    whyThisRole: req("whyThisRole"),
    interviewPrepAddon: req("interviewPrepAddon")
  };
}
function runTruthGuard(text) {
  const candidateProfile2 = loadCandidateProfile();
  return validateGeneratedText({
    text,
    email: candidateProfile2.email,
    expectedEmail: candidateProfile2.email
  });
}
async function tailorApplicationPack(params) {
  if (!getLLMStatus().available) return null;
  const system = buildSystemPrompt();
  let fixInstructions;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { content, provider, model } = await callLLMChat(
        system,
        buildUserPrompt({ ...params, fixInstructions }),
        { temperature: 0.35, maxTokens: 4096 }
      );
      const parsed = parseTailoredJson(content);
      const combined = parsed.application100 + "\n" + parsed.application50 + "\n" + parsed.recruiterDM + "\n" + parsed.whyThisRole;
      const guard = runTruthGuard(combined);
      const claimSafetyNotes = [
        "AI-tailored draft \u2014 review before sending.",
        `Generated via ${provider}/${model}.`
      ];
      if (!guard.ok) {
        if (attempt === 0) {
          fixInstructions = guard.problems.join("; ");
          continue;
        }
        claimSafetyNotes.push(`Truth-guard warnings: ${guard.problems.join("; ")}`);
      }
      return {
        ...parsed,
        claimSafetyNotes,
        aiProvider: provider,
        aiModel: model
      };
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

// job-cannon/pdf/exportCvPdf.ts
var import_fs13 = __toESM(require("fs"), 1);
var import_path11 = __toESM(require("path"), 1);
var import_url5 = require("url");
var import_meta5 = {};
async function exportCvPdf(params) {
  const __filename5 = (0, import_url5.fileURLToPath)(import_meta5.url);
  const __dir = import_path11.default.dirname(__filename5);
  const repoRoot = import_path11.default.join(__dir, "..", "..");
  const sourceMdPath = params?.sourceMdPath ?? import_path11.default.join(repoRoot, "resume.md");
  const pdfDir = import_path11.default.join(process.cwd(), "dist", "cv");
  const pdfPath = import_path11.default.join(pdfDir, "Gaston_Trivi_React_Developer.pdf");
  import_fs13.default.mkdirSync(pdfDir, { recursive: true });
  if (!import_fs13.default.existsSync(sourceMdPath)) {
    return { pdfPath, wrote: false };
  }
  const md = import_fs13.default.readFileSync(sourceMdPath, "utf8");
  const text = markdownToText(md);
  await renderPdfText({
    title: "Gaston Trivi \u2014 React Developer",
    text,
    outputPath: pdfPath
  });
  return { pdfPath, wrote: true };
}

// job-cannon/discovery/feeds.ts
var import_crypto7 = __toESM(require("crypto"), 1);
var DEFAULT_UA = "CatResumeMaker-JobDiscovery/1.4 (+https://github.com/gatrivi/catresumaker)";
function discoverId(url, company, title) {
  const key = `${url ?? ""}||${company}||${title}`;
  return import_crypto7.default.createHash("sha256").update(key, "utf8").digest("hex").slice(0, 16);
}
function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": DEFAULT_UA },
    signal: AbortSignal.timeout(2e4)
  });
  if (!res.ok) throw new Error(`Feed ${url} returned ${res.status}`);
  return res.json();
}
async function fetchRemotiveJobs() {
  const data = await fetchJson("https://remotive.com/api/remote-jobs?category=software-dev");
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    const title = j.title?.trim() || "Software role";
    const company = j.company_name?.trim() || "Unknown";
    const description = stripHtml(j.description ?? "").slice(0, 12e3);
    return {
      discoverId: discoverId(j.url, company, title),
      title,
      company,
      url: j.url,
      description: description || title,
      source: "remotive",
      publishedAt: j.publication_date,
      location: j.candidate_required_location,
      tags: j.tags
    };
  });
}
async function fetchRemoteOkJobs() {
  const data = await fetchJson("https://remoteok.com/api");
  if (!Array.isArray(data)) return [];
  return data.filter((j) => j && typeof j === "object" && (j.position || j.company)).map((j) => {
    const title = (j.position ?? "").trim() || "Remote role";
    const company = (j.company ?? "").trim() || "Unknown";
    const url = j.url?.startsWith("http") ? j.url : j.url ? `https://remoteok.com${j.url}` : void 0;
    const description = stripHtml(j.description ?? "").slice(0, 12e3);
    return {
      discoverId: discoverId(url, company, title),
      title,
      company,
      url,
      description: description || title,
      source: "remoteok",
      publishedAt: j.date,
      location: j.location,
      tags: Array.isArray(j.tags) ? j.tags.map(String) : void 0
    };
  });
}
async function fetchArbeitnowJobs() {
  const data = await fetchJson("https://www.arbeitnow.com/api/job-board-api");
  const jobs = data.data ?? [];
  return jobs.map((j) => {
    const title = j.title?.trim() || "Tech role";
    const company = j.company_name?.trim() || "Unknown";
    const url = j.url?.startsWith("http") ? j.url : j.slug ? `https://www.arbeitnow.com${j.slug}` : void 0;
    const description = stripHtml(j.description ?? "").slice(0, 12e3);
    return {
      discoverId: discoverId(url, company, title),
      title,
      company,
      url,
      description: description || title,
      source: "arbeitnow",
      publishedAt: j.created_at,
      location: j.remote ? "Remote" : j.location,
      tags: j.tags
    };
  });
}
async function fetchJobicyJobs() {
  const data = await fetchJson("https://jobicy.com/api/v2/remote-jobs?count=50&industry=tech");
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    const title = j.jobTitle?.trim() || "Remote role";
    const company = j.companyName?.trim() || "Unknown";
    const url = j.url;
    const description = stripHtml(j.jobDescription ?? "").slice(0, 12e3);
    const tags = [...j.jobIndustry ?? [], ...j.jobType ?? []];
    return {
      discoverId: discoverId(url, company, title),
      title,
      company,
      url,
      description: description || title,
      source: "jobicy",
      publishedAt: j.pubDate,
      location: j.jobGeo,
      tags: tags.length ? tags : void 0
    };
  });
}

// job-cannon/discovery/obscura.ts
var import_child_process = require("child_process");

// job-cannon/discovery/policy.ts
var BLOCKED_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "careerbuilder.com"
];
var ALLOWED_FETCH_HOSTS = [
  "jobs.lever.co",
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.ashbyhq.com",
  "apply.workable.com",
  "careers.smartrecruiters.com",
  "jobs.smartrecruiters.com",
  "teamtailor.com",
  "jobs.teamtailor.com",
  "remotive.com",
  "remoteok.com",
  "weworkremotely.com",
  "hnhiring.com",
  "news.ycombinator.com"
];
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
function isBlockedUrl(url) {
  const h = hostOf(url);
  if (!h) return true;
  return BLOCKED_HOSTS.some((b) => h === b || h.endsWith(`.${b}`));
}
function isAllowedFetchUrl(url) {
  const h = hostOf(url);
  if (!h || isBlockedUrl(url)) return false;
  return ALLOWED_FETCH_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
}
var lastFetchByUser = /* @__PURE__ */ new Map();
var MIN_FETCH_INTERVAL_MS = Number(process.env.OBSCURA_MIN_INTERVAL_MS ?? 4e3);
function checkFetchRateLimit(userId) {
  const now = Date.now();
  const last = lastFetchByUser.get(userId) ?? 0;
  const elapsed = now - last;
  if (elapsed < MIN_FETCH_INTERVAL_MS) {
    return { ok: false, waitMs: MIN_FETCH_INTERVAL_MS - elapsed };
  }
  lastFetchByUser.set(userId, now);
  return { ok: true };
}

// job-cannon/discovery/obscura.ts
var probeCache = null;
var PROBE_TTL_MS = 10 * 60 * 1e3;
function obscuraBin() {
  return process.env.OBSCURA_BIN?.trim() || "obscura";
}
function dumpMode() {
  return process.env.OBSCURA_DUMP === "text" ? "text" : "markdown";
}
function stealthOn() {
  return process.env.OBSCURA_STEALTH === "1" || process.env.OBSCURA_STEALTH === "true";
}
function getObscuraStatus() {
  const bin = obscuraBin();
  return {
    configured: !!bin,
    available: probeCache?.ok ?? false,
    bin,
    dumpMode: dumpMode(),
    stealth: stealthOn()
  };
}
async function probeObscura(force = false) {
  if (!force && probeCache && Date.now() - probeCache.at < PROBE_TTL_MS) {
    return probeCache.ok;
  }
  const bin = obscuraBin();
  const ok = await new Promise((resolve) => {
    const child = (0, import_child_process.spawn)(
      bin,
      ["fetch", "https://example.com", "--dump", "text", "--quiet", "--timeout", "12"],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let stdout = "";
    child.stdout.on("data", (c) => stdout += c.toString());
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0 && stdout.trim().length > 0));
  });
  probeCache = { at: Date.now(), ok };
  return ok;
}
async function fetchPageTextWithObscura(url) {
  if (!isAllowedFetchUrl(url)) {
    throw new Error("URL host not on allowlist (LinkedIn/Indeed blocked; use ATS links only)");
  }
  const available = await probeObscura();
  if (!available) {
    throw new Error(
      "Obscura not available \u2014 run npm run obscura:install or set OBSCURA_BIN to the binary path"
    );
  }
  const bin = obscuraBin();
  const mode = dumpMode();
  const args = [
    "fetch",
    url,
    "--dump",
    mode,
    "--wait-until",
    "networkidle0",
    "--timeout",
    String(process.env.OBSCURA_TIMEOUT_SEC ?? 25),
    "--quiet"
  ];
  if (stealthOn()) args.push("--stealth");
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => stdout += c.toString());
    child.stderr.on("data", (c) => stderr += c.toString());
    child.on("error", (err) => reject(new Error(`Obscura not found (${bin}): ${err.message}`)));
    child.on("close", (code) => {
      const text = stdout.trim();
      if (code !== 0 || !text) {
        reject(new Error(stderr.trim() || `Obscura exited ${code}`));
        return;
      }
      resolve(text.slice(0, 5e4));
    });
  });
}

// job-cannon/discovery/discover.ts
var DEFAULT_KEYWORDS = ["react", "typescript", "frontend", "javascript", "vite", "remote"];
var ALL_SOURCES = ["remotive", "remoteok", "arbeitnow", "jobicy"];
var fetchers = {
  remotive: fetchRemotiveJobs,
  remoteok: fetchRemoteOkJobs,
  arbeitnow: fetchArbeitnowJobs,
  jobicy: fetchJobicyJobs
};
function normKeywords(input) {
  const kws = (input?.length ? input : DEFAULT_KEYWORDS).map((k) => k.trim().toLowerCase()).filter(Boolean);
  return [...new Set(kws)];
}
function matchesKeywords(job, keywords) {
  const hay = `${job.title} ${job.company} ${job.description} ${(job.tags ?? []).join(" ")}`.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}
function markQueued(jobs) {
  const queue = loadApplyQueue();
  const urls = new Set(queue.map((q) => q.url?.toLowerCase()).filter(Boolean));
  const keys = new Set(queue.map((q) => `${q.company?.toLowerCase()}||${q.title?.toLowerCase()}`));
  return jobs.map((j) => {
    const key = `${j.company.toLowerCase()}||${j.title.toLowerCase()}`;
    const alreadyQueued = !!(j.url && urls.has(j.url.toLowerCase())) || keys.has(key);
    const previewFit = scoreJobFit(j.description).score0to10;
    return { ...j, alreadyQueued, previewFit };
  });
}
async function searchPublicFeeds(input = {}) {
  const keywords = normKeywords(input.keywords);
  const sourcesIn = input.sources?.length ? input.sources.filter((s) => ALL_SOURCES.includes(s)) : ALL_SOURCES;
  const sources = sourcesIn.length ? sourcesIn : ALL_SOURCES;
  const limit = Math.min(Math.max(input.limit ?? 40, 5), 80);
  const results = [];
  const status = Object.fromEntries(ALL_SOURCES.map((s) => [s, false]));
  await Promise.all(
    sources.map(
      (source) => fetchers[source]().then((jobs) => {
        status[source] = true;
        results.push(...jobs);
      }).catch(() => {
        status[source] = false;
      })
    )
  );
  const seen = /* @__PURE__ */ new Set();
  const filtered = markQueued(
    results.filter((j) => matchesKeywords(j, keywords)).filter((j) => {
      if (seen.has(j.discoverId)) return false;
      seen.add(j.discoverId);
      return true;
    }).sort((a, b) => (b.previewFit ?? 0) - (a.previewFit ?? 0)).slice(0, limit)
  );
  return {
    jobs: filtered,
    sources: status,
    keywords,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function importDiscoveredJobs(jobs) {
  let imported = 0;
  let skipped = 0;
  const records = [];
  for (const j of jobs) {
    if (j.alreadyQueued) {
      skipped++;
      continue;
    }
    const rawText = [
      `Title: ${j.title}`,
      `Company: ${j.company}`,
      j.url ? `URL: ${j.url}` : "",
      j.location ? `Location: ${j.location}` : "",
      `Source: ${j.source}`,
      "",
      j.description
    ].filter(Boolean).join("\n");
    records.push(
      addJobDirect({
        url: j.url,
        title: j.title,
        company: j.company,
        rawText,
        source: `discover:${j.source}`
      })
    );
    imported++;
  }
  return { imported, skipped, records };
}
function capturePageJob(input) {
  if (input.url && isBlockedUrl(input.url)) {
    throw new Error("Cannot capture from blocked platform \u2014 paste text manually instead");
  }
  const rawText = input.rawText.trim();
  if (rawText.length < 80) throw new Error("Job text too short (min ~80 chars)");
  return addJobDirect({
    url: input.url,
    title: input.title,
    company: input.company,
    rawText,
    source: input.source ?? "page-capture"
  });
}
function parseJobMetaFromText(rawText, url) {
  const titleLine = rawText.match(/^title:\s*(.+)$/im)?.[1]?.trim();
  const companyLine = rawText.match(/^company:\s*(.+)$/im)?.[1]?.trim();
  if (titleLine || companyLine) {
    return { title: titleLine, company: companyLine };
  }
  let company = companyLine;
  if (url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("lever.co")) {
        const seg = u.pathname.split("/").filter(Boolean)[0];
        if (seg) company = seg.replace(/-/g, " ");
      } else if (u.hostname.includes("greenhouse.io")) {
        const seg = u.pathname.split("/").filter(Boolean)[0];
        if (seg && seg !== "jobs" && seg !== "embed") company = seg.replace(/-/g, " ");
      }
    } catch {
    }
  }
  const h1 = rawText.match(/^#\s+(.{5,120})$/m)?.[1]?.trim();
  const roleMatch = rawText.match(
    /(?:^|\n)(.{8,120}(?:engineer|developer|frontend|react|typescript|software)[^\n]*)/i
  );
  return {
    title: h1 ?? roleMatch?.[1]?.trim(),
    company
  };
}
async function fetchJobUrlForUser(userId, url) {
  if (isBlockedUrl(url)) {
    throw new Error("Blocked platform \u2014 browse manually and use page capture");
  }
  const rate = checkFetchRateLimit(userId);
  if (!rate.ok) {
    throw new Error(`Rate limit \u2014 wait ${Math.ceil(rate.waitMs / 1e3)}s`);
  }
  const pageText = await fetchPageTextWithObscura(url);
  if (pageText.length < 80) throw new Error("Page returned too little text");
  const meta = parseJobMetaFromText(pageText, url);
  return {
    rawText: [`URL: ${url}`, meta.company ? `Company: ${meta.company}` : "", `Source: obscura`, "", pageText].filter(Boolean).join("\n"),
    title: meta.title,
    company: meta.company
  };
}

// job-cannon/cli.ts
var import_meta6 = {};
var __filename4 = (0, import_url6.fileURLToPath)(import_meta6.url);
var __dirname4 = import_path12.default.dirname(__filename4);
var JOBS_DIR = import_path12.default.join(__dirname4, "jobs");
function ensureDir4(p) {
  import_fs14.default.mkdirSync(p, { recursive: true });
}
function exists2(p) {
  try {
    import_fs14.default.accessSync(p);
    return true;
  } catch {
    return false;
  }
}
function readFileText(p) {
  return import_fs14.default.readFileSync(p, "utf8");
}
function safeWrite(p, text) {
  ensureDir4(import_path12.default.dirname(p));
  import_fs14.default.writeFileSync(p, text, "utf8");
}
function normalizeWhitespace(s) {
  return s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function parseArgs(argv) {
  const out = {};
  const args = [...argv];
  const positional = [];
  while (args.length) {
    const a = args.shift();
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[0];
      if (next && !next.startsWith("--")) {
        out[key] = args.shift();
      } else {
        out[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { out, positional };
}
function guessCompanyAndRole(jobText) {
  const t = jobText.replace(/\s+/g, " ").trim();
  const m2 = t.match(/Company:\s*(.*?)\s+(Role|Position|Title)/i);
  const mRole = t.match(/([A-Za-z0-9 &/()_-]{0,40}React[A-Za-z0-9 &/()_-]{0,40}(Engineer|Developer)[A-Za-z0-9 &/()_-]{0,40})/i) || t.match(/([A-Za-z0-9 &/()_-]{0,40}Frontend[A-Za-z0-9 &/()_-]{0,40}(Engineer|Developer)[A-Za-z0-9 &/()_-]{0,40})/i);
  if (m2) {
    return { company: m2[1].slice(0, 60), role: "Frontend React role" };
  }
  if (mRole) {
    const idx = t.toLowerCase().indexOf(mRole[1].toLowerCase());
    const before = idx > 0 ? t.slice(0, idx).trim() : "";
    const companyGuess = before.split(/[|—-]/)[0]?.trim() || "Unknown company";
    return { company: companyGuess.slice(0, 60), role: mRole[1].slice(0, 80) };
  }
  return { company: "Unknown company", role: "React/front-end role" };
}
function getFormAnswers() {
  const f = loadFormAnswers();
  const candidateProfile2 = loadCandidateProfile();
  return {
    "Resume/CV": "[PLACEHOLDER]",
    "Full name": candidateProfile2.fullName,
    Email: f.email || candidateProfile2.email,
    Phone: f.phone || candidateProfile2.phone,
    "Current location": f.location || candidateProfile2.location,
    "Current company": candidateProfile2.currentCompany,
    "LinkedIn URL": f.linkedin || candidateProfile2.linkedin,
    "GitHub URL": f.github || candidateProfile2.github,
    "Twitter URL": "N/A",
    "Portfolio URL": f.portfolio || candidateProfile2.portfolio,
    "Are you currently an employee or contractor?": f.workAuthorization || "Contractor",
    "What is your desired annual salary? (Please list the amount and currency)": f.salaryExpectation || candidateProfile2.desiredSalary,
    "How soon can you start?": f.availability || candidateProfile2.startTiming
  };
}
function buildApplicationText(params) {
  const candidateProfile2 = loadCandidateProfile();
  const { jobCompany, jobRole, proofProjectName, proofProjectLink, proofExplanation, salaryExpectation, availability } = params;
  const proofLine = proofProjectLink ? `${proofProjectName} (${proofProjectLink})` : proofProjectName;
  const application100 = `Hi ${jobCompany} team \u2014 I\u2019m applying for the ${jobRole} role. I build production-ready React/TypeScript frontend features with clean component structure, predictable state, and careful API/data-contract integration. My main proof is ${proofLine}, where I focus on reliability and fast iteration in real workflows (bilingual/medical domain). I work well with product, design, and backend teammates, and I\u2019m comfortable debugging UI edge cases and shipping improvements quickly. I speak English fluently and Spanish native. Thanks for your time.`;
  const application50 = `Hi ${jobCompany} team \u2014 I\u2019m applying for the ${jobRole} role. I build production-ready React/TypeScript UI with dependable state handling and careful API integration. My main proof is ${proofProjectName}, a reliability-focused React app used in real bilingual/medical workflows. English fluent.`;
  const salaryAnswer = salaryExpectation;
  const availabilityAnswer = availability;
  const technicalTalkingPoint = "In my React projects, I keep UI state predictable by separating \u201Cdata/API state\u201D from \u201Cpresentation state,\u201D making API failures visible but non-blocking, and designing typed boundaries to prevent regressions as features evolve.";
  const recruiterDM = `Hi \u2014 I\u2019m Gast\xF3n Alejandro Trivi. I\u2019m applying for the ${jobRole} role. My relevant proof is ${proofProjectName} (React/TypeScript, reliability-first). If helpful, I can share short examples of UI state handling + API integration patterns I used there. Thanks.`;
  const followUpMessage = `Hi ${jobCompany} team \u2014 following up on my application for ${jobRole}. I\u2019m still very interested. If you\u2019d like, I can add a short note with the most relevant UI/API integration details from ${proofProjectName}. Thanks.`;
  const interviewPrepTalkingPoint = "Defend one feature from your proof project end-to-end: what the UI needed, what the API/data contract was, how you modeled state, what failures you handled, and what you improved after feedback.";
  const claimSafetyNotes = [
    "No fabricated years of experience; language avoids seniority titles you don\u2019t own.",
    "No marketing/hype phrases that sound AI-generated.",
    "Uses only your proof projects as evidence.",
    "Uses `gatrivi@gmail.com` (not the forbidden domain)."
  ];
  const truthGuard = validateGeneratedText({
    text: application100 + "\n" + application50,
    email: candidateProfile2.email,
    expectedEmail: candidateProfile2.email
  });
  if (!truthGuard.ok) {
    claimSafetyNotes.push(`Truth-guard problems: ${truthGuard.problems.join("; ")}`);
  }
  return {
    application100,
    application50,
    salaryAnswer,
    availabilityAnswer,
    technicalTalkingPoint,
    recruiterDM,
    followUpMessage,
    interviewPrepTalkingPoint,
    claimSafetyNotes
  };
}
function buildInterviewPrep(jobRole, proofProjectName) {
  const tellMeAboutYou = "I\u2019m a frontend React developer focused on production reliability: clean component structure, predictable state, and careful API/data-contract integration. I\u2019ve built real React apps for high-pressure bilingual workflows and I iterate quickly based on feedback.";
  return `# InterviewPrep \u2014 ${jobRole}

## 5 likely React questions
1. How do you structure async API state and avoid inconsistent UI?
2. How do you prevent unnecessary re-renders in React?
3. What\u2019s your approach to typed boundaries between UI and API responses?
4. How do you handle loading/error/empty states consistently?
5. How do you debug a production UI edge case?

## 5 likely project questions
1. Walk through a feature from UI requirement to API integration.
2. What state model did you pick and why?
3. What failures did you anticipate (and how did you surface them)?
4. What did you improve after user feedback?
5. How did you keep UI behavior reliable during frequent updates?

## 3 weak spots to prepare
1. Tooling gaps vs the job\u2019s exact stack (if mentioned): I will learn the missing pieces quickly and keep delivery quality high.
2. Any testing/framework specifics: I\u2019ll describe the testing mindset and how I\u2019d adapt to their preferred stack.
3. Senior/degree constraints: I\u2019ll be transparent that my experience comes from production work (freelance + tools I maintain).

## 3 strong talking points
1. I ship maintainable React features with predictable state handling.
2. I integrate APIs carefully and handle failure modes intentionally.
3. My proof project ${proofProjectName} is reliability-focused in real workflows.

## 1 concise \u201Ctell me about yourself\u201D pitch
${tellMeAboutYou}

## 1 \u201Cwhy this role\u201D
I want a frontend role where I can build dependable React/TypeScript UI, integrate with APIs cleanly, and iterate quickly with product/design/backend collaboration.

## 1 \u201Cwhy should we hire you\u201D
Because I combine real React shipping, API integration discipline, and reliability-first UI engineering\u2014plus clear English communication and fast ramping.
`;
}
function buildFollowUps(jobCompany, jobRole) {
  return `# FollowUps \u2014 ${jobCompany} | ${jobRole}

Applied: (fill date)
Follow up: (fill 2026-06-30 style date)
Second follow up: (fill 2026-07-07 style date)
Status: waiting

## Template 1 (polite follow-up)
Hi ${jobCompany} team \u2014 following up on my application for ${jobRole}. I\u2019m still interested and would appreciate any update on next steps. Thanks.

## Template 2 (recruiter DM)
Hi \u2014 I\u2019m Gast\xF3n Alejandro Trivi. I applied for the ${jobRole} role. I can share a short note about relevant UI/API integration patterns from my React proof projects. Thanks.

## Template 3 (technical proof follow-up)
Hi ${jobCompany} team \u2014 quick follow-up. If helpful, I can point to the exact UI state handling + API integration patterns I used in my React proof project (reliability-focused). Thanks.
`;
}
async function fetchUrlText(url) {
  const res = await fetch(url);
  const text = await res.text();
  return text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}
async function jobNew(source, flags) {
  ensureDir4(JOBS_DIR);
  const companyFlag = typeof flags.company === "string" ? flags.company : void 0;
  const roleFlag = typeof flags.role === "string" ? flags.role : void 0;
  const linkFlag = typeof flags.link === "string" ? flags.link : void 0;
  const slugFlag = typeof flags.slug === "string" ? flags.slug : void 0;
  let raw = "";
  let detectedCompany = companyFlag;
  let detectedRole = roleFlag;
  const possiblePath = import_path12.default.isAbsolute(source) ? source : import_path12.default.join(process.cwd(), source);
  if (exists2(possiblePath) && import_fs14.default.statSync(possiblePath).isFile()) {
    raw = readFileText(possiblePath);
  } else if (/^https?:\/\//i.test(source)) {
    raw = await fetchUrlText(source).catch(() => "");
  } else {
    raw = source;
  }
  raw = normalizeWhitespace(raw);
  if (!raw) throw new Error(`Could not load job text from source: ${source}`);
  if (!detectedCompany || !detectedRole) {
    const guess = guessCompanyAndRole(raw);
    detectedCompany = detectedCompany ?? guess.company;
    detectedRole = detectedRole ?? guess.role;
  }
  const slug = slugFlag ?? slugify(`${detectedCompany}-${detectedRole}-${source}`);
  const jobDir = import_path12.default.join(JOBS_DIR, slug);
  ensureDir4(jobDir);
  const meta = {
    source,
    jobCompany: detectedCompany,
    jobRole: detectedRole,
    jobLink: linkFlag ?? (/^https?:\/\//i.test(source) ? source : void 0),
    createdAtISO: (/* @__PURE__ */ new Date()).toISOString()
  };
  safeWrite(import_path12.default.join(jobDir, "job.md"), raw);
  safeWrite(import_path12.default.join(jobDir, "meta.json"), JSON.stringify(meta, null, 2));
  return { slug, jobDir };
}
function readJobMeta(jobDir) {
  return JSON.parse(import_fs14.default.readFileSync(import_path12.default.join(jobDir, "meta.json"), "utf8"));
}
function readJobText(jobDir) {
  return import_fs14.default.readFileSync(import_path12.default.join(jobDir, "job.md"), "utf8");
}
function pickProof(projects, jobText) {
  const p = pickProofProject(jobText, projects);
  return p;
}
function applicationPackPath(jobDir) {
  return import_path12.default.join(jobDir, "generated", "ApplicationPack.md");
}
function pasteBankPath(jobDir) {
  return import_path12.default.join(jobDir, "generated", "PasteBank.txt");
}
function interviewPrepPath(jobDir) {
  return import_path12.default.join(jobDir, "generated", "InterviewPrep.md");
}
function followUpsPath(jobDir) {
  return import_path12.default.join(jobDir, "generated", "FollowUps.md");
}
function scoreFile(jobDir) {
  return import_path12.default.join(jobDir, "generated", "score.json");
}
function jobStateFile(jobDir) {
  return import_path12.default.join(jobDir, "generated", "state.md");
}
function renderJobState(jobDir, meta, score) {
  const lines = [];
  lines.push(`# JobState \u2014 ${meta.jobCompany} | ${meta.jobRole}`);
  lines.push(``);
  lines.push(`Link: ${meta.jobLink ?? "(none)"}`);
  lines.push(``);
  lines.push(`Fit: ${score.fit.score0to10}/10`);
  lines.push(`Decision: ${score.fit.applyDecision}`);
  lines.push(``);
  lines.push(`Proof: ${score.proofProjectName}`);
  if (score.proofProjectLink) lines.push(`Proof link: ${score.proofProjectLink}`);
  lines.push(``);
  lines.push(`Reasons: ${score.fit.reasons.join(", ") || "-"}`);
  lines.push(``);
  lines.push(`Risk flags: ${score.fit.riskFlags.join(", ") || "-"}`);
  safeWrite(jobStateFile(jobDir), lines.join("\n"));
}
async function jobScore(slug) {
  const entries = import_fs14.default.existsSync(JOBS_DIR) ? import_fs14.default.readdirSync(JOBS_DIR) : [];
  const targets = slug ? [import_path12.default.join(JOBS_DIR, slug)] : entries.map((e) => import_path12.default.join(JOBS_DIR, e));
  for (const jobDir of targets) {
    if (!exists2(jobDir) || !exists2(import_path12.default.join(jobDir, "job.md"))) continue;
    const meta = readJobMeta(jobDir);
    const jobText = readJobText(jobDir);
    const fit = scoreJobFit(jobText);
    const proof = pickProof(loadCandidateProfile().proofProjects, jobText);
    const scoreState = {
      fit,
      proofProjectId: proof.projectId,
      proofProjectName: proof.projectName,
      proofProjectLink: proof.projectLink,
      updatedAtISO: (/* @__PURE__ */ new Date()).toISOString()
    };
    safeWrite(scoreFile(jobDir), JSON.stringify(scoreState, null, 2));
    renderJobState(jobDir, meta, scoreState);
  }
}
function loadScore(jobDir) {
  const p = scoreFile(jobDir);
  if (!exists2(p)) return null;
  return JSON.parse(import_fs14.default.readFileSync(p, "utf8"));
}
async function generateForJob(jobDir, opts) {
  const candidateProfile2 = loadCandidateProfile();
  const meta = readJobMeta(jobDir);
  const jobText = readJobText(jobDir);
  const scoreState = loadScore(jobDir) ?? {
    fit: scoreJobFit(jobText),
    proofProjectId: "catintassist",
    proofProjectName: "CatIntAssist",
    updatedAtISO: (/* @__PURE__ */ new Date()).toISOString()
  };
  const proof = pickProof(candidateProfile2.proofProjects, jobText);
  const fitDecision = scoreState.fit.applyDecision;
  if (fitDecision !== "APPLY" || scoreState.fit.score0to10 < 7) {
    return { generated: false, reason: "Not APPLY / score < 7" };
  }
  const proofProject = candidateProfile2.proofProjects.find((p) => p.id === proof.projectId) ?? candidateProfile2.proofProjects[0];
  const proofProjectText = {
    projectName: proofProject.name,
    projectLink: proofProject.github ?? proofProject.url,
    explanation: proofProject.description + "\n" + proof.explanation
  };
  const { jobCompany, jobRole, jobLink } = meta;
  const formAnswers = getFormAnswers();
  const salaryExpectation = formAnswers["What is your desired annual salary? (Please list the amount and currency)"] ?? candidateProfile2.desiredSalary;
  const availability = formAnswers["How soon can you start?"] ?? candidateProfile2.startTiming;
  let applicationText = buildApplicationText({
    jobCompany,
    jobRole,
    proofProjectName: proofProjectText.projectName,
    proofProjectLink: proofProjectText.projectLink,
    proofExplanation: proofProjectText.explanation,
    salaryExpectation,
    availability
  });
  let whyThisRole;
  let aiMeta;
  let interviewPrepAddon = "";
  const tryAi = opts?.forceAi || getLLMStatus().available;
  if (tryAi) {
    const tailored = await tailorApplicationPack({
      jobCompany,
      jobRole,
      jobText,
      jobLink: typeof jobLink === "string" ? jobLink.trim() : "",
      fitScore: scoreState.fit.score0to10,
      riskFlags: scoreState.fit.riskFlags,
      proofProjectName: proofProjectText.projectName,
      proofProjectLink: proofProjectText.projectLink,
      proofExplanation: proofProjectText.explanation
    });
    if (tailored) {
      applicationText = {
        application100: tailored.application100,
        application50: tailored.application50,
        salaryAnswer: salaryExpectation,
        availabilityAnswer: availability,
        technicalTalkingPoint: tailored.technicalTalkingPoint,
        recruiterDM: tailored.recruiterDM,
        followUpMessage: tailored.followUpMessage,
        interviewPrepTalkingPoint: tailored.interviewPrepTalkingPoint,
        claimSafetyNotes: tailored.claimSafetyNotes
      };
      whyThisRole = tailored.whyThisRole;
      aiMeta = { provider: tailored.aiProvider, model: tailored.aiModel };
      interviewPrepAddon = tailored.interviewPrepAddon;
    }
  }
  const applicationTextFinal = applicationText;
  const jobLinkValue = typeof jobLink === "string" ? jobLink.trim() : "";
  if (!jobLinkValue) {
    return { generated: false, reason: "Missing job link in meta.json" };
  }
  const packText = formatApplicationPack({
    jobCompany,
    jobRole,
    jobLink: jobLinkValue,
    fitScore: scoreState.fit.score0to10,
    riskFlags: scoreState.fit.riskFlags,
    candidate: candidateProfile2,
    proofProjectText,
    formAnswers,
    application100: applicationTextFinal.application100,
    application50: applicationTextFinal.application50,
    salaryAnswer: applicationTextFinal.salaryAnswer,
    availabilityAnswer: applicationTextFinal.availabilityAnswer,
    technicalTalkingPoint: applicationTextFinal.technicalTalkingPoint,
    recruiterDM: applicationTextFinal.recruiterDM,
    followUpMessage: applicationTextFinal.followUpMessage,
    interviewPrepTalkingPoint: applicationTextFinal.interviewPrepTalkingPoint,
    claimSafetyNotes: applicationTextFinal.claimSafetyNotes,
    whyThisRole,
    aiMeta
  });
  const guard = validateGeneratedText({
    text: packText,
    email: candidateProfile2.email,
    expectedEmail: candidateProfile2.email
  });
  if (!guard.ok) {
    return { generated: false, reason: `Truth-guard failed: ${guard.problems.join("; ")}` };
  }
  safeWrite(applicationPackPath(jobDir), packText);
  const desiredSalaryForForm = salaryExpectation;
  const startDateForForm = availability;
  const pasteTextWithForm = `[full_name]
${candidateProfile2.fullName}

[email]
${candidateProfile2.email}

[phone]
${candidateProfile2.phone}

[current_location]
${candidateProfile2.location}

[current_company]
${candidateProfile2.currentCompany}

[linkedin]
${candidateProfile2.linkedin}

[github]
${candidateProfile2.github}

[portfolio]
${candidateProfile2.portfolio}

[desired_salary]
${desiredSalaryForForm}

[start_date]
${startDateForForm}

[application_100]
${applicationTextFinal.application100}

[application_50]
${applicationTextFinal.application50}

[technical_talking_point]
${applicationTextFinal.technicalTalkingPoint}

[recruiter_dm]
${applicationTextFinal.recruiterDM}

[follow_up_message]
${applicationTextFinal.followUpMessage}

[interview_prep_talking_point]
${applicationTextFinal.interviewPrepTalkingPoint}
`;
  safeWrite(pasteBankPath(jobDir), pasteTextWithForm);
  safeWrite(followUpsPath(jobDir), buildFollowUps(jobCompany, jobRole));
  const baseInterview = buildInterviewPrep(jobRole, proofProject.name);
  safeWrite(
    interviewPrepPath(jobDir),
    interviewPrepAddon ? `${baseInterview}

## Job-specific prep (AI)
${interviewPrepAddon}` : baseInterview
  );
  return { generated: true };
}
function buildDashboard() {
  const entries = exists2(JOBS_DIR) ? import_fs14.default.readdirSync(JOBS_DIR) : [];
  const rows = [];
  rows.push(`# Job Cannon Dashboard`);
  rows.push(``);
  rows.push(`Found jobs: ${entries.length}`);
  rows.push(``);
  rows.push(`| Company | Role | Decision | Score | Next action | Files |`);
  rows.push(`|---|---|---|---:|---|---|`);
  for (const slug of entries) {
    const jobDir = import_path12.default.join(JOBS_DIR, slug);
    const metaPath = import_path12.default.join(jobDir, "meta.json");
    const scoreP = scoreFile(jobDir);
    if (!exists2(metaPath) || !exists2(scoreP)) continue;
    const meta = JSON.parse(import_fs14.default.readFileSync(metaPath, "utf8"));
    const scoreState = JSON.parse(import_fs14.default.readFileSync(scoreP, "utf8"));
    const generatedDir = import_path12.default.join(jobDir, "generated");
    const files = exists2(generatedDir) ? import_fs14.default.readdirSync(generatedDir) : [];
    const hasPack = files.some((f) => f.toLowerCase().includes("applicationpack"));
    const hasPaste = files.some((f) => f.toLowerCase().includes("pastebank"));
    const nextAction = scoreState.fit.applyDecision === "APPLY" ? hasPack && hasPaste ? "Paste + submit manually" : "Run job:pack" : "Skip / review later";
    rows.push(`| ${meta.jobCompany} | ${meta.jobRole} | ${scoreState.fit.applyDecision} | ${scoreState.fit.score0to10} | ${nextAction} | ${files.join(", ")} |`);
  }
  safeWrite(import_path12.default.join(__dirname4, "dashboard.md"), rows.join("\n"));
}
function createPasteBankBundle2() {
  const entries = exists2(JOBS_DIR) ? import_fs14.default.readdirSync(JOBS_DIR) : [];
  const parts = [];
  for (const slug of entries) {
    const jobDir = import_path12.default.join(JOBS_DIR, slug);
    const p = pasteBankPath(jobDir);
    if (!exists2(p)) continue;
    parts.push(`===== ${slug} =====
` + import_fs14.default.readFileSync(p, "utf8"));
  }
  if (!parts.length) return;
  safeWrite(import_path12.default.join(__dirname4, "PasteBank_All.txt"), parts.join("\n\n"));
}
async function jobPack(slug) {
  const entries = exists2(JOBS_DIR) ? import_fs14.default.readdirSync(JOBS_DIR) : [];
  const targets = slug ? [slug] : entries;
  for (const s of targets) {
    const jobDir = import_path12.default.join(JOBS_DIR, s);
    if (!exists2(jobDir)) continue;
    if (!exists2(import_path12.default.join(jobDir, "job.md"))) continue;
    await generateForJob(jobDir);
  }
  createPasteBankBundle2();
  buildDashboard();
}
function listJobs() {
  const entries = exists2(JOBS_DIR) ? import_fs14.default.readdirSync(JOBS_DIR) : [];
  console.log(`Job Cannon: ${entries.length} jobs found (some may be missing score/meta).`);
  for (const slug of entries) {
    const jobDir = import_path12.default.join(JOBS_DIR, slug);
    const metaP = import_path12.default.join(jobDir, "meta.json");
    const scoreP = scoreFile(jobDir);
    if (!exists2(metaP)) continue;
    const meta = JSON.parse(import_fs14.default.readFileSync(metaP, "utf8"));
    const scoreState = exists2(scoreP) ? JSON.parse(import_fs14.default.readFileSync(scoreP, "utf8")) : null;
    console.log(
      `- ${slug}: ${meta.jobCompany} | ${meta.jobRole} | ${scoreState ? `${scoreState.fit.applyDecision} (${scoreState.fit.score0to10}/10)` : "not scored"}`
    );
  }
}
async function jobSeed() {
  ensureDir4(JOBS_DIR);
  const seeds = [
    {
      slug: "blackbirdlab-junior-frontend-engineer",
      company: "Blackbird Lab",
      role: "Junior Frontend Engineer",
      jobLink: "https://viumavaga.com.br/conecta/oportunidade/junior-frontend-engineer-remote-latam-0f2a40c7f6256f7b9d9345d08cd990a4/",
      text: "PLACEHOLDER seed job text (not full source). Role: Junior Frontend Engineer, Remote LATAM. Mentions React, TypeScript, Tailwind, GraphQL advantages; English upper-intermediate; component-driven UI."
    },
    {
      slug: "bluelight-react-engineer",
      company: "Bluelight Consulting",
      role: "React Engineer (Remote, Latin America)",
      jobLink: "https://jobs.lever.co/bluelightconsulting/8a814b05-5ef0-428f-8022-037205ae9014",
      text: "PLACEHOLDER seed job text (not full source). Role: React Engineer. Requires 3+ years React/prof dev; large/complex systems; degree required; extreme ownership; CI/CD; Remote LATAM; English required."
    },
    {
      slug: "zensors-frontend-web-developer",
      company: "Zensors",
      role: "Frontend Web Developer (React/Typescript)",
      jobLink: "https://careers.zensors.com/jobs/Qc_VY1AEfbC5/frontend-web-developer-react-typescript-remote",
      text: "PLACEHOLDER seed job text (not full source). Role: Frontend Web Developer, Remote Internship listing. Requires React SPA experience, responsive CSS, Git, component-driven development; mentions Data structures & Algorithms; Node/Docker/Postgres a plus."
    }
  ];
  for (const s of seeds) {
    const jobDir = import_path12.default.join(JOBS_DIR, s.slug);
    ensureDir4(jobDir);
    safeWrite(import_path12.default.join(jobDir, "job.md"), s.text);
    const meta = {
      source: "seed",
      jobCompany: s.company,
      jobRole: s.role,
      jobLink: s.jobLink,
      createdAtISO: (/* @__PURE__ */ new Date()).toISOString()
    };
    safeWrite(import_path12.default.join(jobDir, "meta.json"), JSON.stringify(meta, null, 2));
  }
}
async function main() {
  const { positional, out } = parseArgs(process.argv.slice(2));
  const cmd = positional.shift();
  if (!cmd) {
    console.log(
      "Job Cannon CLI. Usage:\n- job:new <url|path|text> [--company X] [--role Y] [--link url]\n- job:discover [keywords] [--import] [--limit N]\n- job:source\n- job:cannon [--force]\n- job:score [--slug slug]\n- job:pack [--slug slug]\n- job:seed\n- job:list\n- cv:pdf\n- job:pdf [--slug slug]"
    );
    return;
  }
  if (cmd === "new") {
    const source = positional[0];
    if (!source) throw new Error("Missing source. Use: job:new <url|path|text> [--company X] [--role Y]");
    const res = await jobNew(source, out);
    console.log(`Created job slug=${res.slug}`);
    return;
  }
  if (cmd === "seed") {
    await jobSeed();
    console.log("Seed jobs created.");
    return;
  }
  if (cmd === "discover") {
    const kwRaw = positional.join(" ").trim();
    const keywords = kwRaw ? kwRaw.split(/[,\s]+/).filter(Boolean) : void 0;
    const doImport = out.import === true || out.import === "true";
    const limit = out.limit ? Number(out.limit) : 25;
    const res = await searchPublicFeeds({ keywords, limit });
    if (doImport) {
      const imp = importDiscoveredJobs(res.jobs.filter((j) => !j.alreadyQueued));
      console.log(`discover: imported=${imp.imported} skipped=${imp.skipped} (feeds: ${JSON.stringify(res.sources)})`);
    } else {
      for (const j of res.jobs) {
        console.log(
          `${String(j.previewFit ?? "?").padStart(2)}/10  ${j.company?.slice(0, 24).padEnd(24)}  ${j.title?.slice(0, 40)}  [${j.source}]`
        );
      }
      console.log(`
discover: ${res.jobs.length} hits \u2014 feeds ${JSON.stringify(res.sources)}`);
      console.log("Tip: add --import to queue matches");
    }
    return;
  }
  if (cmd === "source") {
    const res = await runJobSource();
    console.log(
      `job:source done. parsed=${res.parsed} inserted=${res.inserted} updated=${res.updated} skipped=${res.skipped}`
    );
    return;
  }
  if (cmd === "cannon") {
    const force = out.force === true || out.force === "true";
    const res = await runJobCannon(generateForJob, { force });
    buildDashboard();
    console.log(`job:cannon done. packed=${res.packed} ranked=${res.ranked} queue=${res.queueSize}`);
    return;
  }
  if (cmd === "cv:pdf") {
    const res = await exportCvPdf();
    console.log(`cv:pdf ${res.wrote ? "wrote" : "skipped"}: ${res.pdfPath}`);
    return;
  }
  if (cmd === "job:pdf") {
    const slug = typeof out.slug === "string" ? out.slug : void 0;
    const entries = exists2(JOBS_DIR) ? import_fs14.default.readdirSync(JOBS_DIR) : [];
    const targets = slug ? [slug] : entries;
    let wrote = 0;
    for (const s of targets) {
      const jobDir = import_path12.default.join(JOBS_DIR, s);
      if (!exists2(jobDir)) continue;
      const r = await exportJobPdf({ jobDir });
      if (r.wrote) wrote++;
    }
    console.log(`job:pdf done. Wrote ${wrote} pdf(s).`);
    return;
  }
  if (cmd === "list") {
    listJobs();
    return;
  }
  if (cmd === "score") {
    const slug = typeof out.slug === "string" ? out.slug : void 0;
    await jobScore(slug);
    console.log("Scored.");
    return;
  }
  if (cmd === "pack") {
    const slug = typeof out.slug === "string" ? out.slug : void 0;
    await jobPack(slug);
    console.log("Packed. See generated files + PasteBank_All.txt.");
    return;
  }
  console.log(`Unknown cmd: ${cmd}`);
}
var isCliEntry = typeof process.argv[1] === "string" && (process.argv[1].endsWith("cli.ts") || process.argv[1].endsWith("cli.js"));
if (isCliEntry) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

// server/resumeMarkdown.ts
function resumeToMarkdown(resume) {
  const p = resume.personalInfo ?? {};
  const lines = [
    p.name ?? "",
    p.title ?? "",
    [p.email, p.phone, p.location].filter(Boolean).join(" | "),
    p.website ?? "",
    "",
    "SUMMARY",
    p.summary ?? "",
    ""
  ];
  if (resume.experience?.length) {
    lines.push("EXPERIENCE");
    for (const exp of resume.experience) {
      lines.push(`${exp.title ?? ""} \u2014 ${exp.company ?? ""} (${exp.dates ?? ""})`);
      for (const b of exp.bullets ?? []) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  if (resume.skills?.length) {
    lines.push("SKILLS");
    for (const s of resume.skills) {
      lines.push(`${s.category ?? ""}: ${(s.items ?? []).join(", ")}`);
    }
    lines.push("");
  }
  if (resume.projects?.length) {
    lines.push("PROJECTS");
    for (const pr of resume.projects) {
      lines.push(`${pr.name ?? ""}: ${pr.description ?? ""}`);
      if (pr.technologies?.length) lines.push(`Tech: ${pr.technologies.join(", ")}`);
    }
  }
  return lines.join("\n").trim() + "\n";
}

// server/routes/authAndJobs.ts
function registerAuthAndUserRoutes(app2, dataRoot, legacyJobCannonRoot) {
  const userStore = new UserStore(dataRoot);
  const userData = new UserDataStore(dataRoot);
  const requireAuth = createAuthMiddleware((id) => userStore.findById(id));
  async function asUser(userId, fn) {
    const ws = getUserWorkspace(userId, dataRoot);
    ensureUserWorkspace(ws);
    return runWithWorkspaceAsync(ws, async () => fn());
  }
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body ?? {};
      const user = await userStore.register(String(email ?? ""), String(password ?? ""), String(name ?? ""));
      const token = signToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
      });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message ?? "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      const user = await userStore.login(String(email ?? ""), String(password ?? ""));
      const token = signToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
      });
    } catch (e) {
      res.status(401).json({ success: false, error: e.message ?? "Login failed" });
    }
  });
  app2.get("/api/auth/me", requireAuth, (req, res) => {
    const u = req.user;
    res.json({
      success: true,
      user: { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt }
    });
  });
  app2.post("/api/auth/claim-legacy", requireAuth, (req, res) => {
    const result = userStore.claimLegacyJobCannon(req.user.id, legacyJobCannonRoot);
    res.json({ success: result.copied, ...result });
  });
  app2.get("/api/user/resume", requireAuth, (req, res) => {
    const resume = userData.readJson(req.user.id, "resume.json", null);
    res.json({ success: true, resume });
  });
  app2.put("/api/user/resume", requireAuth, (req, res) => {
    const resume = req.body?.resume ?? null;
    userData.writeJson(req.user.id, "resume.json", resume);
    if (resume && typeof resume === "object") {
      userData.writeText(req.user.id, "resume.md", resumeToMarkdown(resume));
    }
    res.json({ success: true });
  });
  app2.get("/api/user/logs", requireAuth, (req, res) => {
    res.json({ success: true, logs: userData.readJson(req.user.id, "logs.json", []) });
  });
  app2.put("/api/user/logs", requireAuth, (req, res) => {
    userData.writeJson(req.user.id, "logs.json", req.body?.logs ?? []);
    res.json({ success: true });
  });
  app2.get("/api/user/settings", requireAuth, (req, res) => {
    res.json({
      success: true,
      settings: userData.readJson(req.user.id, "settings.json", { templateId: "ats-classic", lang: "es" })
    });
  });
  app2.put("/api/user/settings", requireAuth, (req, res) => {
    userData.writeJson(req.user.id, "settings.json", req.body?.settings ?? {});
    res.json({ success: true });
  });
  app2.post("/api/user/import-local", requireAuth, (req, res) => {
    const { resume, logs, settings } = req.body ?? {};
    if (resume) {
      userData.writeJson(req.user.id, "resume.json", resume);
      userData.writeText(req.user.id, "resume.md", resumeToMarkdown(resume));
    }
    if (logs) userData.writeJson(req.user.id, "logs.json", logs);
    if (settings) userData.writeJson(req.user.id, "settings.json", settings);
    res.json({ success: true });
  });
  app2.get("/api/job-os/queue", requireAuth, async (req, res) => {
    const queue = await asUser(req.user.id, () => loadApplyQueue());
    res.json(queue);
  });
  app2.patch("/api/job-os/queue/:id", requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const patch = req.body ?? {};
    const updated = await asUser(req.user.id, () => updateJobStatus(id, patch));
    if (!updated) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    res.json({ success: true, updated });
  });
  app2.get("/api/job-os/paste/:id", requireAuth, async (req, res) => {
    const fs16 = await import("fs");
    const id = String(req.params.id);
    const result = await asUser(req.user.id, async () => {
      const queue = loadApplyQueue();
      const record = queue.find((j) => j.id === id || j.slug === id);
      if (!record?.slug) return null;
      const ws = getUserWorkspace(req.user.id, dataRoot);
      const pastePath = import_path13.default.join(ws.jobsDir, record.slug, "generated", "PasteBank.txt");
      if (!fs16.existsSync(pastePath)) return { missing: true };
      return { slug: record.slug, paste: fs16.readFileSync(pastePath, "utf8") };
    });
    if (!result) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    if ("missing" in result) {
      res.status(404).json({ success: false, error: "PasteBank.txt missing" });
      return;
    }
    res.json({ success: true, slug: result.slug, paste: result.paste });
  });
  app2.post("/api/job-os/export-pdf/:id", requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const result = await asUser(req.user.id, async () => {
      const queue = loadApplyQueue();
      const record = queue.find((j) => j.id === id || j.slug === id);
      if (!record?.slug) return null;
      const ws = getUserWorkspace(req.user.id, dataRoot);
      const jobDir = import_path13.default.join(ws.jobsDir, record.slug);
      return exportJobPdf({ jobDir });
    });
    if (!result) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    if (!result.wrote) {
      res.status(404).json({ success: false, error: "ApplicationPack.md missing" });
      return;
    }
    res.json({ success: true, wrote: true, pdfPath: result.pdfPath });
  });
  app2.post("/api/job-os/add", requireAuth, async (req, res) => {
    try {
      const { url, title, company, rawText, source } = req.body ?? {};
      if (!rawText || !String(rawText).trim()) {
        res.status(400).json({ success: false, error: "rawText is required" });
        return;
      }
      const record = await asUser(
        req.user.id,
        () => addJobDirect({
          url: url ? String(url) : void 0,
          title: title ? String(title) : void 0,
          company: company ? String(company) : void 0,
          rawText: String(rawText),
          source: source ? String(source) : "dashboard"
        })
      );
      res.json({ success: true, record });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message ?? "Failed to add job" });
    }
  });
  app2.post("/api/job-os/run/source", requireAuth, async (req, res) => {
    try {
      const result = await asUser(req.user.id, () => runJobSource());
      const queue = await asUser(req.user.id, () => loadApplyQueue());
      res.json({ success: true, ...result, queue });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message ?? "job:source failed" });
    }
  });
  app2.post("/api/job-os/run/sync", requireAuth, async (req, res) => {
    try {
      const result = await asUser(req.user.id, () => syncJobsDirToQueue());
      const queue = await asUser(req.user.id, () => loadApplyQueue());
      res.json({ success: true, ...result, queue });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message ?? "sync failed" });
    }
  });
  app2.post("/api/job-os/run/cannon", requireAuth, async (req, res) => {
    try {
      const force = !!req.body?.force;
      const result = await asUser(req.user.id, () => runJobCannon(generateForJob, { force }));
      const queue = await asUser(req.user.id, () => loadApplyQueue());
      res.json({ success: true, ...result, queue });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message ?? "job:cannon failed" });
    }
  });
  app2.get("/api/job-os/job/:id", requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const payload = await asUser(req.user.id, () => {
      const queue = loadApplyQueue();
      const record = queue.find((j) => j.id === id || j.slug === id);
      if (!record?.slug) return null;
      return { record, artifacts: getJobArtifacts(record.slug) };
    });
    if (!payload) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    res.json({ success: true, ...payload });
  });
  app2.get("/api/job-os/ranked", requireAuth, async (req, res) => {
    const fs16 = await import("fs");
    const text = await asUser(req.user.id, () => {
      const ws = getUserWorkspace(req.user.id, dataRoot);
      return fs16.existsSync(ws.rankedPath) ? fs16.readFileSync(ws.rankedPath, "utf8") : "# Ranked Jobs\n\n(empty)";
    });
    res.json({ success: true, markdown: text });
  });
  app2.post("/api/job-os/tailor/:id", requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const llm = getLLMStatus();
    if (!llm.available) {
      res.status(503).json({ success: false, error: "AI offline \u2014 set NVIDIA_API_KEY in .env" });
      return;
    }
    const payload = await asUser(req.user.id, async () => {
      const queue = loadApplyQueue();
      const record = queue.find((j) => j.id === id || j.slug === id);
      if (!record?.slug) return null;
      const ws = getUserWorkspace(req.user.id, dataRoot);
      const jobDir = import_path13.default.join(ws.jobsDir, record.slug);
      const result = await generateForJob(jobDir, { forceAi: true });
      if (!result.generated) return { error: result.reason ?? "Tailor failed" };
      return { record, artifacts: getJobArtifacts(record.slug) };
    });
    if (!payload) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    if ("error" in payload) {
      res.status(400).json({ success: false, error: payload.error });
      return;
    }
    res.json({
      success: true,
      record: payload.record,
      artifacts: payload.artifacts,
      llmProvider: llm.provider,
      llmModel: llm.model
    });
  });
  app2.get("/api/job-os/discover/status", requireAuth, async (_req, res) => {
    const obscura = getObscuraStatus();
    const available = await probeObscura();
    res.json({
      success: true,
      feeds: ["remotive", "remoteok", "arbeitnow", "jobicy"],
      obscura: { ...obscura, available },
      policy: "Public feeds + Obscura on allowlisted ATS. LinkedIn/Indeed blocked.",
      install: "npm run obscura:install"
    });
  });
  app2.post("/api/job-os/discover/search", requireAuth, async (req, res) => {
    try {
      const { keywords, sources, limit } = req.body ?? {};
      const result = await asUser(
        req.user.id,
        () => searchPublicFeeds({
          keywords: Array.isArray(keywords) ? keywords.map(String) : void 0,
          sources: Array.isArray(sources) ? sources : void 0,
          limit: limit ? Number(limit) : void 0
        })
      );
      res.json({ success: true, ...result });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message ?? "discover search failed" });
    }
  });
  app2.post("/api/job-os/discover/import", requireAuth, async (req, res) => {
    try {
      const jobs = req.body?.jobs;
      if (!Array.isArray(jobs) || !jobs.length) {
        res.status(400).json({ success: false, error: "jobs array required" });
        return;
      }
      const payload = await asUser(req.user.id, () => importDiscoveredJobs(jobs));
      const queue = await asUser(req.user.id, () => loadApplyQueue());
      res.json({ success: true, ...payload, queue });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message ?? "import failed" });
    }
  });
  app2.post("/api/job-os/discover/import-and-pack", requireAuth, async (req, res) => {
    try {
      const jobs = req.body?.jobs;
      if (!Array.isArray(jobs) || !jobs.length) {
        res.status(400).json({ success: false, error: "jobs array required" });
        return;
      }
      const payload = await asUser(req.user.id, () => importDiscoveredJobs(jobs));
      const cannon = await asUser(req.user.id, () => runJobCannon(generateForJob, { force: false }));
      const queue = await asUser(req.user.id, () => loadApplyQueue());
      res.json({ success: true, ...payload, cannon, queue });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message ?? "import-and-pack failed" });
    }
  });
  app2.post("/api/job-os/capture", requireAuth, async (req, res) => {
    try {
      const { url, title, company, rawText, source } = req.body ?? {};
      if (!rawText || !String(rawText).trim()) {
        res.status(400).json({ success: false, error: "rawText required" });
        return;
      }
      const record = await asUser(
        req.user.id,
        () => capturePageJob({
          url: url ? String(url) : void 0,
          title: title ? String(title) : void 0,
          company: company ? String(company) : void 0,
          rawText: String(rawText),
          source: source ? String(source) : "page-capture"
        })
      );
      const queue = await asUser(req.user.id, () => loadApplyQueue());
      res.json({ success: true, record, queue });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message ?? "capture failed" });
    }
  });
  app2.post("/api/job-os/discover/fetch-url", requireAuth, async (req, res) => {
    try {
      const url = String(req.body?.url ?? "").trim();
      if (!url) {
        res.status(400).json({ success: false, error: "url required" });
        return;
      }
      const pack = !!req.body?.pack;
      const fetched = await fetchJobUrlForUser(req.user.id, url);
      const record = await asUser(
        req.user.id,
        () => capturePageJob({
          url,
          title: fetched.title,
          company: fetched.company ?? (req.body?.company ? String(req.body.company) : void 0),
          rawText: fetched.rawText,
          source: "obscura"
        })
      );
      let cannon;
      if (pack) {
        cannon = await asUser(req.user.id, () => runJobCannon(generateForJob, { force: false }));
      }
      const queue = await asUser(req.user.id, () => loadApplyQueue());
      res.json({
        success: true,
        record,
        queue,
        cannon,
        preview: fetched.rawText.slice(0, 500),
        meta: { title: fetched.title, company: fetched.company }
      });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message ?? "fetch failed" });
    }
  });
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
var hasGeminiKey = !!process.env.GEMINI_API_KEY;
var hasFreeLLMApiKey = !!process.env.FREELLMAPI_API_KEY;
var hasNvidiaKey = !!process.env.NVIDIA_API_KEY;
function safeParseJsonLocal(text) {
  return safeParseJson(text);
}
async function callLLMForResume(systemPrompt, userPrompt) {
  const { content } = await callLLMChat(systemPrompt, userPrompt, { temperature: 0.2 });
  return content;
}
var aiClient = null;
function getGeminiClient2() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing. Set it in your local `.env` file (or environment variables) before using the AI endpoints."
      );
    }
    aiClient = new import_genai2.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.get("/api/health", (req, res) => {
  const llm = getLLMStatus();
  res.json({
    status: "ok",
    hasApiKey: llm.available,
    hasGeminiKey,
    hasFreeLLMApiKey,
    hasNvidiaKey,
    llmProvider: llm.provider,
    llmModel: llm.model
  });
});
var DATA_ROOT = getDataRoot();
var LEGACY_JOB_CANNON = getJobCannonRoot();
registerAuthAndUserRoutes(app, DATA_ROOT, LEGACY_JOB_CANNON);
var RESUME_SCHEMA = {
  type: import_genai2.Type.OBJECT,
  description: "A professional, highly structured ATS-friendly resume parsed from raw text.",
  properties: {
    personalInfo: {
      type: import_genai2.Type.OBJECT,
      properties: {
        name: { type: import_genai2.Type.STRING },
        title: { type: import_genai2.Type.STRING },
        email: { type: import_genai2.Type.STRING },
        phone: { type: import_genai2.Type.STRING },
        website: { type: import_genai2.Type.STRING },
        location: { type: import_genai2.Type.STRING },
        summary: { type: import_genai2.Type.STRING, description: "A high-impact 2-3 sentence professional summary focusing on core value." }
      },
      required: ["name", "title", "email", "phone", "summary"]
    },
    education: {
      type: import_genai2.Type.ARRAY,
      items: {
        type: import_genai2.Type.OBJECT,
        properties: {
          institution: { type: import_genai2.Type.STRING },
          degree: { type: import_genai2.Type.STRING },
          location: { type: import_genai2.Type.STRING },
          dates: { type: import_genai2.Type.STRING, description: "e.g., 2018 - 2022 or June 2020" },
          description: { type: import_genai2.Type.STRING, description: "GPA, awards, or major courses (optional)" }
        },
        required: ["institution", "degree", "dates"]
      }
    },
    experience: {
      type: import_genai2.Type.ARRAY,
      items: {
        type: import_genai2.Type.OBJECT,
        properties: {
          company: { type: import_genai2.Type.STRING },
          title: { type: import_genai2.Type.STRING },
          location: { type: import_genai2.Type.STRING },
          dates: { type: import_genai2.Type.STRING, description: "e.g., Jan 2022 - Present or 2020 - 2021" },
          bullets: {
            type: import_genai2.Type.ARRAY,
            items: { type: import_genai2.Type.STRING },
            description: "3-5 high-impact bullet points. Each bullet should follow the STAR method (Situation, Task, Action, Result), use action verbs, and quantify achievements where possible."
          },
          current: { type: import_genai2.Type.BOOLEAN, description: "True if is current job" }
        },
        required: ["company", "title", "dates", "bullets", "current"]
      }
    },
    projects: {
      type: import_genai2.Type.ARRAY,
      items: {
        type: import_genai2.Type.OBJECT,
        properties: {
          name: { type: import_genai2.Type.STRING },
          description: { type: import_genai2.Type.STRING },
          technologies: { type: import_genai2.Type.ARRAY, items: { type: import_genai2.Type.STRING } },
          bullets: { type: import_genai2.Type.ARRAY, items: { type: import_genai2.Type.STRING }, description: "1-3 bullet points emphasizing engineering accomplishments." },
          url: { type: import_genai2.Type.STRING, description: "e.g., GitHub link or website link" }
        },
        required: ["name", "description", "technologies", "bullets"]
      }
    },
    skills: {
      type: import_genai2.Type.ARRAY,
      items: {
        type: import_genai2.Type.OBJECT,
        properties: {
          category: { type: import_genai2.Type.STRING, description: "e.g., Languages, Frameworks, Tools, Soft Skills" },
          items: { type: import_genai2.Type.ARRAY, items: { type: import_genai2.Type.STRING } }
        },
        required: ["category", "items"]
      }
    },
    languages: {
      type: import_genai2.Type.ARRAY,
      items: { type: import_genai2.Type.STRING }
    },
    certifications: {
      type: import_genai2.Type.ARRAY,
      items: { type: import_genai2.Type.STRING }
    }
  },
  required: ["personalInfo", "education", "experience", "projects", "skills", "languages", "certifications"]
};
var RESUME_JSON_STRUCTURE = `
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
var UPDATE_RESPONSE_JSON_STRUCTURE = `
Return ONLY valid JSON with this exact top-level shape:
{
  "explanationOfChanges": string,
  "updatedResume": (same structure as the resume JSON described below)
}

` + RESUME_JSON_STRUCTURE;
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
      const parsedData2 = safeParseJsonLocal(content);
      res.json({ success: true, resume: parsedData2 });
      return;
    }
    const ai = getGeminiClient2();
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
  } catch (error) {
    console.error("Parse Resume Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during resume construction."
    });
  }
});
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
    const UPDATE_RESPONSE_SCHEMA = {
      type: import_genai2.Type.OBJECT,
      properties: {
        explanationOfChanges: {
          type: import_genai2.Type.STRING,
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
      const updateResponse2 = safeParseJsonLocal(content);
      res.json({
        success: true,
        explanationOfChanges: updateResponse2.explanationOfChanges,
        updatedResume: updateResponse2.updatedResume
      });
      return;
    }
    const ai = getGeminiClient2();
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
  } catch (error) {
    console.error("Apply Update Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during incremental resume updates."
    });
  }
});
async function startServer() {
  const distPath = import_path14.default.join(process.cwd(), "dist");
  const hasDist = import_fs15.default.existsSync(import_path14.default.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || hasDist && process.env.USE_VITE_DEV !== "1";
  if (!isProduction) {
    console.log("Loading Vite Dev Mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production SPA from dist/ (API at /api/*)...");
    app.use(import_express.default.static(distPath, { index: false, maxAge: "1h" }));
    app.get("/", (_req, res) => {
      res.sendFile(import_path14.default.join(distPath, "index.html"));
    });
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(import_path14.default.join(distPath, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server on http://0.0.0.0:${PORT} (${isProduction ? "production SPA + /api" : "dev"})`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
