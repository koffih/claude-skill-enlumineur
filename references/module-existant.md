# Feeding an app that already has a documentation module

Look first. Signs: a "Documentation", "Help" or "Guide" entry in the menu, a table such as
`documentation_articles`, `docs`, `help_articles`, a Markdown renderer (react-markdown, marked) in
the documentation view, an admin screen to manage articles.

Then:

1. **Read the model**: columns (title, category, content, order, published), the content format
   (Markdown, HTML), who may write (database rules, role checks), how images are displayed.
2. **Map the guide to it**: one article per screen, or one per module with screens as sections when
   the module list is short. Keep the app's existing categories and add new ones only when no
   existing one fits. Existing articles are updated in place, never duplicated: match on title.
3. **Host the images where the app serves them**: the app's public folder (versioned with the code)
   or its storage bucket, under a path such as `/doc/<module>/<file>.png`, then rewrite the image
   links of each page to that path (`rediger.mjs --images /doc/recrutement`).
4. **Write through the app's own rules**: the admin screen, an API, or a SQL import run as a role
   that has the right to write; keep `created_by`/`updated_by` meaningful.
5. **Publish in two steps**: import unpublished, check a few articles in the app, then publish.
6. **Keep it in sync**: rerun the engine after each release of a screen; `manifeste.json` lists
   which images belong to which page.
