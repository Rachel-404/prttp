import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const spaHtmlFallbackPlugin = () => ({
  name: "spa-html-fallback",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (
        req.url &&
        req.url.includes(".html") &&
        !req.url.includes("historial_exportacion.html") &&
        !req.url.includes("respaldos_backup.html")
      ) {
        const qIndex = req.url.indexOf("?");
        const query = qIndex !== -1 ? req.url.slice(qIndex) : "";
        req.url = "/index.html" + query;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), spaHtmlFallbackPlugin()],
  server: {
    port: 5173,
    open: false
  }
});
