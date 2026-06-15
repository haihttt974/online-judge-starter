import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Default to "/" for local development and standard production builds.
  // Use "/online-judge-starter/" only when explicitly building for GitHub Pages.
  const base = env.VITE_DEPLOY_TARGET === "gh-pages" ? "/online-judge-starter/" : "/";
  
  return {
    plugins: [react()],
    base: base,
    server: {
      host: "0.0.0.0",
      port: 8080,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true
        }
      }
    }
  };
});
