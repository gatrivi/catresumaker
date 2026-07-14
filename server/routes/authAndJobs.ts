import type { Express, Response } from "express";
import path from "path";
import { UserStore } from "../auth/userStore";
import { UserDataStore } from "../userData";
import { signToken } from "../auth/tokens";
import { createAuthMiddleware, type AuthedRequest } from "../auth/middleware";
import { getUserWorkspace, ensureUserWorkspace, runWithWorkspaceAsync } from "../../job-cannon/workspace";
import { loadApplyQueue, updateJobStatus } from "../../job-cannon/applyQueue";
import { exportJobPdf } from "../../job-cannon/pdf/exportJobPdf";
import { generateForJob } from "../../job-cannon/cli";
import {
  addJobDirect,
  getJobArtifacts,
  runJobCannon,
  runJobSource,
  syncJobsDirToQueue,
} from "../../job-cannon/runner";
import { getLLMStatus } from "../../job-cannon/ai/llmClient";
import { resumeToMarkdown } from "../resumeMarkdown";
import {
  capturePageJob,
  fetchJobUrlForUser,
  importDiscoveredJobs,
  searchPublicFeeds,
  buildProfileSearchContext,
} from "../../job-cannon/discovery/discover";
import { getObscuraStatus, probeObscura } from "../../job-cannon/discovery/obscura";
import type { DiscoveredJob } from "../../job-cannon/discovery/types";

export function registerAuthAndUserRoutes(app: Express, dataRoot: string, legacyJobCannonRoot: string) {
  const userStore = new UserStore(dataRoot);
  const userData = new UserDataStore(dataRoot);
  const requireAuth = createAuthMiddleware((id) => userStore.findById(id));

  // Bookmarklets run on ATS origins — allow Bearer auth cross-origin (no cookies).
  app.use("/api/job-os", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  async function asUser<T>(userId: string, fn: () => T | Promise<T>): Promise<T> {
    const ws = getUserWorkspace(userId, dataRoot);
    ensureUserWorkspace(ws);
    return runWithWorkspaceAsync(ws, async () => fn());
  }

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body ?? {};
      const user = await userStore.register(String(email ?? ""), String(password ?? ""), String(name ?? ""));
      const token = signToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message ?? "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      const user = await userStore.login(String(email ?? ""), String(password ?? ""));
      const token = signToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message ?? "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
    const u = req.user!;
    res.json({
      success: true,
      user: { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt },
    });
  });

  app.post("/api/auth/claim-legacy", requireAuth, (req: AuthedRequest, res) => {
    const result = userStore.claimLegacyJobCannon(req.user!.id, legacyJobCannonRoot);
    res.json({ success: result.copied, ...result });
  });

  app.get("/api/user/resume", requireAuth, (req: AuthedRequest, res) => {
    const resume = userData.readJson(req.user!.id, "resume.json", null);
    res.json({ success: true, resume });
  });

  app.put("/api/user/resume", requireAuth, (req: AuthedRequest, res) => {
    const resume = req.body?.resume ?? null;
    userData.writeJson(req.user!.id, "resume.json", resume);
    if (resume && typeof resume === "object") {
      userData.writeText(req.user!.id, "resume.md", resumeToMarkdown(resume));
    }
    res.json({ success: true });
  });

  app.get("/api/user/logs", requireAuth, (req: AuthedRequest, res) => {
    res.json({ success: true, logs: userData.readJson(req.user!.id, "logs.json", []) });
  });

  app.put("/api/user/logs", requireAuth, (req: AuthedRequest, res) => {
    userData.writeJson(req.user!.id, "logs.json", req.body?.logs ?? []);
    res.json({ success: true });
  });

  app.get("/api/user/settings", requireAuth, (req: AuthedRequest, res) => {
    res.json({
      success: true,
      settings: userData.readJson(req.user!.id, "settings.json", { templateId: "ats-classic", lang: "es" }),
    });
  });

  app.put("/api/user/settings", requireAuth, (req: AuthedRequest, res) => {
    userData.writeJson(req.user!.id, "settings.json", req.body?.settings ?? {});
    res.json({ success: true });
  });

  app.post("/api/user/import-local", requireAuth, (req: AuthedRequest, res) => {
    const { resume, logs, settings } = req.body ?? {};
    if (resume) {
      userData.writeJson(req.user!.id, "resume.json", resume);
      userData.writeText(req.user!.id, "resume.md", resumeToMarkdown(resume));
    }
    if (logs) userData.writeJson(req.user!.id, "logs.json", logs);
    if (settings) userData.writeJson(req.user!.id, "settings.json", settings);
    res.json({ success: true });
  });

  // --- Job OS (per-user, auth required) ---
  app.get("/api/job-os/queue", requireAuth, async (req: AuthedRequest, res) => {
    const queue = await asUser(req.user!.id, () => loadApplyQueue());
    res.json(queue);
  });

  app.patch("/api/job-os/queue/:id", requireAuth, async (req: AuthedRequest, res) => {
    const id = String(req.params.id);
    const patch = req.body ?? {};
    const updated = await asUser(req.user!.id, () => updateJobStatus(id, patch));
    if (!updated) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    res.json({ success: true, updated });
  });

  app.get("/api/job-os/paste/:id", requireAuth, async (req: AuthedRequest, res) => {
    const fs = await import("fs");
    const id = String(req.params.id);
    const result = await asUser(req.user!.id, async () => {
      const queue = loadApplyQueue();
      const record = queue.find((j) => j.id === id || j.slug === id);
      if (!record?.slug) return null;
      const ws = getUserWorkspace(req.user!.id, dataRoot);
      const pastePath = path.join(ws.jobsDir, record.slug, "generated", "PasteBank.txt");
      if (!fs.existsSync(pastePath)) return { missing: true as const };
      return { slug: record.slug, paste: fs.readFileSync(pastePath, "utf8") };
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

  app.post("/api/job-os/export-pdf/:id", requireAuth, async (req: AuthedRequest, res) => {
    const id = String(req.params.id);
    const result = await asUser(req.user!.id, async () => {
      const queue = loadApplyQueue();
      const record = queue.find((j) => j.id === id || j.slug === id);
      if (!record?.slug) return null;
      const ws = getUserWorkspace(req.user!.id, dataRoot);
      const jobDir = path.join(ws.jobsDir, record.slug);
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

  app.post("/api/job-os/add", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { url, title, company, rawText, source } = req.body ?? {};
      if (!rawText || !String(rawText).trim()) {
        res.status(400).json({ success: false, error: "rawText is required" });
        return;
      }
      const record = await asUser(req.user!.id, () =>
        addJobDirect({
          url: url ? String(url) : undefined,
          title: title ? String(title) : undefined,
          company: company ? String(company) : undefined,
          rawText: String(rawText),
          source: source ? String(source) : "dashboard",
        })
      );
      res.json({ success: true, record });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "Failed to add job" });
    }
  });

  app.post("/api/job-os/run/source", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const result = await asUser(req.user!.id, () => runJobSource());
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({ success: true, ...result, queue });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "job:source failed" });
    }
  });

  app.post("/api/job-os/run/sync", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const result = await asUser(req.user!.id, () => syncJobsDirToQueue());
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({ success: true, ...result, queue });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "sync failed" });
    }
  });

  app.post("/api/job-os/run/cannon", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const force = !!req.body?.force;
      const result = await asUser(req.user!.id, () => runJobCannon(generateForJob, { force }));
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({ success: true, ...result, queue });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "job:cannon failed" });
    }
  });

  app.get("/api/job-os/job/:id", requireAuth, async (req: AuthedRequest, res) => {
    const id = String(req.params.id);
    const payload = await asUser(req.user!.id, () => {
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

  app.get("/api/job-os/ranked", requireAuth, async (req: AuthedRequest, res) => {
    const fs = await import("fs");
    const text = await asUser(req.user!.id, () => {
      const ws = getUserWorkspace(req.user!.id, dataRoot);
      return fs.existsSync(ws.rankedPath) ? fs.readFileSync(ws.rankedPath, "utf8") : "# Ranked Jobs\n\n(empty)";
    });
    res.json({ success: true, markdown: text });
  });

  /** Ensure pack (+ AI if available), return apply URL + paste readiness. User still submits. */
  app.post("/api/job-os/prepare-apply/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
    const id = String(req.params.id);
    const llm = getLLMStatus();
    try {
      const payload = await asUser(req.user!.id, async () => {
        const queue = loadApplyQueue();
        const record = queue.find((j) => j.id === id || j.slug === id);
        if (!record?.slug) return null;

        const before = getJobArtifacts(record.slug);
        const force = !!req.body?.force || !before?.pasteBank;
        const cannon = await runJobCannon(generateForJob, { force });
        const artifacts = getJobArtifacts(record.slug);
        const fresh = loadApplyQueue().find((j) => j.id === record.id) ?? record;

        return {
          record: fresh,
          artifacts,
          cannon,
          ready: !!(artifacts?.pasteBank && fresh.url),
          applyUrl: fresh.url ?? null,
          llm: { available: llm.available, provider: llm.provider, model: llm.model },
        };
      });
      if (!payload) {
        res.status(404).json({ success: false, error: "Job not found" });
        return;
      }
      if (!payload.artifacts?.pasteBank) {
        res.status(400).json({
          success: false,
          error: "No paste bank yet — need fit ≥7 APPLY (or force pack). Check Score + Pack.",
          ready: false,
          applyUrl: payload.applyUrl,
          record: payload.record,
        });
        return;
      }
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({ success: true, ...payload, queue });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "prepare-apply failed" });
    }
  });

  app.post("/api/job-os/tailor/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
    const id = String(req.params.id);
    const llm = getLLMStatus();
    if (!llm.available) {
      res.status(503).json({ success: false, error: "AI offline — set NVIDIA_API_KEY in .env" });
      return;
    }
    const payload = await asUser(req.user!.id, async () => {
      const queue = loadApplyQueue();
      const record = queue.find((j) => j.id === id || j.slug === id);
      if (!record?.slug) return null;
      const ws = getUserWorkspace(req.user!.id, dataRoot);
      const jobDir = path.join(ws.jobsDir, record.slug);
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
      llmModel: llm.model,
    });
  });

  // --- Job discovery (human-in-the-loop; no auto-apply) ---
  app.get("/api/job-os/discover/status", requireAuth, async (_req: AuthedRequest, res) => {
    const obscura = getObscuraStatus();
    const available = await probeObscura();
    res.json({
      success: true,
      feeds: ["remotive", "remoteok", "arbeitnow", "jobicy"],
      obscura: { ...obscura, available },
      policy: "Public feeds + Obscura on allowlisted ATS. LinkedIn/Indeed blocked.",
      install: "npm run obscura:install",
    });
  });

  app.post("/api/job-os/discover/search", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { keywords, sources, limit, matchProfile, minFit } = req.body ?? {};
      const result = await asUser(req.user!.id, () =>
        searchPublicFeeds({
          keywords: Array.isArray(keywords) ? keywords.map(String) : undefined,
          sources: Array.isArray(sources) ? sources : undefined,
          limit: limit ? Number(limit) : undefined,
          matchProfile: matchProfile !== false,
          minFit: minFit != null ? Number(minFit) : undefined,
        })
      );
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "discover search failed" });
    }
  });

  app.get("/api/job-os/discover/profile", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const ctx = await asUser(req.user!.id, () => buildProfileSearchContext());
      res.json({
        success: true,
        profile: {
          name: ctx.name,
          title: ctx.title,
          location: ctx.location,
          skills: ctx.skills.slice(0, 20),
          keywords: ctx.keywords,
          hasResume: ctx.hasResume,
        },
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "profile load failed" });
    }
  });

  app.post("/api/job-os/discover/import", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const jobs = req.body?.jobs as DiscoveredJob[] | undefined;
      if (!Array.isArray(jobs) || !jobs.length) {
        res.status(400).json({ success: false, error: "jobs array required" });
        return;
      }
      const payload = await asUser(req.user!.id, () => importDiscoveredJobs(jobs));
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({ success: true, ...payload, queue });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "import failed" });
    }
  });

  app.post("/api/job-os/discover/import-and-pack", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const jobs = req.body?.jobs as DiscoveredJob[] | undefined;
      if (!Array.isArray(jobs) || !jobs.length) {
        res.status(400).json({ success: false, error: "jobs array required" });
        return;
      }
      const payload = await asUser(req.user!.id, () => importDiscoveredJobs(jobs));
      const cannon = await asUser(req.user!.id, () => runJobCannon(generateForJob, { force: false }));
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({ success: true, ...payload, cannon, queue });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message ?? "import-and-pack failed" });
    }
  });

  app.post("/api/job-os/capture", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { url, title, company, rawText, source } = req.body ?? {};
      if (!rawText || !String(rawText).trim()) {
        res.status(400).json({ success: false, error: "rawText required" });
        return;
      }
      const record = await asUser(req.user!.id, () =>
        capturePageJob({
          url: url ? String(url) : undefined,
          title: title ? String(title) : undefined,
          company: company ? String(company) : undefined,
          rawText: String(rawText),
          source: source ? String(source) : "page-capture",
        })
      );
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({ success: true, record, queue });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message ?? "capture failed" });
    }
  });

  app.post("/api/job-os/discover/fetch-url", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const url = String(req.body?.url ?? "").trim();
      if (!url) {
        res.status(400).json({ success: false, error: "url required" });
        return;
      }
      const pack = !!req.body?.pack;
      const fetched = await fetchJobUrlForUser(req.user!.id, url);
      const record = await asUser(req.user!.id, () =>
        capturePageJob({
          url,
          title: fetched.title,
          company: fetched.company ?? (req.body?.company ? String(req.body.company) : undefined),
          rawText: fetched.rawText,
          source: "obscura",
        })
      );
      let cannon: Awaited<ReturnType<typeof runJobCannon>> | undefined;
      if (pack) {
        cannon = await asUser(req.user!.id, () => runJobCannon(generateForJob, { force: false }));
      }
      const queue = await asUser(req.user!.id, () => loadApplyQueue());
      res.json({
        success: true,
        record,
        queue,
        cannon,
        preview: fetched.rawText.slice(0, 500),
        meta: { title: fetched.title, company: fetched.company },
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message ?? "fetch failed" });
    }
  });
}
