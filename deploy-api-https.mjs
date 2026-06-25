/**
 * Déploie les fichiers API coach via HTTPS POST (contourne le proxy entreprise).
 * Usage : npm run deploy:api:https
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RECEIVER_URL = 'https://seme-et-tisse.fr/API/deploy_receiver.php';
const DEPLOY_TOKEN = 'jsa_deploy_2026_tigres';

const FILES = [
  'public/api_volley_coach.php',
];

async function deployFile(localPath) {
  const filename = path.basename(localPath);
  const content  = fs.readFileSync(path.join(__dirname, localPath), 'utf-8');

  const res  = await fetch(RECEIVER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token: DEPLOY_TOKEN, filename, content }),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { status: 'error', message: text }; }

  if (json.status === 'success') {
    console.log(`  ✅ ${filename}`);
  } else {
    console.error(`  ❌ ${filename} : ${json.message}`);
    throw new Error(json.message);
  }
}

console.log('\n🚀 Déploiement API Coach via HTTPS...\n');

for (const file of FILES) {
  await deployFile(file);
}

console.log('\n✅ Tous les fichiers déployés !\n');
