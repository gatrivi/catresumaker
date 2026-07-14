/**
 * Bookmarklet: capture the current job page into Job OS (human-initiated).
 * Load via Job OS bookmarklet (embeds token + API origin).
 */
(function () {
  const scripts = document.querySelectorAll("script[src*='job-capture.js']");
  const last = scripts[scripts.length - 1];
  const API =
    (last && last.getAttribute("data-api")) ||
    (last && last.src ? new URL(last.src).origin : "") ||
    "";
  const token =
    (last && last.getAttribute("data-token")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("catresumaker_token")) ||
    "";

  if (!API || !token) {
    alert("Open Job OS, drag Capture bookmarklet to bookmarks again (while signed in).");
    return;
  }

  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
  const title = ogTitle || document.title || "";
  const company =
    document.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ||
    document.querySelector("[data-company]")?.textContent?.trim() ||
    "";

  const main =
    document.querySelector("main") ||
    document.querySelector("[role=main]") ||
    document.querySelector("article") ||
    document.body;

  const rawText = [
    `URL: ${location.href}`,
    `Title: ${title}`,
    company ? `Company: ${company}` : "",
    "",
    (main?.innerText || document.body.innerText || "").slice(0, 24_000),
  ]
    .filter(Boolean)
    .join("\n");

  if (rawText.length < 120) {
    alert("Not enough text on this page to capture.");
    return;
  }

  const ok = confirm(
    "Send this page to Job OS queue?\n\n" + title.slice(0, 80) + "\n(no auto-apply — review in dashboard)"
  );
  if (!ok) return;

  fetch(API + "/api/job-os/capture", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      url: location.href,
      title: title.slice(0, 200),
      company: company.slice(0, 120),
      rawText,
      source: "bookmarklet",
    }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (!d.success) throw new Error(d.error || "Capture failed");
      alert("Job captured. Open Job OS → Import & pack / Score + Pack.");
    })
    .catch((e) => alert(e.message || String(e)));
})();
