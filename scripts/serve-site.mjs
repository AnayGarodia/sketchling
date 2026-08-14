// A static file server for site/, used by `npm run site` and by the playground test. The
// playground has no server-side step — this exists only because ES modules and blob-module
// imports need a real http origin, which opening index.html from the filesystem doesn't give.
import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "../site");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/** Resolves and starts on `port` (0 picks a free one). Returns the server and its base URL. */
export function startServer({ root = DEFAULT_ROOT, port = 0 } = {}) {
  const server = http.createServer((req, res) => {
    const requested = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    const resolved = path.join(root, requested === "/" ? "index.html" : requested);
    // Refuse anything that escapes the served directory.
    if (!resolved.startsWith(root)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let stats;
    try {
      stats = statSync(resolved);
    } catch {
      res.writeHead(404).end("not found");
      return;
    }
    const file = stats.isDirectory() ? path.join(resolved, "index.html") : resolved;
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(file).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await startServer({ port: Number(process.env.PORT ?? 5173) });
  console.log(`site/ served at ${url}`);
}
