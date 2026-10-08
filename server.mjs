import http from "node:http";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes("--production");
const portIndex = process.argv.indexOf("--port");
const port = Number(
  process.env.PORT || (portIndex >= 0 ? process.argv[portIndex + 1] : 5173),
);
const dataDir = path.resolve(
  process.env.WAITLIST_DATA_DIR || path.join(root, ".data"),
);
const dataFile = path.join(dataDir, "waitlist.jsonl");
const emails = new Set();
try {
  for (const line of (await readFile(dataFile, "utf8"))
    .split("\n")
    .filter(Boolean))
    emails.add(JSON.parse(line).email);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
let saveQueue = Promise.resolve();
const requests = new Map();
const limiterCleanup = setInterval(() => {
  for (const [key, value] of requests)
    if (Date.now() - value.since > 60000) requests.delete(key);
}, 60000);
limiterCleanup.unref();
const vite = production
  ? null
  : await (
      await import("vite")
    ).createServer({
      root,
      server: {
        middlewareMode: true,
        fs: {
          deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.data/**", "**/.context/**", "**/waitlist.jsonl"],
        },
      },
      appType: "spa",
    });
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".png": "image/png",
};

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.url?.split("?")[0] === "/api/waitlist") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return json(res, 405, { error: "Method not allowed" });
    }
    if (req.headers["sec-fetch-site"] === "cross-site")
      return json(res, 403, { error: "Cross-site submission rejected" });
    if (!req.headers["content-type"]?.includes("application/json"))
      return json(res, 415, { error: "JSON required" });
    const key = req.socket.remoteAddress;
    const previous = requests.get(key);
    const limit =
      previous && Date.now() - previous.since < 60000
        ? previous
        : { since: Date.now(), count: 0 };
    requests.set(key, limit);
    if (++limit.count > 10)
      return json(res, 429, { error: "Please try again in a minute" });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 2048) return json(res, 413, { error: "Request too large" });
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        return json(res, 400, { error: "Invalid JSON" });
      }
      const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return json(res, 400, { error: "Invalid email address" });
      const save = saveQueue.then(async () => {
        if (emails.has(email)) return;
        await mkdir(dataDir, { recursive: true, mode: 0o700 });
        await appendFile(
          dataFile,
          JSON.stringify({ email, joinedAt: new Date().toISOString() }) + "\n",
          { mode: 0o600 },
        );
        emails.add(email);
      });
      saveQueue = save.catch(() => {});
      await save;
      return json(res, 200, { success: true });
    } catch {
      return json(res, 500, {
        error: "Could not save your place. Please try again.",
      });
    }
  }
  if (vite) return vite.middlewares(req, res);
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    return res.end();
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const dist = path.join(root, "dist");
    const file = path.resolve(
      dist,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (!file.startsWith(dist + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(`Silo is running at http://localhost:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await vite?.close();
    server.close(() => process.exit(0));
  });
