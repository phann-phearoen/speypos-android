import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const isTermuxRuntime =
  process.env.SPEYPOS_TERMUX === "1" ||
  Boolean(process.env.TERMUX_VERSION) ||
  Boolean(process.env.ANDROID_ROOT);

const isAndroidWebViewBuild =
  process.env.SPEYPOS_ANDROID_WEBVIEW === "1" || process.env.VITE_ANDROID_WEBVIEW === "1";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: isAndroidWebViewBuild ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      injectRegister: isAndroidWebViewBuild ? false : "auto",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "placeholder.svg"],
      manifest: {
        name: "SpeyPOS - Point of Sale",
        short_name: "SpeyPOS",
        description: "Touch-first Point of Sale System for Coffee Shops",
        theme_color: "#3d2d1f",
        background_color: "#f5f0eb",
        display: "standalone",
        orientation: "portrait",
        start_url: isAndroidWebViewBuild ? "./" : "/",
        scope: isAndroidWebViewBuild ? "./" : "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Workbox+terser can exit early on some Termux/Android builds.
        // Development mode avoids aggressive SW minification and is stable there.
        mode: isTermuxRuntime ? "development" : "production",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
