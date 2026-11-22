
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

      const staticAssets = [
        "/site.webmanifest",
        "/favicon.svg",
        "/favicon-96x96.png",
        "/apple-touch-icon.png",
        "/web-app-manifest-192x192.png",
        "/web-app-manifest-512x512.png",
      ];

      const urls = [...new Set([
        "/",
        "/index.html",
        ...staticAssets,
        ...buildAssets,
      ])];

      const fingerprint = createHash("sha256").update(JSON.stringify(urls));

      for (const [file, output] of Object.entries(bundle)) {
        fingerprint.update(file);
        fingerprint.update(output.type === "chunk" ? output.code : output.source);
      }

      for (const file of [
        "site.webmanifest",
        "favicon.svg",
        "favicon-96x96.png",
        "apple-touch-icon.png",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
      ]) {
        fingerprint.update(readFileSync(resolve(projectRoot, "public", file)));
      }

      const workerTemplate = readFileSync(
        resolve(projectRoot, "pwa-sw-template.js"),
        "utf8"
      );

      fingerprint.update(workerTemplate);

      const cacheVersion = fingerprint.digest("hex").slice(0, 12);
      const outputDirectory = options.dir ?? resolve(projectRoot, "dist");
      const serviceWorker = workerTemplate.replace(
        "__CACHE_NAME__",
        `jw-tracker-${cacheVersion}`
      );

      writeFileSync(
        resolve(outputDirectory, "precache-manifest.json"),
        JSON.stringify(urls)
      );

      writeFileSync(resolve(outputDirectory, "sw.js"), serviceWorker);
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaPrecache()],
  server: {
    proxy: {
      "/api": {
        target: "https://jw-tracker-api.porcenatjamsle07.workers.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },

  preview: {
    proxy: {
      "/api": {
        target: "https://jw-tracker-api.porcenatjamsle07.workers.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});