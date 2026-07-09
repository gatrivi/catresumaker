import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let cachedRoot: string | null = null;

/** Resolve repo root in dev (tsx), production bundle (cwd), or explicit env. */
export function getProjectRoot(): string {
  if (cachedRoot) return cachedRoot;
  if (process.env.CATRESUMAKER_ROOT) {
    cachedRoot = path.resolve(process.env.CATRESUMAKER_ROOT);
    return cachedRoot;
  }

  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "job-cannon"))) {
    cachedRoot = cwd;
    return cachedRoot;
  }

  // Unbundled tsx: server.ts or job-cannon/*.ts
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const fromHere = path.join(here, "..");
    if (fs.existsSync(path.join(fromHere, "job-cannon"))) {
      cachedRoot = path.resolve(fromHere);
      return cachedRoot;
    }
    const fromJobCannon = here;
    if (fs.existsSync(path.join(fromJobCannon, "jobs"))) {
      cachedRoot = path.resolve(fromJobCannon, "..");
      return cachedRoot;
    }
  } catch {
    /* bundled CJS — import.meta empty */
  }

  cachedRoot = cwd;
  return cachedRoot;
}

export function getJobCannonRoot(): string {
  return path.join(getProjectRoot(), "job-cannon");
}

export function getDataRoot(): string {
  if (process.env.DATA_ROOT) {
    return path.resolve(process.env.DATA_ROOT);
  }
  return path.join(getProjectRoot(), "data");
}
