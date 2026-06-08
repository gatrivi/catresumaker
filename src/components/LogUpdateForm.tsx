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

interface LogUpdateFormProps {
  currentResume: ResumeData;
  onUpdateResume: (updatedResume: ResumeData) => void;
  logs: WorkLogEntry[];
  onSetLogs: (logs: WorkLogEntry[]) => void;
}

export default function LogUpdateForm({ 
  currentResume, 
  onUpdateResume, 
  logs, 
  onSetLogs 
}: LogUpdateFormProps) {
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
        throw new Error(resData.error || "Failed to structure log update.");
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
      setError(err.message || "An error occurred during Gemini sync.");
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
        <div className="bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100 rounded-xl p-5 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-base mb-3">
            <GitMerge className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>AI Revision Completed</span>
          </div>

          <div className="bg-white rounded-lg p-4 border border-indigo-100/50 text-xs text-neutral-700 leading-relaxed max-h-48 overflow-y-auto mb-4 font-sans shadow-inner">
            <h5 className="font-bold text-neutral-800 text-xs uppercase tracking-wider mb-2 text-[10px]">Changes Logged:</h5>
            <p className="whitespace-pre-line">{explanation}</p>
          </div>

          <p className="text-xs text-indigo-950/70 mb-4 font-semibold flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1.5 rounded-md">
            <ArrowLeftRight className="w-4 h-4 text-indigo-600 shrink-0" />
            Review the updated document to verify content placement before committing.
          </p>

          <div className="grid grid-cols-2 gap-3 pb-1">
            <button
              onClick={() => {
                setPendingDraft(null);
                setExplanation(null);
              }}
              className="px-4 py-2 bg-white border border-neutral-250 text-neutral-700 text-xs font-semibold rounded-lg hover:bg-neutral-50 cursor-pointer transition-all uppercase tracking-wider text-center"
            >
              Discard Suggestions
            </button>
            <button
              onClick={handleAcceptChanges}
              className="px-4 py-2 bg-slate-900 border border-slate-900 hover:bg-indigo-600 hover:border-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept Changes
            </button>
          </div>
        </div>
      )}

      {/* Daily Progress Entry Card */}
      {!pendingDraft && (
        <div className="bg-white rounded-xl border border-neutral-150 p-5 shadow-sm">
          <h3 className="font-semibold text-neutral-900 text-base mb-1 inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-500" />
            Day-To-Day Career Logger
          </h3>
          <p className="text-xs text-neutral-500 mb-4">Record your daily actions, accomplishments, or metrics. Gemini will integrate them cleanly into the PDF layout.</p>

          <form onSubmit={handleAddLocalLog} className="flex flex-col gap-3">
            <div className="relative">
              <textarea
                value={newLogText}
                onChange={(e) => setNewLogText(e.target.value)}
                disabled={loading}
                placeholder="Today I wrote a new API route in Express checking parameter structures... OR I optimized our Kubernetes warmup times by 10% using pre-loaded images."
                className="w-full h-24 p-3 pr-8 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white resize-none transition-all font-sans"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !newLogText.trim()}
                className="flex-1 bg-white border border-neutral-250 text-neutral-700 text-xs font-medium py-2 rounded-lg hover:border-neutral-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed justify-center items-center inline-flex gap-1"
                title="Save this log to timeline to apply later"
              >
                <Plus className="w-3.5 h-3.5" />
                Store to Timeline
              </button>

              <button
                type="button"
                onClick={() => handleAISync(newLogText)}
                disabled={loading || !newLogText.trim()}
                className="flex-1 bg-neutral-900 hover:bg-sky-600 text-white text-xs font-semibold py-2 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed justify-center items-center inline-flex gap-1.5 transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                    Quick AI Sync
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Feed History */}
      {!pendingDraft && (
        <div className="bg-white rounded-xl border border-neutral-150 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-neutral-900 text-sm">
              Work Logs Timeline ({logs.length})
            </h4>
            {logs.some(l => l.status === "pending") && (
              <button
                onClick={handleBulkSyncAll}
                disabled={loading}
                className="text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800 tracking-wider inline-flex items-center gap-1 cursor-pointer"
              >
                Sync Pending ({logs.filter(l => l.status === "pending").length})
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-neutral-100 rounded-lg text-neutral-400 text-xs flex flex-col items-center gap-2">
                <Clock className="w-5 h-5 text-neutral-300" />
                <p>No activity logs captured.</p>
                <p className="text-[10px] text-neutral-400 max-w-[200px]">Logs entered here track your daily tasks, ready to sync dynamically.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded-lg border text-xs relative group transition-all ${
                    log.status === "integrated" 
                      ? "bg-emerald-50/20 border-emerald-100" 
                      : "bg-neutral-50/60 border-neutral-150 hover:bg-neutral-50 hover:border-neutral-250 cursor-pointer"
                  }`}
                  onClick={() => log.status === 'pending' && handleAISync(log.content, log.id)}
                >
                  <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2 pr-6">
                    <span className="font-mono text-[10px] text-neutral-400 font-medium flex items-center gap-1.5 flex-row">
                      <Clock className="w-3 h-3" />
                      {log.date}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      log.status === 'integrated' 
                        ? 'bg-emerald-100/60 text-emerald-700' 
                        : 'bg-indigo-100/60 text-indigo-700 font-medium'
                    }`}>
                      {log.status === 'integrated' ? 'Synced' : 'Ready to Sync'}
                    </span>
                  </div>

                  <p className="text-neutral-700 font-sans leading-relaxed break-words">{log.content}</p>

                  <button
                    onClick={(e) => handleDeleteLog(log.id, e)}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-rose-600 transition-opacity p-1 rounded hover:bg-neutral-100 opacity-60 group-hover:opacity-100 cursor-pointer"
                    title="Delete entry"
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
