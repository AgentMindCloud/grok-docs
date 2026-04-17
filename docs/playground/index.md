---
title: Playground
description: Live, client-side YAML validator. Paste any grok-*.yaml file for instant feedback.
hide:
  - toc
---

# Playground

Paste any `grok-*.yaml` file. The validator auto-detects the file type,
runs it against the official JSON schema, and reports line-scoped errors
— all in the browser. No network round-trip.

<div id="grok-playground" class="grok-playground" markdown="0">
  <div class="grok-playground__editor">
    <div class="grok-playground__header">
      <span>YAML</span>
      <select data-grok-samples aria-label="Load a sample" style="background:transparent;color:inherit;border:1px solid var(--grok-border);border-radius:4px;padding:0.2rem 0.4rem;font-size:0.72rem;">
        <option value="">— load sample —</option>
        <option value="hello-grok">hello-grok (minimal install)</option>
        <option value="reply-bot">reply-engagement-bot</option>
        <option value="research-swarm">research-swarm</option>
        <option value="agent-file">grok-agent.yaml</option>
        <option value="security-strict">grok-security.yaml (strict)</option>
      </select>
    </div>
    <div class="grok-playground__editor-host" data-grok-editor style="min-height:26rem;"></div>
    <div class="grok-playground__actions">
      <button type="button" class="grok-playground__btn" data-grok-copy>Copy install command</button>
      <button type="button" class="grok-playground__btn" data-grok-download>Download YAML</button>
    </div>
  </div>
  <div class="grok-playground__panel">
    <div class="grok-playground__header">
      <span>Validation</span>
      <span class="grok-playground__badge grok-playground__badge--warn" data-grok-badge>Booting…</span>
    </div>
    <div class="grok-playground__output" data-grok-output></div>
  </div>
</div>

<script src="../javascripts/playground.js" defer></script>

## How it works

1. YAML is parsed with [`js-yaml`](https://github.com/nodeca/js-yaml).
2. The validator infers which spec file you're working on from the
   top-level keys: `spec:` → install, `agents:` → agent, `workflow:` →
   workflow, `prompts:` → prompts, `safety_profile:` → security.
3. It loads the matching JSON schema from `assets/schemas/latest/` and
   validates with [`Ajv`](https://ajv.js.org/) (`draft/2020-12`).
4. Errors are reported by JSON pointer with the offending keyword
   parameters.

Everything runs in the browser — your YAML never leaves the page.

## Schemas

- [`grok-install.schema.json`](../assets/schemas/latest/grok-install.schema.json)
- [`grok-agent.schema.json`](../assets/schemas/latest/grok-agent.schema.json)
- [`grok-workflow.schema.json`](../assets/schemas/latest/grok-workflow.schema.json)
- [`grok-security.schema.json`](../assets/schemas/latest/grok-security.schema.json)
- [`grok-prompts.schema.json`](../assets/schemas/latest/grok-prompts.schema.json)

Schemas are synced nightly from
[`agentmindcloud/grok-yaml-standards`](https://github.com/agentmindcloud/grok-yaml-standards)
via the `sync-schemas.yml` workflow. Versioned copies live under
`assets/schemas/v<VERSION>/`.
