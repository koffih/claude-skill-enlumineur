#!/usr/bin/env node
// Rédaction : une page Markdown par écran à partir du scénario (textes écrits par l'agent après lecture du
// code) et du relevé (ce que l'écran affichait vraiment). Ce qui manque est écrit « À compléter », jamais
// inventé. Produit aussi index.md et manifeste.json (pour alimenter un module de documentation existant).
//
//   node scripts/rediger.mjs --scenario scenario.json --sortie doc-enlumineur [--images <url ou chemin relatif>]
import fs from 'node:fs';
import path from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(`--${k}`); return i >= 0 ? a[i + 1] : d; };
const scenFichier = opt('scenario');
const sortie = path.resolve(opt('sortie', 'doc-enlumineur'));
if (!scenFichier) { console.error('usage : rediger.mjs --scenario scenario.json --sortie dir [--images ../captures]'); process.exit(2); }
const scen = JSON.parse(fs.readFileSync(scenFichier, 'utf8'));
const releve = JSON.parse(fs.readFileSync(path.join(sortie, 'releve.json'), 'utf8'));
const images = opt('images', '../captures');
const en = (scen.langue || 'fr').startsWith('en');
const T = en
  ? { role: 'What it is for', acces: 'Who can use it', etapes: 'Step by step', champs: 'Fields and rules', erreurs: 'Common problems', mobile: 'On a phone', voir: 'See also', todo: 'To be completed', demo: 'Part of this screen shows demonstration data: it is marked as such in the application.', menu: 'Open it from the menu', resultat: 'Result', etape: 'Step' }
  : { role: 'À quoi sert cet écran', acces: 'Qui y a accès', etapes: 'Pas à pas', champs: 'Champs et règles', erreurs: 'Erreurs fréquentes', mobile: 'Sur téléphone', voir: 'Voir aussi', todo: 'À compléter', demo: 'Une partie de cet écran affiche des données de démonstration : elles y sont signalées comme telles.', menu: 'Pour y aller depuis le menu', resultat: 'Résultat', etape: 'Étape' };

const img = (f, alt) => `![${alt.replace(/[[\]]/g, '')}](${images.replace(/\/$/, '')}/${f})`;
const liste = (xs) => (xs && xs.length ? xs.map((x) => `- ${x}`).join('\n') : `- ${T.todo}`);
fs.mkdirSync(path.join(sortie, 'pages'), { recursive: true });

const manifeste = [];
const ordre = [];
for (const e of scen.ecrans) {
  const r = releve.ecrans.find((x) => x.id === e.id);
  if (!r || r.erreur) { console.log(`  saut ${e.id} : ${r ? r.erreur : 'absent du relevé'}`); continue; }
  const vu = r.vu || {};
  // Le titre (H1 et texte alternatif) vient du scénario, c'est-à-dire du libellé du menu ou du registre des écrans :
  // jamais du texte affiché au moment de la capture (salutation, compteur du jour, nom d'un dossier).
  const titre = (e.titre || '').trim() || e.id;
  if (!e.titre) console.log(`  attention ${e.id} : pas de titre dans le scénario, l'identifiant est utilisé (donnez le libellé du menu)`);
  const p = [];
  p.push(`# ${titre}`, '');
  if (e.menu) p.push(`*${T.menu} : ${e.menu}*`, '');
  p.push(img(r.captures.vue, titre), '');
  p.push(`## ${T.role}`, '', e.resume || T.todo, '');
  p.push(`## ${T.acces}`, '', e.acces || T.todo, '');
  if (vu.demonstration) p.push(`> ${T.demo}`, '');
  if (r.etapes.length) {
    p.push(`## ${T.etapes}`, '');
    for (const s of r.etapes) {
      if (s.erreur) continue;
      p.push(`${s.n}. ${s.legende}`, '', `   ${img(s.capture, `${T.etape} ${s.n}`)}`, '');
    }
    if (r.captures.resultat) p.push(`**${T.resultat}**`, '', img(r.captures.resultat, T.resultat), '');
  }
  p.push(`## ${T.champs}`, '');
  p.push(e.champs ? liste(e.champs) : liste([...(vu.onglets || []).map((o) => (en ? `Tab « ${o} »` : `Onglet « ${o} »`)), ...(vu.champs || []).map((c) => (en ? `Field « ${c} »` : `Champ « ${c} »`))]), '');
  p.push(`## ${T.erreurs}`, '', liste(e.erreurs), '');
  const mob = Object.entries(r.captures).find(([k]) => k.startsWith('vue') && k !== 'vue');
  if (mob) p.push(`## ${T.mobile}`, '', e.mobile || '', img(mob[1], T.mobile), '');
  if (e.voir?.length) p.push(`## ${T.voir}`, '', e.voir.map((v) => `- [${v.titre}](${v.id}.md)`).join('\n'), '');
  const md = p.join('\n').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path.join(sortie, 'pages', `${e.id}.md`), md);
  const aCompleter = (md.match(new RegExp(T.todo, 'g')) || []).length;
  manifeste.push({ id: e.id, titre, categorie: e.categorie || null, ordre: e.ordre ?? manifeste.length, fichier: `pages/${e.id}.md`, images: [r.captures.vue, ...r.etapes.map((s) => s.capture).filter(Boolean), r.captures.resultat, mob?.[1]].filter(Boolean), a_completer: aCompleter });
  ordre.push(e);
  console.log(`  page ${e.id}${aCompleter ? ` (${aCompleter} « ${T.todo} »)` : ''}`);
}

const cats = [...new Set(ordre.map((e) => e.categorie || (en ? 'Other' : 'Autres')))];
const idx = [`# ${scen.titre || (en ? 'User guide' : "Guide d'utilisation")}`, '', scen.introduction || '', ''];
for (const c of cats) {
  idx.push(`## ${c}`, '');
  for (const e of ordre.filter((x) => (x.categorie || (en ? 'Other' : 'Autres')) === c)) idx.push(`- [${e.titre}](pages/${e.id}.md)${e.resume ? ` : ${e.resume.split('.')[0]}.` : ''}`);
  idx.push('');
}
fs.writeFileSync(path.join(sortie, 'index.md'), idx.join('\n'));
fs.writeFileSync(path.join(sortie, 'manifeste.json'), JSON.stringify({ genere_le: new Date().toISOString(), pages: manifeste }, null, 2));
console.log(`${manifeste.length} page(s) dans ${path.join(sortie, 'pages')}, index.md et manifeste.json écrits`);
