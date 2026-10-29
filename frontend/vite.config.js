import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const api = (env.VITE_API_URL || "/api").replace(/\/+$/, "");
  const backendOrigin = api.startsWith("/") ? "" : new URL(api).origin;
  const sources = "'self'" + (backendOrigin ? ` ${backendOrigin}` : "");
  return {
    plugins: [react(), tailwindcss(), {
      name: "cloudflare-security-headers",
      writeBundle(options) {
        const csp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src ${sources} data: blob:; media-src ${sources} blob:; connect-src ${sources}; frame-src ${sources}; worker-src 'self' blob:; font-src 'self' data: blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`;
        writeFileSync(resolve(options.dir || "dist", "_headers"), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${csp}\n`);
      }
    }],
    server: { port: 5174, proxy: { "/api": { target: "http://127.0.0.1:8001", changeOrigin: true, rewrite: path => path.replace(/^\/api/, "") } } }
  };
});
