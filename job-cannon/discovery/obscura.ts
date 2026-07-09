import { spawn } from "child_process";
import { isAllowedFetchUrl } from "./policy";

export type ObscuraStatus = {
  configured: boolean;
  available: boolean;
  bin: string;
  dumpMode: "text" | "markdown";
  stealth: boolean;
};

let probeCache: { at: number; ok: boolean } | null = null;
const PROBE_TTL_MS = 10 * 60 * 1000;

function obscuraBin(): string {
  return process.env.OBSCURA_BIN?.trim() || "obscura";
}

function dumpMode(): "text" | "markdown" {
  return process.env.OBSCURA_DUMP === "text" ? "text" : "markdown";
}

function stealthOn(): boolean {
  return process.env.OBSCURA_STEALTH === "1" || process.env.OBSCURA_STEALTH === "true";
}

export function getObscuraStatus(): ObscuraStatus {
  const bin = obscuraBin();
  return {
    configured: !!bin,
    available: probeCache?.ok ?? false,
    bin,
    dumpMode: dumpMode(),
    stealth: stealthOn(),
  };
}

/** ponytail: cached probe; upgrade = healthcheck sidecar on deploy */
export async function probeObscura(force = false): Promise<boolean> {
  if (!force && probeCache && Date.now() - probeCache.at < PROBE_TTL_MS) {
    return probeCache.ok;
  }

  const bin = obscuraBin();
  const ok = await new Promise<boolean>((resolve) => {
    const child = spawn(
      bin,
      ["fetch", "https://example.com", "--dump", "text", "--quiet", "--timeout", "12"],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let stdout = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0 && stdout.trim().length > 0));
  });

  probeCache = { at: Date.now(), ok };
  return ok;
}

export async function fetchPageTextWithObscura(url: string): Promise<string> {
  if (!isAllowedFetchUrl(url)) {
    throw new Error("URL host not on allowlist (LinkedIn/Indeed blocked; use ATS links only)");
  }

  const available = await probeObscura();
  if (!available) {
    throw new Error(
      "Obscura not available — run npm run obscura:install or set OBSCURA_BIN to the binary path"
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
    "--quiet",
  ];
  if (stealthOn()) args.push("--stealth");

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", (err) => reject(new Error(`Obscura not found (${bin}): ${err.message}`)));
    child.on("close", (code) => {
      const text = stdout.trim();
      if (code !== 0 || !text) {
        reject(new Error(stderr.trim() || `Obscura exited ${code}`));
        return;
      }
      resolve(text.slice(0, 50_000));
    });
  });
}
