import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { X } from "lucide-react";
import { resources } from "../utils/translations";
import type { AppLang } from "../utils/lang";

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
  lang?: AppLang;
};

export default function AuthModal({ open, onClose, initialMode = "login", lang = "es" }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const a = resources[lang].auth;

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
      onClose();
    } catch (err: any) {
      setError(err.message ?? a.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white mb-1">
          {mode === "login" ? a.signInTitle : a.registerTitle}
        </h2>
        <p className="text-xs text-slate-400 mb-4">{a.privacyNote}</p>
        <form onSubmit={submit} className="space-y-3">
          {mode === "register" ? (
            <input
              required
              placeholder={a.fullName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm"
            />
          ) : null}
          <input
            required
            type="email"
            placeholder={a.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder={a.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm"
          />
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-sky-700 hover:bg-sky-600 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "…" : mode === "login" ? a.submitSignIn : a.submitRegister}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-3 text-xs text-slate-400 hover:text-sky-400 w-full text-center"
        >
          {mode === "login" ? a.switchToRegister : a.switchToSignIn}
        </button>
      </div>
    </div>
  );
}
