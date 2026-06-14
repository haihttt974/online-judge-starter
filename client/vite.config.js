import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/online-judge-starter/",
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (_, __, response) => {
            if (!response.headersSent) {
              response.writeHead(503, { "Content-Type": "application/json" });
            }
            response.end(JSON.stringify({
              status: "SE",
              message: "Backend is unavailable. Start the full stack with: docker compose up --build"
            }));
          });
        }
      }
    }
  }
});
