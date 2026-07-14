import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, Download, Link2, Bookmark, Zap, Clipboard } from "lucide-react";
import { apiFetch, getToken } from "../auth/api";

export type DiscoveredJob = {
  discoverId: string;
  title: string;
  company: string;
  url?: string;
  description: string;
  source: string;
  previewFit?: number;
  matchedSkills?: string[];
  alreadyQueued?: boolean;
};

const KW_KEY = "catresumaker_job_keywords";

type Props = {
  labels: {
    title: string;
    subtitle: string;
    search: string;
    searching: string;
    importSelected: string;
    importPack: string;
    fetchUrl: string;
    fetchUrlPh: string;
    bookmarklet: string;
    pasteBookmarklet: string;
    fit: string;
    queued: string;
    noResults: string;
    keywordsPh: string;
    obscuraOn: string;
    obscuraOff: string;
    matchProfile: string;
    noResume: string;
  };
  onImported: () => void;
  flash: (msg: string) => void;
};

export default function JobFinderPanel({ labels, onImported, flash }: Props) {
  const [open, setOpen] = useState(true);
  const [keywords, setKeywords] = useState(() => localStorage.getItem(KW_KEY) || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredJob[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetchUrl, setFetchUrl] = useState("");
  const [feedStatus, setFeedStatus] = useState<Record<string, boolean>>({});
  const [obscuraOk, setObscuraOk] = useState<boolean | null>(null);
  const [matchProfile, setMatchProfile] = useState(true);
  const [profileTitle, setProfileTitle] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(true);
  const searched = useRef(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const kws = keywords
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (keywords.trim()) localStorage.setItem(KW_KEY, keywords);
      const res = await apiFetch("/api/job-os/discover/search", {
        method: "POST",
        body: JSON.stringify({ keywords: kws, limit: 35, matchProfile, minFit: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.jobs ?? []);
      if (data.sources) setFeedStatus(data.sources);
      if (data.profile?.title) setProfileTitle(data.profile.title);
      if (data.keywords?.length && !localStorage.getItem(KW_KEY)) {
        setKeywords(data.keywords.join(", "));
      }
      setSelected(
        new Set((data.jobs ?? []).filter((j: DiscoveredJob) => !j.alreadyQueued).map((j: DiscoveredJob) => j.discoverId))
      );
    } catch (e: any) {
      flash(e.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  }, [keywords, flash, matchProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profRes, statusRes] = await Promise.all([
          apiFetch("/api/job-os/discover/profile"),
          apiFetch("/api/job-os/discover/status"),
        ]);
        if (cancelled) return;
        const prof = await profRes.json();
        const status = await statusRes.json();
        if (prof.profile) {
          setProfileTitle(prof.profile.title ?? null);
          setHasResume(!!prof.profile.hasResume);
          if (!localStorage.getItem(KW_KEY) && Array.isArray(prof.profile.keywords)) {
            setKeywords(prof.profile.keywords.join(", "));
          }
        }
        if (status.feeds) setFeedStatus(Object.fromEntries(status.feeds.map((f: string) => [f, true])));
        if (typeof status.obscura?.available === "boolean") setObscuraOk(status.obscura.available);
      } catch {
        /* ignore */
      }
      if (!cancelled && !searched.current) {
        searched.current = true;
        runSearch();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runSearch]);

  const skipMatchToggle = useRef(true);
  useEffect(() => {
    if (skipMatchToggle.current) {
      skipMatchToggle.current = false;
      return;
    }
    if (searched.current) runSearch();
  }, [matchProfile, runSearch]);

  async function importJobs(pack: boolean) {
    const jobs = results.filter((j) => selected.has(j.discoverId));
    if (!jobs.length) return;
    setLoading(true);
    try {
      const path = pack ? "/api/job-os/discover/import-and-pack" : "/api/job-os/discover/import";
      const res = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify({ jobs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const packed = data.cannon?.packed;
      flash(pack && packed != null ? `+${data.imported} · ${packed} ready` : `+${data.imported} → queue`);
      onImported();
      await runSearch();
    } catch (e: any) {
      flash(e.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllowlistedUrl() {
    const url = fetchUrl.trim();
    if (!url) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/job-os/discover/fetch-url", {
        method: "POST",
        body: JSON.stringify({ url, pack: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");
      const name = [data.meta?.company, data.meta?.title].filter(Boolean).join(" — ");
      flash(name ? `Captured: ${name.slice(0, 60)}` : "URL captured + packed");
      setFetchUrl("");
      onImported();
    } catch (e: any) {
      flash(e.message ?? "Fetch failed");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const token = getToken() || "";
  // Embed token+API so bookmarklets work on ATS origins (localStorage is same-origin only).
  function makeBookmarklet(scriptName: string) {
    return (
      "javascript:(function(){var o=" +
      JSON.stringify(origin) +
      ",t=" +
      JSON.stringify(token) +
      ",s=document.createElement('script');s.src=o+'/" +
      scriptName +
      "?v=2';s.dataset.api=o;s.dataset.token=t;document.body.appendChild(s);})();"
    );
  }
  const bookmarkletHref = makeBookmarklet("job-capture.js");
  const pasteBookmarkletHref = makeBookmarklet("paste-helper.js");

  return (
    <div className="glass-surface border border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/30"
      >
        <div>
          <div className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
            <Search className="w-4 h-4 text-sky-400" />
            {labels.title}
            {results.length ? (
              <span className="text-[10px] font-normal text-sky-300 bg-sky-950/50 px-1.5 py-0.5 rounded">{results.length}</span>
            ) : null}
            {obscuraOk === true ? (
              <span className="text-[9px] font-normal text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                {labels.obscuraOn}
              </span>
            ) : obscuraOk === false ? (
              <span className="text-[9px] font-normal text-amber-300/90 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-800/30" title={labels.obscuraOff}>
                Obscura off
              </span>
            ) : null}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {labels.subtitle}
            {profileTitle ? (
              <span className="text-sky-300/90"> · {profileTitle}</span>
            ) : null}
            {!hasResume ? (
              <span className="text-amber-400/90"> · {labels.noResume}</span>
            ) : null}
          </div>
        </div>
        <span className="text-xs text-slate-500">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800/80 pt-3">
          <div className="flex flex-wrap gap-1">
            {Object.entries(feedStatus).map(([name, ok]) => (
              <span
                key={name}
                className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                  ok ? "border-emerald-800/50 text-emerald-300 bg-emerald-950/30" : "border-slate-700 text-slate-500"
                }`}
              >
                {name}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={matchProfile}
                onChange={(e) => setMatchProfile(e.target.checked)}
                className="rounded"
              />
              {labels.matchProfile}
            </label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={labels.keywordsPh}
              className="flex-1 min-w-[200px] glass-input border border-slate-800 rounded-lg px-3 py-1.5 text-xs"
            />
            <button
              disabled={loading}
              onClick={runSearch}
              className="text-xs px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              {loading ? labels.searching : labels.search}
            </button>
            <button
              disabled={loading || !selected.size}
              onClick={() => importJobs(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              {labels.importSelected} ({selected.size})
            </button>
            <button
              disabled={loading || !selected.size}
              onClick={() => importJobs(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-violet-800 hover:bg-violet-700 font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              {labels.importPack}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={fetchUrl}
              onChange={(e) => setFetchUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchAllowlistedUrl()}
              placeholder={labels.fetchUrlPh}
              className="flex-1 min-w-[200px] glass-input border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono"
            />
            <button
              disabled={loading || !fetchUrl.trim()}
              onClick={fetchAllowlistedUrl}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 disabled:opacity-50 flex items-center gap-1"
              title="Obscura fetch + score + pack"
            >
              <Link2 className="w-3 h-3" />
              {labels.fetchUrl}
            </button>
            <a
              href={bookmarkletHref}
              draggable
              onClick={(e) => {
                e.preventDefault();
                flash("Drag to bookmarks bar ↑");
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-800/50 bg-indigo-950/40 text-indigo-200 flex items-center gap-1 cursor-grab"
            >
              <Bookmark className="w-3 h-3" />
              {labels.bookmarklet}
            </a>
            <a
              href={pasteBookmarkletHref}
              draggable
              onClick={(e) => {
                e.preventDefault();
                flash("Drag paste helper to bookmarks ↑");
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-violet-800/50 bg-violet-950/40 text-violet-200 flex items-center gap-1 cursor-grab"
            >
              <Clipboard className="w-3 h-3" />
              {labels.pasteBookmarklet}
            </a>
          </div>

          {results.length ? (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800/80 divide-y divide-slate-800/80">
              {results.map((j) => (
                <label
                  key={j.discoverId}
                  className={`flex gap-2 p-2 text-xs cursor-pointer hover:bg-slate-950/40 ${
                    j.alreadyQueued ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={j.alreadyQueued}
                    checked={selected.has(j.discoverId)}
                    onChange={() => toggle(j.discoverId)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-200 truncate">
                      {j.company} — {j.title}
                    </div>
                    <div className="text-[10px] text-slate-500 flex gap-2 flex-wrap">
                      <span>{j.source}</span>
                      <span>
                        {labels.fit}: {j.previewFit ?? "—"}/10
                      </span>
                      {j.alreadyQueued ? <span className="text-amber-500">{labels.queued}</span> : null}
                      {j.matchedSkills?.length ? (
                        <span className="text-emerald-500/90" title={j.matchedSkills.join(", ")}>
                          +{j.matchedSkills.slice(0, 3).join(", ")}
                        </span>
                      ) : null}
                      {j.url ? (
                        <a
                          href={j.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          link
                        </a>
                      ) : null}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">{loading ? "…" : labels.noResults}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
