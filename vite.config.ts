import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import news from "./src/content/news.json";
import events from "./src/content/events.json";
import resources from "./src/content/resources.json";

const buildId = new Date().toISOString();

export default defineConfig({
  define: { "import.meta.env.VITE_READER_BUILD_ID": JSON.stringify(buildId) },
  plugins: [react(), {
    name: "reader-delivery-receipt",
    generateBundle() {
      // Public delivery metadata only: no draft identifiers, content bodies, contacts or credentials.
      const items = [...news, ...events, ...resources].filter(item => item.status !== "draft").map(item => ({
        id: item.id, status: item.status,
        publishedAt: "publishedAt" in item ? item.publishedAt : null,
        expiresAt: "expiresAt" in item ? item.expiresAt : null,
        updatedAt: "updatedAt" in item ? item.updatedAt : null,
        ...("startAt" in item ? { startAt: item.startAt, endAt: item.endAt, sample: "sample" in item ? item.sample : false } : {}),
      }));
      this.emitFile({ type: "asset", fileName: "reader-status.json", source: JSON.stringify({ buildId, items }) });
    },
  }],
  build: {
    sourcemap: true,
  },
});
