import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const buildDate = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(buildDate),
    },
    plugins: [
      react(),
      VitePWA({
        // On NE désactive PLUS le plugin, sinon pas de bouton d'install
        disable: false, 
        
        // On choisit 'null' en dev pour éviter que le Service Worker ne tente de s'enregistrer
        // car c'est lui qui fait planter StackBlitz.
        injectRegister: isDev ? null : 'script', 
        
        registerType: 'autoUpdate',
        
        devOptions: {
          enabled: true, // On l'active pour que le manifest soit généré en mode dev
          type: 'module'
        },
        
        manifest: {
          id: "jsa-volley-coach-app",
          name: "JSA VOLLEY COACH",
          short_name: "JSA_VOLLEY_COACH",
          description: "Application de gestion d'equipe pour les JSA",
          start_url: "index.html",
          display: "standalone",
          background_color: "#111827",
          theme_color: "#111827",
          lang: "fr",
          scope: "./",
          icons: [
            {
              src: "logo_coach192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "logo_coach512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "logo_coach512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ],
          // Ajout des screenshots pour forcer le critère d'installabilité "Rich Install"
          screenshots: [
            {
              src: "screenshot-mobile.png",
              sizes: "1080x1920",
              type: "image/png",
              form_factor: "narrow"
            }
          ]
        }
      })
    ],
    server: {
      watch: {
        ignored: ['**/dist/**']
      }
    }
  };
});