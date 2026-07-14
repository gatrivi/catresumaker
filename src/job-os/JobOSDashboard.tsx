import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Globe } from "lucide-react";
import AppLogo from "../components/AppLogo";
import { useAuth } from "../auth/AuthContext";
import AuthModal from "../auth/AuthModal";
import { apiFetch } from "../auth/api";
import JobFinderPanel from "./JobFinderPanel";
import { resources } from "../utils/translations";
import { loadLang, saveLang, type AppLang } from "../utils/lang";

type ApplyQueueRecord = {
  id: string;
  slug: string;
  company?: string;
  title?: string;
  url?: string;
  status?: string;
  decision?: string;
  fitScore?: number;
  riskFlags?: string[];
  nextAction?: string;
  notes?: string;
};

type JobArtifacts = {
  applicationPack?: string;
  pasteBank?: string;
  interviewPrep?: string;
  followUps?: string;
  state?: string;
  score?: { fit?: { reasons?: string[]; riskFlags?: string[] } };
};

type DetailTab = "pack" | "paste" | "interview" | "followups";

const STATUS_FILTERS = ["all", "apply_today", "ranked", "sourced", "applied", "rejected"] as const;

export default function JobOSDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [lang, setLang] = useState<AppLang>(loadLang);
  const j = resources[lang].jobOs;
  const t = resources[lang];

  const [authOpen, setAuthOpen] = useState(false);
  const [queue, setQueue] = useState<ApplyQueueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("pack");
  const [artifacts, setArtifacts] = useState<JobArtifacts | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{ provider?: string; model?: string; available?: boolean } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");

  useEffect(() => {
    saveLang(lang);
  }, [lang]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/job-os/queue");
      if (res.status === 401) {
        setQueue([]);
        flash(j.sessionExpired);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Failed to load queue");
        setQueue([]);
        return;
      }
      setQueue(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [user, j.sessionExpired]);

  useEffect(() => {
    reload();
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setAiStatus({ available: d.hasApiKey, provider: d.llmProvider, model: d.llmModel }))
      .catch(() => setAiStatus({ available: false }));
  }, [reload]);

  const nextApply = useMemo(
    () =>
      [...queue]
        .filter((q) => q.status === "apply_today")
        .sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1))[0] ?? null,
    [queue]
  );

  const stats = useMemo(() => {
    const applyToday = queue.filter((q) => q.status === "apply_today").length;
    const ranked = queue.filter((q) => q.status === "ranked").length;
    const applied = queue.filter((q) => q.status === "applied").length;
    return { applyToday, ranked, applied, total: queue.length };
  }, [queue]);

  const filtered = useMemo(() => {
    const sorted = [...queue].sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
    if (filter === "all") return sorted;
    return sorted.filter((q) => q.status === filter);
  }, [queue, filter]);

  const selected = queue.find((q) => q.id === selectedId) ?? null;

  async function loadDetail(id: string) {
    setSelectedId(id);
    const res = await apiFetch(`/api/job-os/job/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (data?.artifacts) setArtifacts(data.artifacts);
    else setArtifacts(null);
  }

  async function runAction(id: string, path: string, body?: object) {
    setBusy(id);
    try {
      const res = await apiFetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error ?? data.reason ?? "Request failed");
      if (Array.isArray(data.queue)) setQueue(data.queue);
      else await reload();
      flash("✓");
    } catch (e: any) {
      flash(e.message ?? "Error");
    } finally {
      setBusy(null);
    }
  }

  async function patchStatus(id: string, status: string) {
    await apiFetch(`/api/job-os/queue/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        dates: status === "applied" ? { appliedAt: new Date().toISOString() } : undefined,
      }),
    });
    await reload();
    flash(status === "applied" ? j.markApplied : j.skip);
  }

  async function copyPaste(id: string) {
    const res = await apiFetch(`/api/job-os/paste/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (data?.paste) {
      await navigator.clipboard.writeText(data.paste);
      flash(j.copyPaste);
    }
  }

  async function prepareAndOpen(id: string, url?: string) {
    setBusy("prepare");
    try {
      const res = await apiFetch(`/api/job-os/prepare-apply/${encodeURIComponent(id)}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Prepare failed");
      if (Array.isArray(data.queue)) setQueue(data.queue);
      if (data.artifacts) setArtifacts(data.artifacts);
      const openUrl = data.applyUrl || url;
      if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer");
      flash(data.llm?.available ? "Pack ready (AI) · use Paste helper on form" : "Pack ready · use Paste helper on form");
    } catch (e: any) {
      flash(e.message ?? "Prepare failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitAddJob(e: React.FormEvent) {
    e.preventDefault();
    if (!addText.trim()) return;
    setBusy("add");
    try {
      const res = await apiFetch("/api/job-os/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: addUrl || undefined,
          company: addCompany || undefined,
          title: addTitle || undefined,
          rawText: addText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAddUrl("");
      setAddCompany("");
      setAddTitle("");
      setAddText("");
      setAddOpen(false);
      if (Array.isArray(data.queue)) setQueue(data.queue);
      else await reload();
      flash(j.saveJob);
    } catch (err: any) {
      flash(err.message ?? "Add failed");
    } finally {
      setBusy(null);
    }
  }

  function detailContent(): string {
    if (!artifacts) return j.noPack;
    switch (detailTab) {
      case "pack":
        return artifacts.applicationPack ?? "(no pack)";
      case "paste":
        return artifacts.pasteBank ?? "(no paste bank)";
      case "interview":
        return artifacts.interviewPrep ?? "(no interview prep)";
      case "followups":
        return artifacts.followUps ?? "(no follow-ups)";
      default:
        return "";
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen text-slate-400 flex items-center justify-center text-sm">
        …
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen text-slate-200 flex flex-col items-center justify-center p-6">
        <h1 className="text-xl font-semibold text-white mb-2">{j.loginRequiredTitle}</h1>
        <p className="text-sm text-slate-400 mb-6 text-center max-w-md">{j.loginRequiredDesc}</p>
        <button
          onClick={() => setAuthOpen(true)}
          className="bg-sky-700 hover:bg-sky-600 px-5 py-2.5 rounded-lg text-sm font-semibold"
        >
          {j.loginCta}
        </button>
        <a href="/" className="mt-4 text-xs text-slate-500 hover:text-slate-300">{j.backResume}</a>
        <button
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          className="mt-4 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === "en" ? "ES" : "EN"}
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} lang={lang} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 font-sans">
      <nav className="border-b border-slate-800 glass-nav sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <AppLogo size="sm" />
            <div>
            <h1 className="text-lg font-semibold text-white">{j.title}</h1>
            <p className="text-[11px] text-slate-400">
              {j.subtitle}
              {aiStatus?.available ? (
                <span className="text-emerald-400"> · AI: {aiStatus.provider}/{aiStatus.model}</span>
              ) : (
                <span className="text-amber-400"> · {j.aiOffline}</span>
              )}
            </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "es" : "en")}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1"
              title="Español / English"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "en" ? "ES" : "EN"}
            </button>
            <a
              href="/"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              {j.backResume}
            </a>
            <span className="text-[10px] text-slate-500 hidden sm:inline">{user.email}</span>
            <button
              onClick={logout}
              className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-white"
            >
              {t.signOut}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {toast ? (
          <div className="fixed top-4 right-4 z-50 bg-sky-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
            {toast}
          </div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: j.applyToday, value: stats.applyToday, color: "text-emerald-400" },
            { label: j.ranked, value: stats.ranked, color: "text-sky-400" },
            { label: j.applied, value: stats.applied, color: "text-indigo-400" },
            { label: j.total, value: stats.total, color: "text-slate-300" },
          ].map((s) => (
            <div key={s.label} className="glass-surface border border-slate-800 rounded-xl p-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        <JobFinderPanel
          labels={{
            title: j.finderTitle,
            subtitle: j.finderSubtitle,
            search: j.finderSearch,
            searching: j.finderSearching,
            importSelected: j.finderImport,
            importPack: j.finderImportPack,
            fetchUrl: j.finderFetchUrl,
            fetchUrlPh: j.finderFetchUrlPh,
            bookmarklet: j.finderBookmarklet,
            pasteBookmarklet: j.finderPasteBookmarklet,
            fit: j.finderFit,
            queued: j.finderQueued,
            noResults: j.finderNoResults,
            keywordsPh: j.finderKeywordsPh,
            obscuraOn: j.finderObscuraOn,
            obscuraOff: j.finderObscuraOff,
            matchProfile: j.finderMatchProfile,
            noResume: j.finderNoResume,
          }}
          onImported={reload}
          flash={flash}
        />

        {nextApply ? (
          <div className="glass-surface border border-emerald-800/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold">{j.quickApplyTitle}</div>
              <div className="text-sm font-semibold text-white truncate">
                {nextApply.company} — {nextApply.title}
              </div>
              <div className="text-[11px] text-slate-400">{j.quickApplyHint}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!!busy}
                onClick={() => prepareAndOpen(nextApply.id, nextApply.url)}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 font-semibold disabled:opacity-50"
              >
                {busy === "prepare" ? "…" : j.quickApplyPrepare}
              </button>
              {nextApply.url ? (
                <a
                  href={nextApply.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
                >
                  {j.quickApplyOpen}
                </a>
              ) : null}
              <button
                onClick={() => copyPaste(nextApply.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                {j.quickApplyCopy}
              </button>
              <button
                onClick={() => patchStatus(nextApply.id, "applied")}
                className="text-xs px-3 py-1.5 rounded-lg bg-sky-800 hover:bg-sky-700 font-semibold"
              >
                {j.quickApplyDone}
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            disabled={!!busy}
            onClick={() => runAction("sync", "/api/job-os/run/sync")}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
          >
            {busy === "sync" ? "…" : j.syncFolder}
          </button>
          <button
            disabled={!!busy}
            onClick={() => runAction("source", "/api/job-os/run/source")}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
          >
            {busy === "source" ? "…" : j.sourceInbox}
          </button>
          <button
            disabled={!!busy}
            onClick={() => runAction("cannon", "/api/job-os/run/cannon")}
            className="text-xs px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 border border-sky-600 font-semibold disabled:opacity-50"
          >
            {busy === "cannon" ? "…" : j.scorePack}
          </button>
          <button
            disabled={!!busy}
            onClick={() => runAction("repack", "/api/job-os/run/cannon", { force: true })}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
          >
            {busy === "repack" ? "…" : j.forceRepack}
          </button>
          <button
            disabled={!!busy || !aiStatus?.available || !selected}
            onClick={async () => {
              if (!selected) return;
              setBusy("tailor");
              try {
                const res = await apiFetch(`/api/job-os/tailor/${encodeURIComponent(selected.id)}`, { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Tailor failed");
                if (data.artifacts) setArtifacts(data.artifacts);
                flash(`AI: ${data.llmProvider}`);
              } catch (e: any) {
                flash(e.message ?? "AI tailor failed");
              } finally {
                setBusy(null);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 border border-violet-600 font-semibold disabled:opacity-50"
          >
            {busy === "tailor" ? "…" : j.aiTailor}
          </button>
          <button
            disabled={!!busy}
            onClick={() => runAction("legacy", "/api/auth/claim-legacy")}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-200 disabled:opacity-50"
          >
            {busy === "legacy" ? "…" : j.importLegacy}
          </button>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 border border-indigo-600 font-semibold"
          >
            {j.addJob}
          </button>
        </div>

        {addOpen ? (
          <form onSubmit={submitAddJob} className="glass-surface border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-sm font-semibold text-white">{j.pasteJobTitle}</div>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                placeholder={j.companyPh}
                value={addCompany}
                onChange={(e) => setAddCompany(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs"
              />
              <input
                placeholder={j.rolePh}
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs"
              />
              <input
                placeholder={j.urlPh}
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs"
              />
            </div>
            <textarea
              required
              placeholder={j.descPh}
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono"
            />
            <button
              type="submit"
              disabled={busy === "add"}
              className="text-xs px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 font-semibold disabled:opacity-50"
            >
              {busy === "add" ? j.saving : j.saveJob}
            </button>
          </form>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-md border ${
                filter === f
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 overflow-x-auto rounded-xl border border-slate-800">
            {loading ? (
              <div className="p-4 text-sm text-slate-400">…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-left">
                    <th className="p-2">{j.companyPh}</th>
                    <th className="p-2">{j.rolePh}</th>
                    <th className="p-2">Fit</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">—</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr
                      key={q.id}
                      className={`border-t border-slate-800 cursor-pointer hover:bg-slate-900/60 ${
                        selectedId === q.id ? "bg-slate-900/80" : ""
                      }`}
                      onClick={() => loadDetail(q.id)}
                    >
                      <td className="p-2">{q.company ?? "—"}</td>
                      <td className="p-2 max-w-[140px] truncate" title={q.title}>
                        {q.title ?? "—"}
                      </td>
                      <td className="p-2">
                        <span
                          className={
                            (q.fitScore ?? 0) >= 7
                              ? "text-emerald-400 font-semibold"
                              : (q.fitScore ?? 0) >= 5
                                ? "text-amber-400"
                                : "text-slate-400"
                          }
                        >
                          {typeof q.fitScore === "number" ? q.fitScore : "—"}
                        </span>
                        {q.decision ? (
                          <span className="ml-1 text-[10px] text-slate-500">{q.decision}</span>
                        ) : null}
                      </td>
                      <td className="p-2 text-xs">{q.status ?? "—"}</td>
                      <td className="p-2 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        {q.url ? (
                          <a
                            href={q.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 inline-block"
                          >
                            {j.open}
                          </a>
                        ) : null}
                        {(q.status === "apply_today" || q.status === "applied") && (
                          <button
                            onClick={() => copyPaste(q.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
                          >
                            {j.copy}
                          </button>
                        )}
                        {q.status === "apply_today" ? (
                          <button
                            onClick={() => patchStatus(q.id, "applied")}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-sky-700 hover:bg-sky-600"
                          >
                            {j.markApplied}
                          </button>
                        ) : null}
                        {q.status !== "rejected" && q.status !== "applied" ? (
                          <button
                            onClick={() => patchStatus(q.id, "rejected")}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/50 hover:bg-rose-900 text-rose-300"
                          >
                            {j.skip}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-slate-400 text-sm">
                        {j.emptyQueue}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>

          <div className="lg:col-span-2 glass-surface border border-slate-800 rounded-xl p-3 flex flex-col min-h-[320px]">
            {selected ? (
              <>
                <div className="mb-2">
                  <div className="font-semibold text-white text-sm">{selected.company}</div>
                  <div className="text-xs text-slate-400">{selected.title}</div>
                  {selected.riskFlags?.length ? (
                    <div className="mt-1 text-[10px] text-amber-400">
                      Risks: {selected.riskFlags.join(", ")}
                    </div>
                  ) : null}
                  {artifacts?.score?.fit?.reasons?.length ? (
                    <div className="mt-1 text-[10px] text-slate-500">
                      {artifacts.score.fit.reasons.slice(0, 4).join(" · ")}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-1 mb-2 flex-wrap">
                  {(["pack", "paste", "interview", "followups"] as DetailTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        detailTab === tab ? "bg-slate-800 border-slate-600" : "border-slate-800 text-slate-400"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <pre className="flex-1 text-[10px] bg-slate-950 border border-slate-800 rounded p-2 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {detailContent().slice(0, 6000)}
                </pre>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => copyPaste(selected.id)}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    {j.copyPaste}
                  </button>
                  <button
                    onClick={() =>
                      apiFetch(`/api/job-os/export-pdf/${encodeURIComponent(selected.id)}`, { method: "POST" }).then(() =>
                        flash(j.exportPdf)
                      )
                    }
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    {j.exportPdf}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 m-auto text-center px-4">{j.selectJob}</div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center">{j.footer}</p>
      </div>
    </div>
  );
}
