import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["brand/pointmor-mark.svg"],
      manifest: {
        id: "/",
        name: "Pointmor",
        short_name: "Pointmor",
        description: "Customer loyalty — points, rewards, campaigns.",
        lang: "tr",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0a1628",
        background_color: "#f4f7f9",
        start_url: "/",
        scope: "/",
        categories: ["food", "lifestyle", "business"],
        icons: [
          {
            src: "/brand/pointmor-mark.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,ico}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      "Cache-Control": "no-store",
    },
  },
});
