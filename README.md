# enlumineur

A Claude Code skill that writes the **end-to-end user guide of a web application from the running
application itself**: every screen, step by step, with real screenshots where the element to click
is framed and numbered, on desktop (1440 px) and phone (390 px).

An *enlumineur* is the medieval artist who illuminated manuscripts: this skill illuminates your
documentation with pictures of the real screens.

## What it does

1. **Inventory**: scans the project (router paths, menu definitions, Next.js `app/` and `pages/`)
   and lists every screen with the file and line it was found in.
2. **Scenario**: the agent reads each screen's code and writes what to show, step by step, who can
   use it, its fields, rules and error messages. Nothing is guessed.
3. **Illumination**: a headless Chrome logs in with a **temporary demo account** (created by your
   command, deleted afterwards even on failure), walks each screen, frames and numbers the element
   of each step and takes the screenshots. **Every POST, PUT, PATCH and DELETE is blocked in the
   browser** except an allowlist (login, read-only calls): documenting production writes nothing.
4. **Writing**: one Markdown page per screen (purpose, access, numbered steps with captures, fields
   and rules, common problems, phone view), an index and a manifest, French by default, English on
   request. Anything not proven is written "À compléter".
5. **Delivery**: feeds the application's own documentation module when it has one, otherwise a
   folder of Markdown pages or a static site.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/koffih/claude-skill-enlumineur/main/install.sh | bash
```

Needs Node 18+ and Chrome or Chromium (`CHROME_PATH`, or the Playwright browser cache). Run it on a
machine that can reach the application, often the server itself. Then in Claude Code: ask for a
user guide, or `/enlumineur`.

## Files

- `SKILL.md`: the method the agent follows.
- `scripts/inventaire.mjs`, `scripts/enluminer.mjs`, `scripts/rediger.mjs`: the engine.
- `references/`: comparison with existing tools, page template, safety rules, feeding an existing
  documentation module.
- `assets/exemple/`: a config, a scenario and a demo-account script with fictitious data.

## Why not an existing tool

See `references/comparatif-outils.md`. In short: the tools that click through an app also submit its
forms, and none of them documents a logged-in production app read-only with a throwaway account.

## Licence

MIT.
