import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://trisert.github.io/limitless-labs/",
  base: "/limitless-labs/",
  output: "static",
  trailingSlash: "never",
  server: { host: "127.0.0.1" },
  build: { format: "file", inlineStylesheets: "never" },
  vite: { build: { sourcemap: false, assetsInlineLimit: 0 } },
  markdown: { shikiConfig: { theme: "github-dark-dimmed" } },
});
