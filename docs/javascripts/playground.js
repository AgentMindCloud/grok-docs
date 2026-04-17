// grok-docs — live YAML validator playground.
// Pure client-side. Monaco editor + js-yaml + Ajv against local schemas.

(function () {
  "use strict";

  const SCHEMA_DIR = "../assets/schemas/latest/";
  const SCHEMA_MAP = {
    "grok-install": "grok-install.schema.json",
    "grok-agent": "grok-agent.schema.json",
    "grok-workflow": "grok-workflow.schema.json",
    "grok-security": "grok-security.schema.json",
    "grok-prompts": "grok-prompts.schema.json",
  };

  const DEFAULT_YAML = [
    "spec: grok-install/v2.12",
    "name: hello-grok",
    "description: The simplest possible Grok agent. Single agent, single tool.",
    "entrypoint: .grok/grok-agent.yaml",
    "model: grok-4",
    "runtime:",
    "  python: \">=3.11\"",
    "env:",
    "  - XAI_API_KEY",
    "",
  ].join("\n");

  const MONACO_VERSION = "0.50.0";
  const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;
  const JS_YAML_URL = "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js";
  const AJV_URL = "https://cdn.jsdelivr.net/npm/ajv@8.17.1/dist/ajv2020.bundle.min.js";

  let editor = null;
  let monaco = null;
  let ajvInstance = null;
  let schemaCache = {};
  let lastYaml = "";
  let debounceTimer = null;

  async function boot() {
    const host = document.getElementById("grok-playground");
    if (!host || host.dataset.booted === "1") return;
    host.dataset.booted = "1";

    await Promise.all([loadScript(JS_YAML_URL), loadScript(AJV_URL)]);
    await loadMonaco();
    setupEditor(host);
    setupActions(host);
    scheduleValidation(0);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function loadMonaco() {
    return new Promise((resolve, reject) => {
      const loader = document.createElement("script");
      loader.src = `${MONACO_BASE}/loader.js`;
      loader.onload = () => {
        // eslint-disable-next-line no-undef
        require.config({ paths: { vs: MONACO_BASE } });
        // eslint-disable-next-line no-undef
        require(["vs/editor/editor.main"], function () {
          monaco = window.monaco;
          resolve();
        });
      };
      loader.onerror = () => reject(new Error("Monaco loader failed"));
      document.head.appendChild(loader);
    });
  }

  function setupEditor(host) {
    const editorHost = host.querySelector("[data-grok-editor]");
    const isDark =
      document.body.getAttribute("data-md-color-scheme") === "slate" ||
      document.documentElement.getAttribute("data-md-color-scheme") === "slate";

    monaco.editor.defineTheme("grok-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "type", foreground: "00d4ff" },
        { token: "string", foreground: "c9cdd6" },
        { token: "number", foreground: "ffcf5c" },
        { token: "comment", foreground: "6e7580", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#0c0d10",
        "editor.foreground": "#e6e9ef",
        "editorLineNumber.foreground": "#3a3f48",
        "editorLineNumber.activeForeground": "#00d4ff",
        "editor.selectionBackground": "#00d4ff22",
        "editorCursor.foreground": "#00d4ff",
      },
    });

    editor = monaco.editor.create(editorHost, {
      value: DEFAULT_YAML,
      language: "yaml",
      theme: isDark ? "grok-dark" : "vs",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: "selection",
      wordWrap: "on",
    });

    editor.onDidChangeModelContent(() => scheduleValidation(250));

    const observer = new MutationObserver(() => {
      const nowDark =
        document.body.getAttribute("data-md-color-scheme") === "slate" ||
        document.documentElement.getAttribute("data-md-color-scheme") === "slate";
      monaco.editor.setTheme(nowDark ? "grok-dark" : "vs");
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-md-color-scheme"],
    });
  }

  function setupActions(host) {
    const copyBtn = host.querySelector("[data-grok-copy]");
    const downloadBtn = host.querySelector("[data-grok-download]");
    const sampleSel = host.querySelector("[data-grok-samples]");

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const repo = inferInstallRepo(editor.getValue());
        const cmd = repo
          ? `grok-install install ${repo}`
          : "grok-install install <owner>/<repo>";
        try {
          await navigator.clipboard.writeText(cmd);
          flash(copyBtn, "Copied!");
        } catch {
          flash(copyBtn, "Copy failed");
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        const blob = new Blob([editor.getValue()], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const kind = detectKind(editor.getValue()) || "grok-install";
        a.href = url;
        a.download = `${kind}.yaml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (sampleSel) {
      sampleSel.addEventListener("change", () => {
        const sample = SAMPLES[sampleSel.value];
        if (sample) editor.setValue(sample);
      });
    }
  }

  function scheduleValidation(delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runValidation, delay);
  }

  async function runValidation() {
    const text = editor.getValue();
    if (text === lastYaml) return;
    lastYaml = text;

    const panel = document.querySelector("[data-grok-output]");
    const badge = document.querySelector("[data-grok-badge]");
    if (!panel || !badge) return;

    let parsed;
    try {
      parsed = window.jsyaml.load(text);
    } catch (err) {
      renderStatus(badge, "error", "YAML syntax error");
      panel.innerHTML = renderIssue(
        "error",
        "Cannot parse YAML",
        err.message || String(err)
      );
      return;
    }

    if (parsed === null || parsed === undefined) {
      renderStatus(badge, "warn", "Empty document");
      panel.innerHTML = renderIssue("warn", "Nothing to validate", "Add some YAML above.");
      return;
    }

    const kind = detectKind(text, parsed);
    if (!kind) {
      renderStatus(badge, "warn", "Unknown kind");
      panel.innerHTML = renderIssue(
        "warn",
        "Can't tell which spec file this is",
        "We infer the file type from the top-level keys. Start with `spec:` (install), `agents:` (agent), `workflow:` (workflow), `prompts:` (prompts), or `safety_profile:` (security)."
      );
      return;
    }

    let schema;
    try {
      schema = await loadSchema(kind);
    } catch (err) {
      renderStatus(badge, "error", "Schema unavailable");
      panel.innerHTML = renderIssue(
        "error",
        `Couldn't load ${kind} schema`,
        err.message || String(err)
      );
      return;
    }

    const ajv = getAjv();
    let validate;
    try {
      validate = ajv.compile(schema);
    } catch (err) {
      renderStatus(badge, "error", "Schema error");
      panel.innerHTML = renderIssue(
        "error",
        "Schema failed to compile",
        err.message || String(err)
      );
      return;
    }

    const ok = validate(parsed);
    if (ok) {
      renderStatus(badge, "ok", `Valid ${kind}.yaml`);
      panel.innerHTML =
        `<div class="grok-playground__issue">Detected as <strong>${escapeHtml(
          kind
        )}.yaml</strong>. All checks passed.</div>` +
        renderStats(parsed, kind);
    } else {
      renderStatus(badge, "error", `${validate.errors.length} issue(s)`);
      panel.innerHTML = (validate.errors || [])
        .map((e) =>
          renderIssue(
            "err",
            `${e.instancePath || "/"} — ${e.message}`,
            `params: ${JSON.stringify(e.params)}`
          )
        )
        .join("");
    }
  }

  function getAjv() {
    if (ajvInstance) return ajvInstance;
    const AjvCtor = window.ajv2020 || window.Ajv2020 || window.Ajv;
    if (!AjvCtor) throw new Error("Ajv not loaded");
    ajvInstance = new AjvCtor({ allErrors: true, strict: false });
    return ajvInstance;
  }

  async function loadSchema(kind) {
    if (schemaCache[kind]) return schemaCache[kind];
    const url = SCHEMA_DIR + SCHEMA_MAP[kind];
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    schemaCache[kind] = json;
    return json;
  }

  function detectKind(text, parsed) {
    if (!parsed) {
      try {
        parsed = window.jsyaml.load(text);
      } catch {
        return null;
      }
    }
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.spec === "string" && parsed.spec.startsWith("grok-install/"))
      return "grok-install";
    if (Array.isArray(parsed.agents)) return "grok-agent";
    if (parsed.workflow && typeof parsed.workflow === "object") return "grok-workflow";
    if (parsed.prompts && typeof parsed.prompts === "object") return "grok-prompts";
    if (typeof parsed.safety_profile === "string") return "grok-security";
    return null;
  }

  function inferInstallRepo(yamlText) {
    try {
      const doc = window.jsyaml.load(yamlText);
      if (doc && typeof doc.repository === "string") {
        const m = doc.repository.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
        if (m) return `${m[1]}/${m[2]}`;
      }
      if (doc && typeof doc.name === "string") {
        return `your-org/${doc.name}`;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function renderStatus(badge, kind, label) {
    const cls =
      kind === "ok"
        ? "grok-playground__badge--ok"
        : kind === "warn"
        ? "grok-playground__badge--warn"
        : "grok-playground__badge--err";
    badge.className = `grok-playground__badge ${cls}`;
    badge.textContent = label;
  }

  function renderIssue(kind, title, body) {
    const cls = kind === "err" ? "grok-playground__issue grok-playground__issue--err" : "grok-playground__issue";
    return `<div class="${cls}"><strong>${escapeHtml(title)}</strong><br><span style="color:var(--grok-dim); font-size:0.76rem;">${escapeHtml(body)}</span></div>`;
  }

  function renderStats(parsed, kind) {
    const rows = [];
    if (kind === "grok-install") {
      rows.push(["spec", parsed.spec]);
      rows.push(["entrypoint", parsed.entrypoint || "—"]);
      rows.push(["env vars", (parsed.env || []).length]);
    } else if (kind === "grok-agent") {
      rows.push(["agents", parsed.agents.length]);
      rows.push([
        "tools used",
        [...new Set(parsed.agents.flatMap((a) => a.tools || []))].length,
      ]);
    } else if (kind === "grok-workflow") {
      rows.push(["steps", (parsed.workflow.steps || []).length]);
      const conds = (parsed.workflow.steps || []).filter((s) => s.when).length;
      rows.push(["conditional steps", conds]);
    } else if (kind === "grok-prompts") {
      rows.push(["prompts", Object.keys(parsed.prompts).length]);
    } else if (kind === "grok-security") {
      rows.push(["profile", parsed.safety_profile]);
      rows.push(["permissions", (parsed.permissions || []).length]);
      rows.push(["approval-gated", (parsed.requires_approval || []).length]);
    }
    if (!rows.length) return "";
    return (
      `<div style="margin-top:0.6rem;font-size:0.76rem;color:var(--grok-dim)">` +
      rows.map(([k, v]) => `<div>${escapeHtml(k)}: <strong style="color:var(--grok-text)">${escapeHtml(String(v))}</strong></div>`).join("") +
      `</div>`
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function flash(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = orig), 1400);
  }

  const SAMPLES = {
    "hello-grok": DEFAULT_YAML,
    "reply-bot": [
      "spec: grok-install/v2.12",
      "name: reply-engagement-bot",
      "description: Watches X mentions and drafts thoughtful replies behind an approval gate.",
      "entrypoint: .grok/grok-workflow.yaml",
      "model: grok-4",
      "runtime:",
      "  python: \">=3.11\"",
      "env:",
      "  - XAI_API_KEY",
      "  - X_BEARER_TOKEN",
      "schedule:",
      "  interval: 5m",
      "",
    ].join("\n"),
    "research-swarm": [
      "spec: grok-install/v2.12",
      "name: research-swarm",
      "description: Researcher + critic + publisher multi-agent swarm.",
      "entrypoint: .grok/grok-workflow.yaml",
      "model: grok-4",
      "runtime:",
      "  python: \">=3.11\"",
      "env:",
      "  - XAI_API_KEY",
      "  - TAVILY_API_KEY",
      "",
    ].join("\n"),
    "agent-file": [
      "agents:",
      "  - id: greeter",
      "    model: grok-4",
      "    prompt_ref: greeter_system",
      "    tools:",
      "      - now",
      "    max_turns: 4",
      "",
    ].join("\n"),
    "security-strict": [
      "safety_profile: strict",
      "permissions:",
      "  - tool:post_reply",
      "  - network:api.twitter.com",
      "requires_approval:",
      "  - post_reply",
      "rate_limits:",
      "  tool_calls_per_minute: 15",
      "",
    ].join("\n"),
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  if (typeof window !== "undefined" && window.document$) {
    try {
      window.document$.subscribe(() => boot());
    } catch (_) {
      /* ignore */
    }
  }
})();
