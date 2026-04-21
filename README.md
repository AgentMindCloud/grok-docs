# grok-docs

Official documentation for the `grok-install` ecosystem.

Live site: <https://agentmindcloud.github.io/grok-docs/>

## What's here

- **v2.14 (current)** — the 12 standards of `grok-install` plus the new
  additive `visuals:` block. Live preview card in the playground.
- **v2.13** — the 12-standard expansion reference (grok-config, grok-agent,
  grok-analytics, grok-deploy, grok-docs, grok-prompts, grok-security,
  grok-test, grok-tools, grok-ui, grok-update, grok-workflow).
- **v2.12 (pinned)** — the original five-file reference kept for existing
  deployments. Deep links continue to work via redirects.
- 10-minute tutorial for your first agent.
- CLI reference for every `grok-install` subcommand.
- Live client-side YAML validator (playground) — v2.12, v2.13, v2.14.
- Multi-agent orchestration guides.
- Adoption guide for xAI.

## Build locally

```bash
pip install -r requirements.txt
mkdocs serve
```

Visit <http://localhost:8000>.

## Structure

```
.
├── mkdocs.yml                    # MkDocs Material config + mike + redirects
├── requirements.txt              # Pinned Python deps
├── overrides/                    # Theme overrides
├── docs/                         # All content
│   ├── index.md                  # Landing page
│   ├── getting-started/          # Install, first agent, deploy
│   ├── v2.12/                    # Pinned v2.12 spec (5 files)
│   ├── v2.13/                    # v2.13 — 12 standards
│   ├── v2.14/                    # v2.14 — visuals block + a11y
│   ├── guides/                   # Topical deep-dives
│   ├── cli/                      # CLI reference
│   ├── gallery/                  # Gallery overview
│   ├── playground/               # Live YAML validator (Monaco + Ajv)
│   ├── ecosystem/                # xAI SDK, LiteLLM, Semantic Kernel
│   ├── for-xai/                  # Adoption guide
│   ├── assets/
│   │   └── schemas/
│   │       ├── v2.12/            # Pinned 5-file schemas
│   │       ├── latest/           # Mirror of v2.13 (12 schemas)
│   │       └── v2.14/            # grok-visuals.schema.json
│   ├── stylesheets/              # Custom CSS
│   └── javascripts/              # Terminal demo + playground
└── .github/workflows/
    ├── deploy.yml                # Build + deploy to GitHub Pages on push to main
    ├── link-check.yml            # lychee link checker on PRs
    └── sync-schemas.yml          # Nightly sync from grok-yaml-standards (v2.12, v2.13, v2.14)
```

## Version selector

`mike` is configured for multi-version docs. v2.12 URLs redirect to
their `v2.12/*` counterparts so existing deep links keep working.

## Contributing

See [Contributing](./docs/contributing.md).

## License

Apache 2.0. See [LICENSE](./LICENSE).
