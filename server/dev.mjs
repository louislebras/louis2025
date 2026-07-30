import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveRequest(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const requestedPath = path.resolve(root, `.${cleanPath}`);
  if (!requestedPath.startsWith(`${root}${path.sep}`) && requestedPath !== root) {
    return null;
  }

  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  const directoryIndex = path.join(requestedPath, "index.html");
  return fs.existsSync(directoryIndex) ? directoryIndex : path.join(root, "index.html");
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequest(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local site running at http://localhost:${port}`);
});
