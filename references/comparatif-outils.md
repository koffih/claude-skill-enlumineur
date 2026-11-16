# Existing tools, checked on 2026-11-16

Each tool was looked up on GitHub (existence, licence, last push) and read (README, code). The one
that installs was run.

| Tool | Licence, activity | What it really does | Why not the engine |
|---|---|---|---|
| BinarCode/aidocs-cli | MIT, 31 stars, pushed 2026-03 | Installs `/docs:*` slash commands for Claude Code; the agent drives a browser through Playwright MCP, takes screenshots and writes pages. RAG part needs `OPENAI_API_KEY`. | Its explore mode clicks buttons and **submits forms** on the target app: on production it writes real data. No temporary account, no write blocking, non-deterministic runs. Good ideas kept: page template, highlight of the clicked element. |
| guymoyal/wikipilot | MIT, 2 stars, pushed 2026-10 | Builds a static wiki from the repository; optional AI pass; screenshots of allowed URLs. | Screenshots cannot log in or click: no walkthrough of an app behind a login. Fine for developer wikis. |
| Mostafijemon24/Nex | GPL-3.0, 0 stars, pushed 2026-11 | Self-hosted platform (Next.js, FastAPI, PostgreSQL, Redis, Celery, Playwright) that analyses sites and repos, makes docs, screenshots, MP4 walkthroughs. | Heavy stack to host for one guide, GPL, very young. |
| MuhammedAlii/user-guide-generator | no licence, 0 stars | Puppeteer crawler with optional login, NVIDIA vision API for descriptions, HTML/PDF/DOCX export. | No licence (cannot be reused), paid vision key, crawl not scripted, no write blocking. |
| earosenfeld/ai-doc-generator | no licence, 0 stars | Scans a codebase and writes Markdown developer docs with the Claude API. | No screenshots, developer docs only. |
| ci-psy/DocGen | not found (404) | | |
| simonw/shot-scraper | Apache-2.0, 2.6k stars | Reliable CLI for scripted screenshots (Playwright). | Screenshots only: no login recipe, no annotation, no page writing. A good fallback for single pages. |

Conclusion: no tool walks a logged-in production app **read-only** with a temporary account. The
engine here is small (puppeteer-core) and does exactly that; the writing is done by the agent from
the code, the template and the record of what each screen showed.
