import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      /* 自己注册 sw.js（见 src/main.tsx），避免重复注册 */
      injectRegister: null,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "人生账本",
        short_name: "人生账本",
        description: "把时间和钱，变成看得见的人生。",
        theme_color: "#F7F5F0",
        background_color: "#F7F5F0",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        /* hash routing needs no navigation fallback, and leaving it on would
           let the service worker answer requests for unrelated files. */
        navigateFallback: null,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
