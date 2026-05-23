const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 5173);
const DATA_FILE = process.env.SELF_FISH_DATA_FILE || path.join(ROOT_DIR, "data", "state.json");
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const publicFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
  ["/README.md", "README.md"],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

function isAuthorized(request) {
  const user = process.env.SELF_FISH_USER;
  const password = process.env.SELF_FISH_PASSWORD;
  if (!user || !password) return true;

  const header = request.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  return decoded === `${user}:${password}`;
}

function askForAuth(response) {
  response.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="Self-fish"',
  });
  response.end("Authentication required");
}

async function readState() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(tempFile, DATA_FILE);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function handleApi(request, response) {
  if (request.url === "/api/health" && request.method === "GET") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.url !== "/api/state") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (request.method === "GET") {
    sendJson(response, 200, await readState());
    return;
  }

  if (request.method === "PUT" || request.method === "POST") {
    const body = await readBody(request);
    let parsed;
    try {
      parsed = JSON.parse(body || "{}");
    } catch {
      sendJson(response, 400, { error: "Invalid JSON" });
      return;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      sendJson(response, 400, { error: "State must be a JSON object" });
      return;
    }

    await writeState(parsed);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function handleStatic(request, response) {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const fileName = publicFiles.get(pathname);
  if (!fileName) {
    sendText(response, 404, "Not found");
    return;
  }

  const filePath = path.join(ROOT_DIR, fileName);
  const ext = path.extname(filePath);
  const body = await fs.readFile(filePath);
  response.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=60",
  });
  response.end(body);
}

const server = http.createServer(async (request, response) => {
  try {
    if (!isAuthorized(request)) {
      askForAuth(response);
      return;
    }

    if (request.url.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    await handleStatic(request, response);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "Internal server error" });
    } else {
      response.end();
    }
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    console.error(`Try: PORT=${PORT + 1} npm start`);
    console.error(`Or stop the process currently using port ${PORT}.`);
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Self-fish is running at http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
