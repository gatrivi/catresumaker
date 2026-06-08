import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("[CatResumeMaker] main.tsx loaded", {
  href: window.location.href,
  pathname: window.location.pathname,
  origin: window.location.origin,
  baseURI: document.baseURI,
  lang: navigator.language
});

// Capture client-side errors so we can see why the UI isn't styling/mounting.
window.addEventListener("error", (event) => {
  console.error("[CatResumeMaker] window error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("[CatResumeMaker] unhandledrejection", {
    reason: (event as any).reason
  });
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

console.log("[CatResumeMaker] root element found", {
  id: rootElement.id,
  clientHeight: rootElement.clientHeight
});

// Log what CSS loaded so we can detect missing bundle issues (common "unstyled page" symptom).
const logStyleSheets = (label: string) => {
  try {
    const sheets = Array.from(document.styleSheets || []);
    const hrefs = sheets.map((s: any) => s.href).filter(Boolean);
    console.log(`[CatResumeMaker] ${label}: styleSheets count=${sheets.length} hrefsCount=${hrefs.length}`);
    console.log(`[CatResumeMaker] ${label}: styleSheets hrefs=`, hrefs);

    const linkCount = document.querySelectorAll('link[rel="stylesheet"]').length;
    const firstLink = document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement | null;
    console.log(`[CatResumeMaker] ${label}: link[rel=stylesheet] count=${linkCount} firstHref=${firstLink?.href || "none"}`);

    const bodyStyle = window.getComputedStyle(document.body);
    console.log(`[CatResumeMaker] ${label}: computed body background=${bodyStyle.backgroundColor} color=${bodyStyle.color}`);
  } catch (e: any) {
    console.warn(`[CatResumeMaker] ${label}: styleSheets read failed`, e?.message);
  }
};

logStyleSheets("t=0");
setTimeout(() => logStyleSheets("t=500ms"), 500);
setTimeout(() => logStyleSheets("t=2000ms"), 2000);

console.log("[CatResumeMaker] mounting React root");
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log("[CatResumeMaker] render() called");
