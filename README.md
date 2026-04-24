# grok-docs

Official documentation for the `grok-install` ecosystem.

Live site: <https://agentmindcloud.github.io/grok-docs/>

## What's here

- Full YAML spec reference for v2.12 (five file types).
- 10-minute tutorial for your first agent.
- CLI reference for every `grok-install` subcommand.
- Live client-side YAML validator (playground).
- Multi-agent orchestration guides.
- Template gallery (single-agent, multi-step, swarm).
- Ecosystem notes (xAI SDK, LiteLLM, Semantic Kernel).
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
├── mkdocs.yml                    # MkDocs Material config
├── requirements.txt              # Pinned Python deps
├── overrides/                    # Theme overrides
├── docs/                         # All content
│   ├── index.md                  # Landing page
│   ├── getting-started/          # Install, first agent, deploy
│   ├── spec/                     # Five YAML file references
│   ├── guides/                   # Topical deep-dives
│   ├── cli/                      # CLI reference
│   ├── gallery/                  # Template gallery (single-agent, multi-step, swarm)
│   ├── playground/               # Live YAML validator (Monaco + Ajv)
│   ├── ecosystem/                # xAI SDK, LiteLLM, Semantic Kernel
│   ├── for-xai/                  # Adoption guide
│   ├── assets/                   # Logo, favicon, schemas
│   ├── stylesheets/              # Custom CSS
│   └── javascripts/              # Terminal demo + playground
└── .github/workflows/
    ├── deploy.yml                # Build + deploy to GitHub Pages on push to main
    ├── link-check.yml            # lychee link checker on PRs
    └── sync-schemas.yml          # Nightly sync from grok-yaml-standards
```

## Contributing

See [Contributing](./docs/contributing.md).

## License

Apache 2.0. See [LICENSE](./LICENSE).
