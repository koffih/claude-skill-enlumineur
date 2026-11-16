#!/usr/bin/env node
// Enlumineur : parcourt une application web en marche, écran par écran, avec un compte de démonstration
// temporaire, et prend de vraies captures de chaque étape, élément à cliquer encadré et numéroté.
// Toute requête d'écriture est bloquée (sauf la liste blanche de la config) : la documentation ne laisse
// aucune trace dans les données.
//
//   node scripts/enluminer.mjs --config enlumineur.config.json --scenario scenario.json [--ecran id] [--sortie dir]
//
// Sortie : <sortie>/captures/*.png et <sortie>/releve.json (ce que chaque écran affiche, pour la rédaction).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ICI = path.dirname(new URL(import.meta.url).pathname);

function args() {
  const a = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; o[k] = v; }
  }
  return o;
}

function puppeteer() {
  const essais = [process.env.PUPPETEER_CORE, path.join(ICI, '..', 'node_modules', 'puppeteer-core'), 'puppeteer-core'].filter(Boolean);
  for (const m of essais) { try { return require(m); } catch { /* suivant */ } }
  throw new Error('puppeteer-core introuvable : lancez install.sh --deps-only dans le dossier du skill, ou PUPPETEER_CORE=<chemin>');
}

function chrome(cfg) {
  const cands = [cfg.chrome, process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];
  const pw = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pw)) for (const d of fs.readdirSync(pw).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    cands.push(path.join(pw, d, 'chrome-linux64', 'chrome'), path.join(pw, d, 'chrome-linux', 'chrome'));
  }
  const c = cands.find((x) => x && fs.existsSync(x));
  if (!c) throw new Error('Chrome ou Chromium introuvable : réglez "chrome" dans la config ou CHROME_PATH');
  return c;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lire = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

/** Cible : "texte:Libellé", "regex:motif", "aria:Libellé", "css:sélecteur", "titre:Texte d'un titre". Rend un handle ou null. */
async function trouver(page, cible) {
  if (!cible) return null;
  const [type, ...reste] = cible.split(':');
  const val = reste.join(':');
  if (type === 'css') return page.$(val);
  return page.evaluateHandle((type, val) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const visible = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
    const tous = [...document.querySelectorAll(type === 'titre' ? 'h1,h2,h3,h4' : 'a,button,[role=button],[role=tab],[role=menuitem],summary,label,input,select,textarea,[data-titre-groupe],li,td,th,span,div')].filter(visible);
    if (type === 'regex') { const re = new RegExp(val, 'i'); const t = tous.filter((e) => re.test(norm(e.innerText)) && norm(e.innerText).length < 80); t.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length); return t[0] || null; }
    if (type === 'aria') return tous.find((e) => norm(e.getAttribute('aria-label')) === val || norm(e.getAttribute('title')) === val) || null;
    const exacts = tous.filter((e) => norm(e.innerText) === val);
    // Le plus petit élément dont le texte est exactement la cible (le bouton plutôt que sa carte).
    const pool = exacts.length ? exacts : tous.filter((e) => norm(e.innerText).startsWith(val) && norm(e.innerText).length < val.length + 40);
    pool.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length || a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
    return pool[0] || null;
  }, type, val).then((h) => h.asElement() || null);
}

/** Encadre l'élément et pose son numéro d'étape (calque retiré après la capture). */
async function annoter(page, handle, numero, couleur) {
  if (!handle) return;
  await handle.evaluate((el, n, c) => {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    const cadre = document.createElement('div');
    cadre.setAttribute('data-enlumineur', '1');
    Object.assign(cadre.style, { position: 'fixed', left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px`, border: `3px solid ${c}`, borderRadius: '8px', zIndex: 2147483646, pointerEvents: 'none', boxShadow: '0 0 0 4px rgba(255,255,255,.6)' });
    const pastille = document.createElement('div');
    pastille.setAttribute('data-enlumineur', '1');
    pastille.textContent = String(n);
    Object.assign(pastille.style, { position: 'fixed', left: `${Math.max(4, r.left - 20)}px`, top: `${Math.max(4, r.top - 20)}px`, width: '28px', height: '28px', borderRadius: '14px', background: c, color: '#fff', font: '700 15px/28px system-ui,sans-serif', textAlign: 'center', zIndex: 2147483647, pointerEvents: 'none' });
    document.body.append(cadre, pastille);
  }, numero, couleur);
}
const effacerAnnotations = (page) => page.evaluate(() => document.querySelectorAll('[data-enlumineur]').forEach((e) => e.remove()));

/** Ce que l'écran affiche : titres, boutons, onglets, champs. Matière de la rédaction, jamais inventée. */
const releverEcran = (page) => page.evaluate(() => {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const zone = document.querySelector('main') || document.body;
  const uniq = (xs) => [...new Set(xs.map(norm).filter((x) => x && x.length < 90))];
  const champs = [...zone.querySelectorAll('input,select,textarea')].map((e) => {
    const id = e.id && zone.querySelector(`label[for="${CSS.escape(e.id)}"]`);
    return norm((id && id.innerText) || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.name || '');
  });
  return {
    titre: norm(zone.querySelector('h1')?.innerText || document.title),
    titres: uniq([...zone.querySelectorAll('h1,h2,h3')].map((e) => e.innerText)),
    boutons: uniq([...zone.querySelectorAll('button,[role=button],a.button')].map((e) => e.innerText || e.getAttribute('aria-label'))),
    onglets: uniq([...zone.querySelectorAll('[role=tab]')].map((e) => e.innerText)),
    champs: uniq(champs),
    demonstration: /démonstration|demonstration|demo data/i.test(zone.innerText),
  };
});

async function main() {
  const a = args();
  if (!a.config || !a.scenario) { console.error('usage : enluminer.mjs --config <config.json> --scenario <scenario.json> [--ecran id] [--sortie dir]'); process.exit(2); }
  const cfg = lire(a.config);
  const scen = lire(a.scenario);
  const cfgDir = path.dirname(path.resolve(a.config));
  const sortie = path.resolve(a.sortie || cfg.sortie || 'doc-enlumineur');
  const largeurs = cfg.largeurs || [1440, 390];
  const couleur = cfg.couleur || '#B84B19';
  const bloquer = cfg.ecritures?.bloquer !== false;
  if (!bloquer && !a['autoriser-ecritures']) { console.error('refus : ecritures.bloquer est faux ; ajoutez --autoriser-ecritures seulement sur une copie de test'); process.exit(2); }
  const autorises = (cfg.ecritures?.autoriser || []).map((x) => new RegExp(x));
  fs.mkdirSync(path.join(sortie, 'captures'), { recursive: true });

  const ecrans = (scen.ecrans || []).filter((e) => !a.ecran || e.id === a.ecran);
  if (!ecrans.length) { console.error('aucun écran à parcourir'); process.exit(2); }

  // Compte de démonstration : créé avant, supprimé après, quoi qu'il arrive.
  const compte = cfg.compte || {};
  if (compte.creer) console.log(sh(compte.creer, cfgDir));
  const motDePasse = compte.motDePasseFichier ? fs.readFileSync(path.resolve(cfgDir, compte.motDePasseFichier), 'utf8').trim() : process.env.ENLUMINEUR_MOT_DE_PASSE || '';

  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'enlumineur-'));
  const pp = puppeteer();
  const nav = await pp.launch({ executablePath: chrome(cfg), headless: 'new', args: ['--no-sandbox', `--user-data-dir=${profil}`, '--lang=' + (scen.langue || cfg.langue || 'fr')] });
  const bloquees = [];
  const releve = { genere_le: new Date().toISOString(), base: cfg.base, ecrans: [], ecritures_bloquees: 0 };
  let echec = 0;
  try {
    const page = await nav.newPage();
    await page.setViewport({ width: largeurs[0], height: cfg.hauteur || 1000 });
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    if (bloquer) {
      await page.setRequestInterception(true);
      page.on('request', (r) => {
        const m = r.method();
        if (['GET', 'HEAD', 'OPTIONS'].includes(m) || autorises.some((x) => x.test(r.url()))) return r.continue();
        bloquees.push(`${m} ${r.url().split('?')[0]}`);
        return r.respond({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'bloqué par enlumineur (lecture seule)' }) });
      });
    }

    // Connexion
    const cx = cfg.connexion || {};
    await page.goto(cfg.base + (cx.chemin || '/'), { waitUntil: 'networkidle2', timeout: 60000 });
    for (const pas of cx.avant || []) { const h = await trouver(page, pas.cliquer); if (h) { await h.click(); await sleep(800); } }
    if (cx.champIdentifiant) {
      await page.waitForSelector(cx.champIdentifiant, { timeout: 15000 });
      await page.type(cx.champIdentifiant, compte.identifiant || '');
      await page.type(cx.champMotDePasse, motDePasse);
      await page.keyboard.press('Enter');
      await sleep(cx.attente || 4000);
    }
    for (const js of cx.apres || []) await page.evaluate(js);
    if (cx.verifier) {
      const okc = await page.evaluate(cx.verifier);
      if (!okc) throw new Error('connexion non vérifiée (connexion.verifier a rendu faux)');
    }

    for (const e of ecrans) {
      const r = { id: e.id, titre: e.titre, chemin: e.chemin, etapes: [], captures: {} };
      try {
        await page.setViewport({ width: largeurs[0], height: cfg.hauteur || 1000 });
        await page.goto(cfg.base + e.chemin, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(e.pause ?? cfg.pause ?? 2500);
        if (e.attendre) { const h = await trouver(page, e.attendre); if (!h) throw new Error(`repère absent : ${e.attendre}`); }
        for (const js of cfg.avantCapture || []) await page.evaluate(js);
        Object.assign(r, { vu: await releverEcran(page) });
        const vue = `${e.id}-vue-${largeurs[0]}.png`;
        await page.screenshot({ path: path.join(sortie, 'captures', vue) });
        r.captures.vue = vue;
        let n = 0;
        for (const pas of e.etapes || []) {
          n++;
          const cible = pas.surligner || pas.cliquer || pas.survoler || pas.saisir?.cible;
          const h = cible ? await trouver(page, cible) : null;
          if (cible && !h) { r.etapes.push({ n, legende: pas.legende, erreur: `cible introuvable : ${cible}` }); console.log(`  ! ${e.id} étape ${n} : cible introuvable ${cible}`); echec = 1; continue; }
          await annoter(page, h, n, couleur);
          const f = `${e.id}-etape-${n}-${largeurs[0]}.png`;
          await page.screenshot({ path: path.join(sortie, 'captures', f) });
          await effacerAnnotations(page);
          r.etapes.push({ n, legende: pas.legende, capture: f, cible });
          // L'action vient après la capture : la capture montre où cliquer, l'étape suivante montre le résultat.
          if (pas.cliquer && h) { await h.click(); await sleep(pas.pause ?? 1200); }
          if (pas.survoler && h) { await h.hover(); await sleep(600); }
          if (pas.saisir && h) { await h.click({ clickCount: 3 }); await h.type(pas.saisir.texte || ''); await sleep(500); }
          if (pas.touche) { await page.keyboard.press(pas.touche); await sleep(600); }
        }
        if (e.resultat !== false && (e.etapes || []).some((p) => p.cliquer || p.saisir)) {
          const f = `${e.id}-resultat-${largeurs[0]}.png`;
          await page.screenshot({ path: path.join(sortie, 'captures', f) });
          r.captures.resultat = f;
        }
        for (const w of largeurs.slice(1)) {
          await page.setViewport({ width: w, height: Math.round(w * 2.1) });
          await page.goto(cfg.base + e.chemin, { waitUntil: 'networkidle2', timeout: 60000 });
          await sleep(e.pause ?? cfg.pause ?? 2500);
          const f = `${e.id}-vue-${w}.png`;
          await page.screenshot({ path: path.join(sortie, 'captures', f) });
          r.captures[`vue${w}`] = f;
          const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          if (deborde) r.deborde = w;
        }
        console.log(`  ok ${e.id} : ${r.etapes.length} étape(s)`);
      } catch (err) {
        r.erreur = String(err.message || err).slice(0, 300);
        console.log(`  ! ${e.id} : ${r.erreur}`);
        echec = 1;
      }
      releve.ecrans.push(r);
    }
  } finally {
    releve.ecritures_bloquees = bloquees.length;
    releve.exemples_bloques = [...new Set(bloquees)].slice(0, 20);
    fs.writeFileSync(path.join(sortie, 'releve.json'), JSON.stringify(releve, null, 2));
    try { await nav.close(); } catch { /* déjà fermé */ }
    fs.rmSync(profil, { recursive: true, force: true });
    if (compte.supprimer) { try { console.log(sh(compte.supprimer, cfgDir)); } catch { console.error('ÉCHEC de la suppression du compte de démonstration : à supprimer à la main'); echec = 1; } }
  }
  console.log(`relevé : ${path.join(sortie, 'releve.json')} ; écritures bloquées : ${bloquees.length}`);
  process.exit(echec);
}

main().catch((e) => { console.error(e); process.exit(1); });
