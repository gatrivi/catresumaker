import crypto from "crypto";
import type { DiscoveredJob } from "./types";

const DEFAULT_UA = "CatResumeMaker-JobDiscovery/1.4 (+https://github.com/gatrivi/catresumaker)";

function discoverId(url: string | undefined, company: string, title: string): string {
  const key = `${url ?? ""}||${company}||${title}`;
  return crypto.createHash("sha256").update(key, "utf8").digest("hex").slice(0, 16);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": DEFAULT_UA },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Feed ${url} returned ${res.status}`);
  return res.json();
}

type RemotiveJob = {
  id?: number;
  title?: string;
  company_name?: string;
  url?: string;
  description?: string;
  publication_date?: string;
  candidate_required_location?: string;
  tags?: string[];
};

export async function fetchRemotiveJobs(): Promise<DiscoveredJob[]> {
  const data = (await fetchJson("https://remotive.com/api/remote-jobs?category=software-dev")) as {
    jobs?: RemotiveJob[];
  };
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    const title = j.title?.trim() || "Software role";
    const company = j.company_name?.trim() || "Unknown";
    const description = stripHtml(j.description ?? "").slice(0, 12_000);
    return {
      discoverId: discoverId(j.url, company, title),
      title,
      company,
      url: j.url,
      description: description || title,
      source: "remotive",
      publishedAt: j.publication_date,
      location: j.candidate_required_location,
      tags: j.tags,
    };
  });
}

type RemoteOkJob = {
  id?: string;
  position?: string;
  company?: string;
  url?: string;
  description?: string;
  date?: string;
  location?: string;
  tags?: string[];
};

export async function fetchRemoteOkJobs(): Promise<DiscoveredJob[]> {
  const data = (await fetchJson("https://remoteok.com/api")) as RemoteOkJob[];
  if (!Array.isArray(data)) return [];
  return data
    .filter((j) => j && typeof j === "object" && (j.position || j.company))
    .map((j) => {
      const title = (j.position ?? "").trim() || "Remote role";
      const company = (j.company ?? "").trim() || "Unknown";
      const url = j.url?.startsWith("http") ? j.url : j.url ? `https://remoteok.com${j.url}` : undefined;
      const description = stripHtml(j.description ?? "").slice(0, 12_000);
      return {
        discoverId: discoverId(url, company, title),
        title,
        company,
        url,
        description: description || title,
        source: "remoteok",
        publishedAt: j.date,
        location: j.location,
        tags: Array.isArray(j.tags) ? j.tags.map(String) : undefined,
      };
    });
}

type ArbeitnowJob = {
  slug?: string;
  title?: string;
  company_name?: string;
  description?: string;
  url?: string;
  remote?: boolean;
  location?: string;
  tags?: string[];
  created_at?: string;
};

export async function fetchArbeitnowJobs(): Promise<DiscoveredJob[]> {
  const data = (await fetchJson("https://www.arbeitnow.com/api/job-board-api")) as { data?: ArbeitnowJob[] };
  const jobs = data.data ?? [];
  return jobs.map((j) => {
    const title = j.title?.trim() || "Tech role";
    const company = j.company_name?.trim() || "Unknown";
    const url = j.url?.startsWith("http") ? j.url : j.slug ? `https://www.arbeitnow.com${j.slug}` : undefined;
    const description = stripHtml(j.description ?? "").slice(0, 12_000);
    return {
      discoverId: discoverId(url, company, title),
      title,
      company,
      url,
      description: description || title,
      source: "arbeitnow",
      publishedAt: j.created_at,
      location: j.remote ? "Remote" : j.location,
      tags: j.tags,
    };
  });
}

type JobicyJob = {
  id?: number;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  url?: string;
  pubDate?: string;
  jobGeo?: string;
  jobIndustry?: string[];
  jobType?: string[];
};

export async function fetchJobicyJobs(): Promise<DiscoveredJob[]> {
  const data = (await fetchJson("https://jobicy.com/api/v2/remote-jobs?count=50&industry=tech")) as {
    jobs?: JobicyJob[];
  };
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    const title = j.jobTitle?.trim() || "Remote role";
    const company = j.companyName?.trim() || "Unknown";
    const url = j.url;
    const description = stripHtml(j.jobDescription ?? "").slice(0, 12_000);
    const tags = [...(j.jobIndustry ?? []), ...(j.jobType ?? [])];
    return {
      discoverId: discoverId(url, company, title),
      title,
      company,
      url,
      description: description || title,
      source: "jobicy",
      publishedAt: j.pubDate,
      location: j.jobGeo,
      tags: tags.length ? tags : undefined,
    };
  });
}
