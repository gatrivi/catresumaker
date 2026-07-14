/**
 * Paste helper — on an application page you opened.
 * Agent fills safe fields / copies paste bank. YOU submit. Never auto-submit.
 *
 * Load via Job OS bookmarklet (embeds token + API origin).
 */
(function () {
  const scripts = document.querySelectorAll("script[src*='paste-helper.js']");
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
    alert("Open Job OS, drag Paste helper to bookmarks again (while signed in).");
    return;
  }

  if (document.getElementById("crm-paste-helper")) {
    document.getElementById("crm-paste-helper").remove();
  }

  const FIELD_LABELS = {
    full_name: "Name",
    email: "Email",
    phone: "Phone",
    current_location: "Location",
    current_company: "Company",
    linkedin: "LinkedIn",
    github: "GitHub",
    portfolio: "Portfolio",
    desired_salary: "Salary",
    start_date: "Start / availability",
    application_100: "Cover (long)",
    application_50: "Cover (short)",
    technical_talking_point: "Tech talking point",
    recruiter_dm: "Recruiter DM",
    follow_up_message: "Follow-up",
    interview_prep_talking_point: "Interview tip",
  };

  const FILL_HINTS = {
    full_name: ["name", "full name", "fullname", "fullname completo", "applicant"],
    email: ["email", "e-mail", "correo"],
    phone: ["phone", "tel", "mobile", "celular", "telefono", "teléfono"],
    current_location: ["location", "city", "where do you live", "ubicacion", "ubicación", "address"],
    current_company: ["current company", "employer", "company name", "empresa actual"],
    linkedin: ["linkedin"],
    github: ["github"],
    portfolio: ["portfolio", "website", "personal site", "url"],
    desired_salary: ["salary", "compensation", "pay", "salario", "expectativa"],
    start_date: ["start", "availability", "when can you", "disponible", "notice"],
    application_100: ["cover letter", "why do you", "why are you", "tell us about", "additional", "message", "motivation"],
    application_50: ["short answer", "briefly", "summary"],
  };

  function parsePaste(text) {
    const fields = {};
    const parts = text.split(/\n(?=\[)/);
    for (const part of parts) {
      const m = part.match(/^\[([a-z0-9_]+)\]\s*\n?([\s\S]*)$/i);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (val) fields[key] = val;
    }
    return fields;
  }

  function fieldAttr(el) {
    return [
      el.name,
      el.id,
      el.placeholder,
      el.getAttribute("aria-label"),
      el.getAttribute("autocomplete"),
      el.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function labelFor(el) {
    if (el.id) {
      const lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (lab) return lab.textContent || "";
    }
    const parent = el.closest("label");
    return parent ? parent.textContent || "" : "";
  }

  function scoreInput(el, hints) {
    const hay = (fieldAttr(el) + " " + labelFor(el)).toLowerCase();
    let score = 0;
    for (const h of hints) {
      if (hay.includes(h)) score += h.length;
    }
    return score;
  }

  function setValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.style.outline = "2px solid #34d399";
  }

  function suggestFill(fields) {
    const inputs = Array.from(
      document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea")
    ).filter((el) => !el.disabled && !el.readOnly);

    let filled = 0;
    const used = new Set();

    for (const [key, hints] of Object.entries(FILL_HINTS)) {
      const value = fields[key];
      if (!value) continue;
      let best = null;
      let bestScore = 0;
      for (const el of inputs) {
        if (used.has(el)) continue;
        if (el.value && String(el.value).trim()) continue;
        const s = scoreInput(el, hints);
        if (s > bestScore) {
          bestScore = s;
          best = el;
        }
      }
      if (best && bestScore > 0) {
        setValue(best, value);
        used.add(best);
        filled++;
      }
    }
    return filled;
  }

  function authHeaders() {
    return { Authorization: "Bearer " + token };
  }

  fetch(API + "/api/job-os/queue", { headers: authHeaders() })
    .then((r) => r.json())
    .then((queue) => {
      if (!Array.isArray(queue)) throw new Error("Could not load queue — re-drag bookmarklet from Job OS");
      const pageUrl = location.href;
      const match =
        queue.find((j) => j.url && pageUrl.indexOf(j.url.split("?")[0]) === 0) ||
        queue.find((j) => j.url && pageUrl.includes(new URL(j.url).hostname)) ||
        queue.find((j) => j.status === "apply_today");
      if (!match) {
        alert("No matching job in queue. Capture/import first, then open the apply form.");
        return;
      }
      return fetch(API + "/api/job-os/paste/" + encodeURIComponent(match.id), {
        headers: authHeaders(),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.paste) throw new Error(data.error || "No paste bank — run Score + Pack / Import & pack first");
          const fields = parsePaste(data.paste);
          const keys = Object.keys(FIELD_LABELS).filter((k) => fields[k]);

          const panel = document.createElement("div");
          panel.id = "crm-paste-helper";
          panel.style.cssText =
            "position:fixed;bottom:12px;right:12px;z-index:2147483646;width:min(340px,92vw);max-height:80vh;overflow:auto;background:rgba(15,23,42,.95);color:#e2e8f0;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:12px;font:12px system-ui;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,.45)";

          let html =
            '<div style="font-weight:600;margin-bottom:4px">CatResumeMaker assist</div>' +
            '<div style="opacity:.8;margin-bottom:8px;font-size:11px">' +
            (match.company || "") +
            " — " +
            (match.title || "") +
            "</div>" +
            '<div style="font-size:10px;color:#94a3b8;margin-bottom:8px">Agent fills · you review · you submit</div>' +
            '<button id="crm-suggest" style="width:100%;padding:8px;border-radius:8px;border:none;background:#059669;color:#fff;font-weight:600;cursor:pointer;margin-bottom:6px">Fill matching fields</button>' +
            '<button id="crm-copy-all" style="width:100%;padding:8px;border-radius:8px;border:none;background:#0369a1;color:#fff;font-weight:600;cursor:pointer;margin-bottom:8px">Copy full paste bank</button>' +
            '<div style="display:grid;gap:4px;margin-bottom:8px">';

          for (const k of keys) {
            html +=
              '<button data-crm-field="' +
              k +
              '" style="text-align:left;padding:6px 8px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#cbd5e1;cursor:pointer;font-size:11px">' +
              (FIELD_LABELS[k] || k) +
              " · copy</button>";
          }

          html +=
            "</div>" +
            '<button id="crm-applied" style="width:100%;padding:8px;border-radius:8px;border:none;background:#1e3a5f;color:#e2e8f0;font-weight:600;cursor:pointer;margin-bottom:6px">Mark applied in Job OS</button>' +
            '<button id="crm-close" style="width:100%;padding:6px;border-radius:8px;border:1px solid #334155;background:transparent;color:#94a3b8;cursor:pointer">Close</button>';

          panel.innerHTML = html;
          document.body.appendChild(panel);

          document.getElementById("crm-suggest").onclick = function () {
            const n = suggestFill(fields);
            alert(
              n
                ? "Filled " + n + " empty field(s). Review highlighted inputs, then submit yourself."
                : "No empty matching fields found — use Copy buttons."
            );
          };

          document.getElementById("crm-copy-all").onclick = function () {
            navigator.clipboard.writeText(data.paste).then(function () {
              alert("Paste bank copied.");
            });
          };

          panel.querySelectorAll("[data-crm-field]").forEach(function (btn) {
            btn.onclick = function () {
              const k = btn.getAttribute("data-crm-field");
              navigator.clipboard.writeText(fields[k] || "").then(function () {
                btn.textContent = (FIELD_LABELS[k] || k) + " · copied ✓";
                setTimeout(function () {
                  btn.textContent = (FIELD_LABELS[k] || k) + " · copy";
                }, 1200);
              });
            };
          });

          document.getElementById("crm-applied").onclick = function () {
            fetch(API + "/api/job-os/queue/" + encodeURIComponent(match.id), {
              method: "PATCH",
              headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
              body: JSON.stringify({
                status: "applied",
                dates: { appliedAt: new Date().toISOString() },
              }),
            })
              .then(function (r) {
                return r.json();
              })
              .then(function () {
                alert("Marked applied in Job OS. Close this panel after you submit the form.");
              })
              .catch(function (e) {
                alert(e.message || "Could not mark applied");
              });
          };

          document.getElementById("crm-close").onclick = function () {
            panel.remove();
          };
        });
    })
    .catch((e) => alert(e.message || String(e)));
})();
