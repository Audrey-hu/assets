import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * 单文件构建：把 JS / CSS 全部内联进一个 HTML，
 * 这样双击文件就能直接打开（file:// 下浏览器不允许加载 ES Module）。
 * 代价是放弃 service worker 与多文件缓存，所以它只作为“随手打开”的版本。
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-single",
    emptyOutDir: true,
    target: "es2019",
    cssCodeSplit: false,
    assetsInlineLimit: 1024 * 1024 * 64,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
      },
    },
  },
});
