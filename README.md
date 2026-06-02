npm run build

2. Organisation des fichiers sur le serveur
   Pour que tout fonctionne (PWA, API, et Interface), voici la structure recommandée sur ton FTP (dans le dossier www ou public_html) :

index.html, assets/, etc. : Copie ici tout le contenu du dossier dist.

API/ : Crée ce dossier et place ton fichier api_volley.php à l'intérieur.

logo_jsa_tigre.png : Assure-toi qu'il est à la racine (comme dans ton code).

3. Vérifier les URLs
   Dans ton code App.tsx, tu as cette ligne :
   const API = 'https://seme-et-tisse.fr/API/api_volley.php';

Si tu restes sur ce domaine : Ne change rien.

Si tu changes de serveur/domaine : Mets à jour cette URL dans App.tsx avant de refaire un npm run build.

4. Configuration .htaccess (Essentiel pour React Router)
   Si tu utilises des routes ou si tu veux forcer le HTTPS, crée un fichier nommé .htaccess à la racine de ton serveur avec ce contenu :

Apache
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /

# Forcer le HTTPS

RewriteCond %{HTTPS} off
RewriteRule ^(.\*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Rediriger toutes les requêtes vers index.html (pour éviter les erreurs 404 au rafraîchissement)

RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
</IfModule>


---------------- POUR PWA ------------------

npm install vite-plugin-pwa -D

fichier vite.config.ts:

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  publicDir: 'public', // Force Vite à utiliser ce dossier pour les assets statiques
  // Utilise './' au lieu de '/FriendsEvent/' pour forcer des chemins relatifs 
  // qui fonctionneront partout, peu importe le dossier.
  base: './', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // Gère l'injection proprement
      manifest: {
        id: "/FriendsEvent/index.html",
        name: "Friends Event Booking",
        short_name: "FriendsEvent",
        description: "Application de réservation pour événements entre amis",
        start_url: "./index.html",
        display: "standalone",
        background_color: "#111827",
        theme_color: "#111827",
        lang: "fr", // On corrige le 'en' en 'fr' ici
        scope: "./",
        icons: [
          {
            src: "logo192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable" // Très important pour Android
          }
        ],
        screenshots: [
          {
            src: "screenshot-mobile.png",
            sizes: "1080x1920",
            type: "image/png",
            form_factor: "narrow",
            label: "Application Friends Event sur Mobile"
          },
          {
            src: "screenshot-desktop.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Application Friends Event sur Ordinateur"
          }
        ]
      }
    })
  ]
});