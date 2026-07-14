import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = normalize(join(root, relativePath));

  if (!filePath.startsWith(normalize(root))) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    await stat(filePath);
    response.setHeader("Content-Type", contentTypes[extname(filePath)] || "application/octet-stream");
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(8767, "127.0.0.1");
