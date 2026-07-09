import { AsyncLocalStorage } from "async_hooks";
import fs from "fs";
import path from "path";
import { getJobCannonRoot, getProjectRoot } from "./projectRoot";

export type UserWorkspace = {
  userId: string;
  root: string;
  jobsDir: string;
  queuePath: string;
  inboxPath: string;
  rankedPath: string;
  pasteBankAllPath: string;
  formAnswersPath: string;
  candidateProfilePath: string;
  resumeMdPath: string;
};

const storage = new AsyncLocalStorage<UserWorkspace>();

export function getLegacyWorkspace(): UserWorkspace {
  const LEGACY_ROOT = getJobCannonRoot();
  return {
    userId: "legacy",
    root: LEGACY_ROOT,
    jobsDir: path.join(LEGACY_ROOT, "jobs"),
    queuePath: path.join(LEGACY_ROOT, "ApplyQueue.json"),
    inboxPath: path.join(LEGACY_ROOT, "inbox", "jobs.txt"),
    rankedPath: path.join(LEGACY_ROOT, "RankedJobs.md"),
    pasteBankAllPath: path.join(LEGACY_ROOT, "PasteBank_All.txt"),
    formAnswersPath: path.join(LEGACY_ROOT, "profile", "FormAnswers.json"),
    candidateProfilePath: path.join(LEGACY_ROOT, "profile", "candidateProfile.json"),
    resumeMdPath: path.join(getProjectRoot(), "resume.md"),
  };
}

export function getUserWorkspace(userId: string, dataRoot: string): UserWorkspace {
  const root = path.join(dataRoot, "users", userId, "job-cannon");
  return {
    userId,
    root,
    jobsDir: path.join(root, "jobs"),
    queuePath: path.join(root, "ApplyQueue.json"),
    inboxPath: path.join(root, "inbox", "jobs.txt"),
    rankedPath: path.join(root, "RankedJobs.md"),
    pasteBankAllPath: path.join(root, "PasteBank_All.txt"),
    formAnswersPath: path.join(root, "profile", "FormAnswers.json"),
    candidateProfilePath: path.join(root, "profile", "candidateProfile.json"),
    resumeMdPath: path.join(dataRoot, "users", userId, "resume.md"),
  };
}

export function getWorkspace(): UserWorkspace {
  return storage.getStore() ?? getLegacyWorkspace();
}

export function runWithWorkspace<T>(ws: UserWorkspace, fn: () => T): T {
  return storage.run(ws, fn);
}

export async function runWithWorkspaceAsync<T>(ws: UserWorkspace, fn: () => T | Promise<T>): Promise<T> {
  return storage.run(ws, async () => await fn());
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function ensureUserWorkspace(ws: UserWorkspace) {
  ensureDir(ws.jobsDir);
  ensureDir(path.dirname(ws.inboxPath));
  ensureDir(path.dirname(ws.formAnswersPath));

  if (!fs.existsSync(ws.queuePath)) {
    fs.writeFileSync(ws.queuePath, "[]\n", "utf8");
  }
  if (!fs.existsSync(ws.inboxPath)) {
    fs.writeFileSync(
      ws.inboxPath,
      "---JOB---\nURL: \nTitle: \nCompany: \nSource: Pasted\n\nPaste full job text here...\n",
      "utf8"
    );
  }
}
