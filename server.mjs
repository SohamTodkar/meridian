import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist", "public");
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const cleanPath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  const requested = join(root, cleanPath);
  if (existsSync(requested) && statSync(requested).isFile()) return requested;
  if (existsSync(requested) && statSync(requested).isDirectory()) {
    const index = join(requested, "index.html");
    if (existsSync(index)) return index;
  }
  return join(root, "404.html");
}

createServer((req, res) => {
  const file = resolveRequestPath(req.url || "/");
  if (!existsSync(file)) {
    res.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    res.end("Meridian is building. Please retry shortly.");
    return;
  }
  res.writeHead(file.endsWith("404.html") ? 404 : 200, {
    "cache-control": file.includes(`${join(root, "_next")}`) ? "public, max-age=31536000, immutable" : "no-cache",
    "content-type": mimeTypes[extname(file)] || "application/octet-stream",
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Meridian static server ready on port ${port}`));
