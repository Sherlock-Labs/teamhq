import { defineConfig } from "vite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certFile = path.resolve(__dirname, "server/certs/thinkcentre.tail560767.ts.net.crt");
const keyFile = path.resolve(__dirname, "server/certs/thinkcentre.tail560767.ts.net.key");
const hasCerts = fs.existsSync(certFile) && fs.existsSync(keyFile);

export default defineConfig({
  server: {
    port: 5174,
    host: "0.0.0.0",
    allowedHosts: ["thinkcentre.tail560767.ts.net"],
    https: hasCerts
      ? { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }
      : undefined,
    proxy: {
      "/api": "http://localhost:3002",
    },
  },
});
