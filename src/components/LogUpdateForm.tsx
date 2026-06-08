import React, { useState } from "react";
import { ResumeData, WorkLogEntry } from "../types.ts";
import { 
  Sparkles, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  ChevronRight, 
  GitMerge, 
  ArrowLeftRight 
} from "lucide-react";
import { resources } from "../utils/translations";

interface LogUpdateFormProps {
  currentResume: ResumeData;
  onUpdateResume: (updatedResume: ResumeData) => void;
  logs: WorkLogEntry[];
  onSetLogs: (logs: WorkLogEntry[]) => void;
  lang?: 'es' | 'en';
}

export default function LogUpdateForm({ 
  currentResume, 
  onUpdateResume, 
  logs, 
  onSetLogs,
  lang = 'en'
}: LogUpdateFormProps) {
  const t = resources[lang];
  const [newLogText, setNewLogText] = useState("");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add Log locally
  const handleAddLocalLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) return;

    const entry: WorkLogEntry = {
      id: "log-" + Date.now(),
      date: new Date().toLocaleDateString(),
      content: newLogText,
      status: 'pending'
    };

    onSetLogs([entry, ...logs]);
    setNewLogText("");
  };

  // Immediate AI Sync
  const handleAISync = async (logString: string, targetLogId?: string) => {
    setLoading(true);
    setError(null);
    setExplanation(null);
    setPendingDraft(null);

    try {
      const response = await fetch("/api/resume/apply-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentResume,
          logText: logString
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || (lang === 'es' ? "Error al estructurar la sincronización." : "Failed to structure log update."));
      }

      setExplanation(resData.explanationOfChanges);
      
      // Stabilize the returned model resume with updated metadata/timestamps
      const stableResume: ResumeData = {
        ...resData.updatedResume,
        id: currentResume.id,
        label: currentResume.label,
        updatedAt: new Date().toISOString()
      };

      setPendingDraft(stableResume);

      // If we synced a specific log, store reference/id so we can mark it
      if (targetLogId) {
        (window as any)._activeSyncLogId = targetLogId;
      } else {
        (window as any)._activeSyncLogId = "bulk-direct";
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || (lang === 'es' ? "Ocurrió un error en la sincronización con Gemini." : "An error occurred during Gemini sync."));
    } finally {
      setLoading(false);
    }
  };

  // Bulk sync all pending logs
  const handleBulkSyncAll = () => {
    const pendingLogs = logs.filter(l => l.status === 'pending');
    if (pendingLogs.length === 0) return;

    const consolidatedLogsText = pendingLogs
      .map((l, idx) => `[Update #${idx + 1} (${l.date})]: ${l.content}`)
      .join("\n\n");

    handleAISync(consolidatedLogsText, "bulk-all");
  };

  // Accept changes
  const handleAcceptChanges = () => {
    if (!pendingDraft) return;

    onUpdateResume(pendingDraft);

    // Update log entry status
    const activeId = (window as any)._activeSyncLogId;
    if (activeId === "bulk-all") {
      const updatedLogs = logs.map(l => 
        l.status === 'pending' ? { ...l, status: 'integrated' as const, integratedAt: new Date().toISOString() } : l
      );
      onSetLogs(updatedLogs);
    } else if (activeId && activeId !== "bulk-direct") {
      const updatedLogs = logs.map(l => 
        l.id === activeId ? { ...l, status: 'integrated' as const, integratedAt: new Date().toISOString() } : l
      );
      onSetLogs(updatedLogs);
    } else if (activeId === "bulk-direct" && newLogText) {
      // Direct update was triggered, add integrated right away
      const entry: WorkLogEntry = {
        id: "log-" + Date.now(),
        date: new Date().toLocaleDateString(),
        content: newLogText,
        status: 'integrated',
        integratedAt: new Date().toISOString()
      };
      onSetLogs([entry, ...logs]);
      setNewLogText("");
    }

    // Reset draft states
    setPendingDraft(null);
    setExplanation(null);
  };

  const handleDeleteLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSetLogs(logs.filter(l => l.id !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Pending Suggestion Panel (Takes over if draft exists) */}
      {pendingDraft && (
        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/20 rounded-xl p-5 shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-indigo-200 font-bold text-base mb-3">
            <GitMerge className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>{t.revisionCompleted}</span>
          </div>

          <div className="bg-slate-950 rounded-lg p-4 border border-indigo-500/10 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto mb-4 font-mono shadow-inner">
            <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">{t.changesLogged}</h5>
            <p className="whitespace-pre-line">{explanation}</p>
          </div>

          <p className="text-xs text-indigo-200/80 mb-4 font-semibold flex items-center gap-1.5 bg-indigo-500/15 p-2.5 rounded-lg border border-indigo-500/10">
            <ArrowLeftRight className="w-4 h-4 text-indigo-400 shrink-0" />
            {t.reviewDraft}
          </p>

          <div className="grid grid-cols-2 gap-3 pb-1">
            <button
              onClick={() => {
                setPendingDraft(null);
                setExplanation(null);
              }}
              className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer transition-all uppercase tracking-wider text-center"
            >
              {t.discardBtn}
            </button>
            <button
              onClick={handleAcceptChanges}
              className="px-4 py-2 bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t.acceptBtn}
            </button>
          </div>
        </div>
      )}

      {/* Daily Progress Entry Card */}
      {!pendingDraft && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <h3 className="font-semibold text-slate-100 text-base mb-1 inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-400" />
            {t.logTitle}
          </h3>
          <p className="text-xs text-slate-400 mb-4">{t.logSubtitle}</p>

          <form onSubmit={handleAddLocalLog} className="flex flex-col gap-3">
            <div className="relative">
              <textarea
                value={newLogText}
                onChange={(e) => setNewLogText(e.target.value)}
                disabled={loading}
                placeholder={t.logPlaceholder}
                className="w-full h-24 p-3 pr-8 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-slate-950 resize-none transition-all font-sans"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !newLogText.trim()}
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium py-2 rounded-lg hover:bg-slate-750 hover:border-slate-600 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed justify-center items-center inline-flex gap-1"
                title={t.saveLocalBtn}
              >
                <Plus className="w-3.5 h-3.5" />
                {t.saveLocalBtn}
              </button>

              <button
                type="button"
                onClick={() => handleAISync(newLogText)}
                disabled={loading || !newLogText.trim()}
                className="flex-1 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-semibold py-2 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed justify-center items-center inline-flex gap-1.5 transition-all shadow-md shadow-indigo-650/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animator-spin animate-spin text-indigo-300" />
                    <span>{t.syncingBtn}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                    {t.quickSyncBtn}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Feed History */}
      {!pendingDraft && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-slate-100 text-sm">
              {t.timelineTitle} ({logs.length})
            </h4>
            {logs.some(l => l.status === "pending") && (
              <button
                onClick={handleBulkSyncAll}
                disabled={loading}
                className="text-[10px] uppercase font-bold text-sky-450 hover:text-sky-300 tracking-wider inline-flex items-center gap-1 cursor-pointer"
              >
                {t.syncPendingBtn} ({logs.filter(l => l.status === "pending").length})
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-lg text-slate-500 text-xs flex flex-col items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                <p>{t.noLogsCaptured}</p>
                <p className="text-[10px] text-slate-600 max-w-[200px]">{t.noLogsDesc}</p>
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded-lg border text-xs relative group transition-all ${
                    log.status === "integrated" 
                      ? "bg-emerald-950/20 border-emerald-900/50" 
                      : "bg-slate-950 border-slate-800 hover:bg-slate-850 hover:border-slate-700 cursor-pointer"
                  }`}
                  onClick={() => log.status === 'pending' && handleAISync(log.content, log.id)}
                >
                  <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2 pr-6">
                    <span className="font-mono text-[10px] text-slate-500 font-medium flex items-center gap-1.5 flex-row">
                      <Clock className="w-3 h-3" />
                      {log.date}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      log.status === 'integrated' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' 
                        : 'bg-indigo-950 text-indigo-400 border border-indigo-900/40 font-medium'
                    }`}>
                      {log.status === 'integrated' ? t.synced : t.readyToSync}
                    </span>
                  </div>

                  <p className="text-slate-300 font-sans leading-relaxed break-words">{log.content}</p>

                  <button
                    onClick={(e) => handleDeleteLog(log.id, e)}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-rose-400 transition-opacity p-1 rounded hover:bg-slate-800 opacity-60 group-hover:opacity-100 cursor-pointer"
                    title={t.deleteEntry}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
