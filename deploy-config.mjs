/**
 * Déploie config.php (clés OneSignal) vers /API/ sur le serveur FTP.
 * Les deux APIs (coach + joueur) font require_once 'config.php',
 * donc un seul déploiement suffit pour mettre à jour les clés partout.
 *
 * Source : ./public/config.php
 * Destination : /API/config.php
 *
 * Usage : npm run deploy:config
 */

import FtpDeploy from 'ftp-deploy';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FTP = {
  user:      'seme-2289142',
  password:  'FTPChoune@69',
  host:      'ftp.seme-et-tisse.fr',
  port:      21,
  forcePasv: true,
};

// Copie temporaire de config.php dans le dossier joueur avant upload
const srcConfig   = path.join(__dirname, 'public', 'config.php');
const joueurPublic = path.join(__dirname, '..', '..', 'jsa_app_joueur', 'jsa_app_joueur', 'public');
const dstConfig   = path.join(joueurPublic, 'config.php');

// Synchroniser config.php dans le projet joueur
fs.copyFileSync(srcConfig, dstConfig);
console.log('📋 config.php copié → jsa_app_joueur/public/');

const ftpDeploy = new FtpDeploy();

const config = {
  ...FTP,
  localRoot:    path.join(__dirname, 'public'),
  remoteRoot:   '/API/',
  include:      ['config.php'],
  deleteRemote: false,
};

console.log('🚀 Déploiement config.php → /API/ ...');

ftpDeploy
  .deploy(config)
  .then(() => {
    console.log('✅ config.php déployé ! Les deux APIs utilisent maintenant la même clé.');
    // Nettoyage : supprimer la copie temporaire si on veut rester propre
    // fs.unlinkSync(dstConfig);
  })
  .catch(err => {
    console.error('❌ Erreur FTP :', err);
    process.exit(1);
  });
