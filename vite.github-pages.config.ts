import tailwindcss from "@tailwindcss/postcss";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/TheBiggestCardGame/",
  root: resolve(__dirname, "github-pages-src"),
  publicDir: resolve(__dirname, "public"),
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "github-pages-dist"),
    emptyOutDir: true,
  },
});
