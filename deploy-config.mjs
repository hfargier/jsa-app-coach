/**
 * Déploie config.php via HTTPS POST (contourne les proxies d'entreprise qui bloquent FTP).
 * Le fichier deploy_receiver.php sur le serveur reçoit et écrit le fichier.
 *
 * Usage : npm run deploy:config
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RECEIVER_URL  = 'https://seme-et-tisse.fr/API/deploy_receiver.php';
const DEPLOY_TOKEN  = 'jsa_deploy_2026_tigres';
const SRC_CONFIG    = path.join(__dirname, 'public', 'config.php');

// Copie locale dans le projet joueur
const JOUEUR_PUBLIC = path.join(__dirname, '..', '..', 'jsa_app_joueur', 'jsa_app_joueur', 'public');
const DST_CONFIG    = path.join(JOUEUR_PUBLIC, 'config.php');

// ── 1. Copie locale ──────────────────────────────────────────
fs.copyFileSync(SRC_CONFIG, DST_CONFIG);
console.log('📋 config.php copié → jsa_app_joueur/public/');

// ── 2. Upload via HTTPS ──────────────────────────────────────
const content = fs.readFileSync(SRC_CONFIG, 'utf-8');

console.log('🚀 Déploiement config.php → HTTPS /API/ ...');

try {
  const res = await fetch(RECEIVER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token: DEPLOY_TOKEN, filename: 'config.php', content }),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { status: 'error', message: text }; }

  if (json.status === 'success') {
    console.log('✅ config.php déployé via HTTPS !');
    console.log('   Les deux APIs utilisent maintenant la même clé OneSignal.');
  } else {
    console.error('❌ Erreur serveur :', json.message);
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Erreur réseau :', err.message);
  process.exit(1);
}
