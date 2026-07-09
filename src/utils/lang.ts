export type AppLang = "es" | "en";

export const DEFAULT_LANG: AppLang = "es";

export function loadLang(): AppLang {
  const saved = localStorage.getItem("catresumaker_lang");
  return saved === "en" ? "en" : "es";
}

export function saveLang(lang: AppLang) {
  localStorage.setItem("catresumaker_lang", lang);
  document.documentElement.lang = lang;
}
