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
        /*
         * 刻意不预缓存 index.html。
         *
         * 预缓存 HTML 会导致部署新版本之后，用户仍然被旧页面钉住：
         * 页面里的资源文件名是带哈希的，旧 HTML 指向旧 JS，
         * 于是"刷新了还是旧版本"。HTML 改走 NetworkFirst，始终优先拿最新的。
         */
        globPatterns: ["**/*.{js,css,svg,png,jpg,woff2}"],
        globIgnores: ["**/index.html"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "lifeledger-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
