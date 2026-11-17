import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

function pwaPrecache(): Plugin {
  return {
    name: "jw-tracker-pwa-precache",
    apply: "build",
    writeBundle(options, bundle) {
      const buildAssets = Object.keys(bundle)
        .filter(file => /\.(?:js|css|html|svg|png|webp|woff2?)$/i.test(file))
        .map(file => `/${file}`);
      const urls = [...new Set([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/favicon.svg",
        "/icon-192.png",
        "/icon-512.png",
        ...buildAssets,
      ])];
      const fingerprint = createHash("sha256").update(JSON.stringify(urls));
      for (const [file, output] of Object.entries(bundle)) {
        fingerprint.update(file);
        fingerprint.update(output.type === "chunk" ? output.code : output.source);
      }
      for (const file of ["manifest.webmanifest", "favicon.svg", "icon-192.png", "icon-512.png"]) {
        fingerprint.update(readFileSync(resolve(projectRoot, "public", file)));
      }
      const workerTemplate = readFileSync(resolve(projectRoot, "pwa-sw-template.js"), "utf8");
      fingerprint.update(workerTemplate);
      const cacheVersion = fingerprint.digest("hex").slice(0, 12);
      const outputDirectory = options.dir ?? resolve(projectRoot, "dist");
      const serviceWorker = workerTemplate.replace("__CACHE_NAME__", `jw-tracker-${cacheVersion}`);

      writeFileSync(resolve(outputDirectory, "precache-manifest.json"), JSON.stringify(urls));
      writeFileSync(resolve(outputDirectory, "sw.js"), serviceWorker);
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaPrecache()],
});
