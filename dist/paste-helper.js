/**
 * Paste helper — on an application page, copy fields from Job OS paste bank.
 * Bookmarklet: same pattern as job-capture.js but loads this script.
 */
(function () {
  const token = localStorage.getItem("catresumaker_token");
  if (!token) {
    alert("Sign in to CatResumeMaker first.");
    return;
  }

  const pageUrl = location.href;

  fetch("/api/job-os/queue", { headers: { Authorization: "Bearer " + token } })
    .then((r) => r.json())
    .then((queue) => {
      if (!Array.isArray(queue)) throw new Error("Could not load queue");
      const match =
        queue.find((j) => j.url && pageUrl.startsWith(j.url.split("?")[0])) ||
        queue.find((j) => j.status === "apply_today");
      if (!match) {
        alert("No matching job in queue for this page. Mark a job apply_today or capture URL first.");
        return;
      }
      return fetch("/api/job-os/paste/" + encodeURIComponent(match.id), {
        headers: { Authorization: "Bearer " + token },
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.paste) throw new Error(data.error || "No paste bank");
          const panel = document.createElement("div");
          panel.id = "crm-paste-helper";
          panel.style.cssText =
            "position:fixed;bottom:16px;right:16px;z-index:2147483646;max-width:320px;background:rgba(15,23,42,.92);color:#e2e8f0;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:12px;font:12px system-ui;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,.4)";
          panel.innerHTML =
            '<div style="font-weight:600;margin-bottom:8px">CatResumeMaker paste</div>' +
            '<div style="opacity:.8;margin-bottom:8px;font-size:11px">' +
            (match.company || "") +
            " — " +
            (match.title || "") +
            "</div>" +
            '<button id="crm-copy-all" style="width:100%;padding:8px;border-radius:8px;border:none;background:#0369a1;color:#fff;font-weight:600;cursor:pointer;margin-bottom:6px">Copy full paste bank</button>' +
            '<button id="crm-close" style="width:100%;padding:6px;border-radius:8px;border:1px solid #334155;background:transparent;color:#94a3b8;cursor:pointer">Close</button>';
          document.body.appendChild(panel);
          document.getElementById("crm-copy-all").onclick = function () {
            navigator.clipboard.writeText(data.paste).then(function () {
              alert("Paste bank copied — fill form manually, then submit yourself.");
            });
          };
          document.getElementById("crm-close").onclick = function () {
            panel.remove();
          };
        });
    })
    .catch((e) => alert(e.message || String(e)));
})();
