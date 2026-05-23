const crypto = require("crypto");
const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 5173);
const DATA_DIR = process.env.SELF_FISH_DATA_DIR || path.join(ROOT_DIR, "data");
const LEGACY_DATA_FILE = process.env.SELF_FISH_DATA_FILE || path.join(DATA_DIR, "state.json");
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const PASSWORD_ITERATIONS = 120000;
const HASH_PREFIX = "pbkdf2";

const sessions = new Map();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const digest = crypto
    .pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, 32, "sha256")
    .toString("hex");
  return `${HASH_PREFIX}$${PASSWORD_ITERATIONS}$${salt}$${digest}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;
  const [prefix, iterations, salt, digest] = storedHash.split("$");
  if (prefix !== HASH_PREFIX || !iterations || !salt || !digest) return false;

  const candidate = crypto
    .pbkdf2Sync(String(password), salt, Number(iterations), 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(digest, "hex"));
}

function safeUserId(userId) {
  if (!/^[a-zA-Z0-9_-]{1,48}$/.test(String(userId))) {
    throw new Error("Invalid user id");
  }
  return String(userId);
}

function getUserStateFile(dataDir, userId) {
  return path.join(dataDir, "users", safeUserId(userId), "state.json");
}

function defaultUsers() {
  if (process.env.SELF_FISH_USERS) {
    return parseUsers(process.env.SELF_FISH_USERS);
  }

  if (process.env.SELF_FISH_USER && process.env.SELF_FISH_PASSWORD) {
    return [
      {
        id: "owner",
        name: process.env.SELF_FISH_USER,
        username: process.env.SELF_FISH_USER,
        passwordHash: createPasswordHash(process.env.SELF_FISH_PASSWORD),
      },
    ];
  }

  return [
    {
      id: "fish",
      name: "小小鱼",
      username: "fish",
      passwordHash: createPasswordHash("fish1234"),
    },
    {
      id: "kitty",
      name: "Kitty",
      username: "kitty",
      passwordHash: createPasswordHash("kitty1234"),
    },
  ];
}

function parseUsers(raw) {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("SELF_FISH_USERS must be a non-empty JSON array");
  }

  return parsed.map((user) => {
    if (!user || typeof user !== "object") throw new Error("Invalid user config");
    const id = safeUserId(user.id);
    const username = String(user.username || "").trim();
    const name = String(user.name || username || id).trim();
    const passwordHash = user.passwordHash || createPasswordHash(user.password || "");

    if (!username || !name || !passwordHash) {
      throw new Error("Each user needs id, username, name, and password or passwordHash");
    }

    return { id, username, name, passwordHash };
  });
}

function usersByUsername(users = defaultUsers()) {
  return new Map(users.map((user) => [user.username, user]));
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, username: user.username };
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

function cookieOptions(maxAge = SESSION_TTL_MS / 1000) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `self_fish_session=${maxAge ? "%SESSION%" : ""}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        if (index === -1) return [item, ""];
        return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      }),
  );
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function clearExpiredSessions() {
  const now = Date.now();
  sessions.forEach((session, token) => {
    if (session.expiresAt <= now) sessions.delete(token);
  });
}

function userFromRequest(request, users = defaultUsers()) {
  clearExpiredSessions();
  const cookies = parseCookies(request.headers.cookie || "");
  const token = cookies.self_fish_session;
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) return null;
  return users.find((user) => user.id === session.userId) || null;
}

async function readStateFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeStateFile(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(tempFile, filePath);
}

async function readBody(request) {
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

async function readJsonBody(request) {
  const body = await readBody(request);
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

function unauthenticated(response) {
  sendJson(response, 401, { error: "Authentication required" });
}

async function handleLogin(request, response, users) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    sendJson(response, 400, { error: "Invalid JSON" });
    return;
  }

  const user = usersByUsername(users).get(String(body.username || "").trim());
  if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) {
    sendJson(response, 401, { error: "Invalid username or password" });
    return;
  }

  const token = createSession(user.id);
  sendJson(response, 200, { user: publicUser(user) }, {
    "Set-Cookie": cookieOptions().replace("%SESSION%", encodeURIComponent(token)),
  });
}

async function handleMe(request, response, users) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const user = userFromRequest(request, users);
  if (!user) {
    sendJson(response, 200, { user: null });
    return;
  }
  sendJson(response, 200, { user: publicUser(user) });
}

async function handleLogout(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const cookies = parseCookies(request.headers.cookie || "");
  if (cookies.self_fish_session) sessions.delete(cookies.self_fish_session);
  sendJson(response, 200, { ok: true }, {
    "Set-Cookie": cookieOptions(0),
  });
}

async function handleState(request, response, users) {
  const user = userFromRequest(request, users);
  if (!user) {
    unauthenticated(response);
    return;
  }

  const stateFile = getUserStateFile(DATA_DIR, user.id);
  if (request.method === "GET") {
    let state = await readStateFile(stateFile);
    if (Object.keys(state).length === 0 && user.id === "owner") {
      state = await readStateFile(LEGACY_DATA_FILE);
    }
    sendJson(response, 200, state);
    return;
  }

  if (request.method === "PUT" || request.method === "POST") {
    const parsed = await readJsonBody(request);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      sendJson(response, 400, { error: "State must be a JSON object" });
      return;
    }

    await writeStateFile(stateFile, parsed);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function handleApi(request, response, users = defaultUsers()) {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (pathname === "/api/login") {
    await handleLogin(request, response, users);
    return;
  }

  if (pathname === "/api/me") {
    await handleMe(request, response, users);
    return;
  }

  if (pathname === "/api/logout") {
    await handleLogout(request, response);
    return;
  }

  if (pathname === "/api/state") {
    await handleState(request, response, users);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function handleStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const distDir = path.join(ROOT_DIR, "dist");
  const hasDist = await fileExists(path.join(distDir, "index.html"));

  if (hasDist) {
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
    let filePath = path.join(distDir, normalizedPath);
    if (!(await fileExists(filePath))) filePath = path.join(distDir, "index.html");
    const ext = path.extname(filePath);
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
    });
    response.end(body);
    return;
  }

  const legacyFiles = new Map([
    ["/", "index.html"],
    ["/index.html", "index.html"],
    ["/styles.css", "styles.css"],
    ["/app.js", "app.js"],
    ["/README.md", "README.md"],
  ]);
  const fileName = legacyFiles.get(pathname);
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

function createAppServer(users = defaultUsers()) {
  return http.createServer(async (request, response) => {
    try {
      if (request.url.startsWith("/api/")) {
        await handleApi(request, response, users);
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
}

function startServer() {
  const users = defaultUsers();
  const server = createAppServer(users);

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
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Configured users: ${users.map((user) => user.username).join(", ")}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createAppServer,
  createPasswordHash,
  getUserStateFile,
  parseUsers,
  safeUserId,
  verifyPassword,
};
