#!/usr/bin/env node
// Inventaire des écrans d'un projet web : chemins d'URL et libellés de menu trouvés dans le code.
// Point de départ du scénario, jamais le scénario lui-même : l'agent relit chaque écran dans le code.
//
//   node scripts/inventaire.mjs <dossier du projet> [--prefixe /app] [--sortie ecrans.json]
//
// Reconnaît : chaînes de chemin ('/app/...', path: '/x', path="/x"), routes Next.js (app/ et pages/),
// entrées de menu (objets avec id et libelle/label/title). Chaque trouvaille garde son fichier et sa ligne.
import fs from 'node:fs';
import path from 'node:path';

const a = process.argv.slice(2);
if (!a[0] || a[0].startsWith('--')) { console.error('usage : inventaire.mjs <projet> [--prefixe /app] [--sortie ecrans.json]'); process.exit(2); }
const racine = path.resolve(a[0]);
const opt = (k, d) => { const i = a.indexOf(`--${k}`); return i >= 0 ? a[i + 1] : d; };
const prefixe = opt('prefixe', '');
const sortie = opt('sortie', null);

const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor', '__pycache__', '.venv', 'out', 'backups', 'backup', '_archive', 'archive']);
const EXT = /\.(tsx?|jsx?|vue|svelte|php|py|rb|html)$/;
const fichiers = [];
(function marcher(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (IGNORE.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) marcher(p); else if (EXT.test(e.name) && !/\.(test|spec|node-test)\./.test(e.name)) fichiers.push(p);
  }
})(racine);

const chemins = new Map();   // chemin -> { chemin, sources[] , libelles[] }
const menu = [];             // { id, libelle, source }
const ajouter = (c, src, libelle) => {
  if (!c.startsWith('/') || c.length > 120 || /[\s${}*]|\.(png|svg|js|css|json|ico)$/.test(c) || c.startsWith('//')) return;
  if (prefixe && !c.startsWith(prefixe)) return;
  const x = chemins.get(c) || { chemin: c, sources: [], libelles: [] };
  if (x.sources.length < 3) x.sources.push(src);
  if (libelle && !x.libelles.includes(libelle)) x.libelles.push(libelle);
  chemins.set(c, x);
};

for (const f of fichiers) {
  const rel = path.relative(racine, f);
  const lignes = fs.readFileSync(f, 'utf8').split('\n');
  lignes.forEach((l, i) => {
    const src = `${rel}:${i + 1}`;
    // 'id': '/app/x' (table de chemins) ou path: '/x' ou path="/x" ou to="/x" ou href="/x"
    for (const m of l.matchAll(/(?:path|to|href|route)\s*[:=]\s*\{?\s*['"`](\/[^'"`]*)['"`]/g)) ajouter(m[1], src);
    for (const m of l.matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"`](\/[a-z][\w\-/]*)['"`]/g)) ajouter(m[2], src, m[1]);
    // entrée de menu : { id: 'x', libelle: 'Y' } ou label/title
    const mm = l.match(/id:\s*['"]([\w-]+)['"].*?(?:libelle|label|title|titre):\s*["'`]([^"'`]+)["'`]/);
    if (mm) menu.push({ id: mm[1], libelle: mm[2], source: src });
  });
}

// Next.js : app/**/page.tsx et pages/**.tsx
for (const f of fichiers) {
  const rel = path.relative(racine, f).split(path.sep).join('/');
  let m = rel.match(/(?:^|\/)app\/(.*)\/page\.(tsx|jsx|ts|js)$/);
  if (m) ajouter('/' + m[1].replace(/\([^)]*\)\/?/g, ''), rel);
  m = rel.match(/(?:^|\/)pages\/(.*)\.(tsx|jsx)$/);
  if (m && !m[1].startsWith('_') && !m[1].startsWith('api/')) ajouter('/' + m[1].replace(/\/?index$/, ''), rel);
}

// Rattacher les libellés du menu aux chemins par identifiant
const parId = new Map(menu.map((x) => [x.id, x.libelle]));
const ecrans = [...chemins.values()].map((x) => ({
  ...x,
  libelle: x.libelles.map((id) => parId.get(id)).find(Boolean) || null,
})).sort((a, b) => a.chemin.localeCompare(b.chemin));

const res = { projet: path.basename(racine), genere_le: new Date().toISOString(), fichiers_lus: fichiers.length, ecrans, menu };
if (sortie) fs.writeFileSync(sortie, JSON.stringify(res, null, 2));
console.log(`${fichiers.length} fichiers lus, ${ecrans.length} chemins, ${menu.length} entrées de menu${sortie ? ` -> ${sortie}` : ''}`);
if (!sortie) for (const e of ecrans.slice(0, 80)) console.log(`${e.chemin}\t${e.libelle || ''}\t${e.sources[0]}`);
