---
name: enlumineur
description: Write the end-to-end user guide of a web app from the running app itself - every screen step by step, with real screenshots (element to click framed and numbered, desktop and phone), a temporary demo account created then deleted, and every write request blocked so no data is touched. Scans the project (routes, menu, roles), runs scripted walkthroughs, writes one Markdown page per screen ready for the app's own documentation module or a static site. Use when asked for a user guide, user manual, end-user documentation or how-to pages with screenshots. French triggers (documentation utilisateur, guide d'utilisation, mode d'emploi avec captures d'écran, manuel utilisateur, documenter tout le logiciel, captures de chaque étape, alimenter la documentation de l'application). Local routing (for a client report or memo in Word or PDF use dossier; for a video walkthrough use atelier-video).
---

# Enlumineur : the user guide, illuminated with real screenshots

A user guide is trusted when every picture is the real screen and every sentence matches what the
screen does. This skill produces exactly that, in four passes: **inventory** (what screens exist),
**scenario** (what to show on each, written after reading the code), **illumination** (the browser
walks the app and photographs each step), **writing** (one page per screen, nothing invented).

The engine is in `scripts/`. References: `references/comparatif-outils.md` (why we built our own
engine), `references/gabarit-page.md` (page template and writing rules), `references/securite.md`
(demo account, blocked writes, what never goes in a repository), `references/module-existant.md`
(feeding an app that already has a documentation module). Examples with fictitious data in
`assets/exemple/`.

## Setup, once per machine

```bash
<skill-dir>/install.sh --deps-only     # puppeteer-core
```

Needs Node 18+ and Chrome or Chromium (`CHROME_PATH`, or the Playwright cache is found by itself).
Run the engine **on a machine that reaches the app** (often the server itself).

## Step 0: the brief

Settle, from the conversation or the project, asking only what is missing (one question at a time,
with a recommendation):

1. **The app URL** and the screens in scope (whole app, one module, one flow).
2. **The demo account recipe**: a command that creates a temporary account with the right role and
   one that deletes it (see `references/securite.md`). Never a real person's account.
3. **Where the guide goes**: the app's own documentation module if it has one (look for it first:
   a "Documentation" or "Help" menu, a `docs`/`articles` table), otherwise Markdown or a static site.
4. **Language** (French by default) and **readers** (end users, administrators).

## Step 1: inventory

```bash
node <skill-dir>/scripts/inventaire.mjs <project-dir> --prefixe /app --sortie ecrans.json
```

It lists URL paths and menu labels found in the code, each with its file and line. It is a starting
point: read the menu definition, the router and the role checks yourself, and decide the order of
the guide (follow the menu, the way a user discovers the app).

## Step 2: the scenario (read the code first)

For each screen, read its component before writing anything. `scenario.json` holds, per screen:
`id`, `titre`, `chemin`, `categorie`, `menu` (how to get there), `attendre` (a text that proves the
screen loaded), `resume` (what it is for), `acces` (who sees it: from the role checks, not guessed),
`etapes` (each with `legende` and one of `cliquer`, `surligner`, `survoler`, `saisir`, `touche`),
`champs` and `erreurs` (from validation code and error messages). Targets: `texte:Exact label`,
`regex:pattern`, `aria:Label`, `titre:Heading`, `css:selector`.

Show the result of a click only when the click does not write: switching tabs, opening a drawer, a
menu, a filter. A button that saves, sends, signs or deletes is **framed, never clicked**.

## Step 3: illuminate

```bash
node <skill-dir>/scripts/enluminer.mjs --config enlumineur.config.json --scenario scenario.json
```

It creates the demo account, logs in, blocks every POST, PUT, PATCH and DELETE except the
allowlist in the config (login, read-only RPC), walks each screen, frames and numbers each step's
element, photographs at 1440 px (and 390 px for the phone view), records what the screen shows
(headings, tabs, buttons, fields) in `releve.json`, then deletes the account even on failure. The
count of blocked writes is printed: a write you did not expect deserves a look.

## Step 4: look at every picture

**A capture you have not looked at is not documentation.** Open each image. Wrong element framed,
a spinner, an empty list, a cookie banner, a horizontal scroll at 390 px: fix the scenario (better
target, longer `pause`, a step that opens the right tab) and run again (`--ecran id` reruns one).

## Step 5: write

```bash
node <skill-dir>/scripts/rediger.mjs --scenario scenario.json --sortie doc-enlumineur
```

It writes `pages/<id>.md` (template in `references/gabarit-page.md`), `index.md` and
`manifeste.json`. Anything the scenario did not state is written **"À compléter"**: complete it from
the code, never from imagination, then rerun. Screens marked "demonstration" in the app say so.

## Step 6: deliver

- **App with a documentation module**: feed it, do not build a site next to it
  (`references/module-existant.md`: one article per screen or per module, images hosted where the
  app can serve them, published state, order and category kept).
- **No module**: deliver `index.md` + `pages/` + `captures/`, or build a static site, or a PDF with
  the `dossier` skill.
- Say how many pages, how many captures, how many "À compléter" remain, and how many writes were
  blocked.

## Pitfalls already paid for

- **A login that sends a one-time code by email**: the blocked write list shows it (`otp/send`).
  Use the app's own test bypass for a verified device, never a real mailbox.
- **Autosave and presence pings** write on every screen: they are blocked and counted, the screen
  still renders.
- **The smallest matching element wins**: `texte:` picks the button, not the card that contains its
  label. Use `css:` when two identical labels exist.
- **Captures of real people's data stay private**: publish them only inside the app or on a private
  share, never in a public repository.
