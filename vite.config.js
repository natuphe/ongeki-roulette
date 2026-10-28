import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/ongeki-roulette/",

  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "icon-192.png",
        "icon-512.png",
      ],

      manifest: {
        name: "オンゲキ 楽曲ルーレット",
        short_name: "オンゲキルーレット",
        description:
          "譜面定数、ジャンル、難易度からオンゲキの譜面を抽選します。",
        lang: "ja",
        start_url: "/ongeki-roulette/",
        scope: "/ongeki-roulette/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f7f7fb",
        theme_color: "#8b5cf6",

        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,json,png,svg,ico}",
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});