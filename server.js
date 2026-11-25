import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatchApiRoute } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 4321;
const MAX_BODY_BYTES = 1024 * 1024;

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
};

/**
 * Send a JSON HTTP response.
 *
 * @param {http.ServerResponse} res Response stream.
 * @param {number} status HTTP status code.
 * @param {unknown} data JSON-serializable payload.
 */
function sendJson(res, status, data) {
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(data));
}

/**
 * Read and parse a JSON request body with size protection.
 *
 * @param {http.IncomingMessage} req Incoming request.
 * @returns {Promise<Record<string, unknown>>} Parsed JSON object.
 */
async function readJsonBody(req) {
	const chunks = [];
	let totalBytes = 0;

	for await (const chunk of req) {
		totalBytes += chunk.length;
		if (totalBytes > MAX_BODY_BYTES) {
			throw new Error("Request body exceeds 1 MB limit.");
		}
		chunks.push(chunk);
	}

	const text = Buffer.concat(chunks).toString("utf8").trim();
	if (!text) return {};
	const parsed = JSON.parse(text);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Request body must be a JSON object.");
	}
	return parsed;
}

/**
 * Extract client IP and user agent from request headers/socket.
 *
 * @param {http.IncomingMessage} req Incoming HTTP request.
 * @returns {{ clientIp: string, userAgent: string }} Technical user_data context.
 */
function extractClientContext(req) {
	const forwarded = req.headers["x-forwarded-for"];
	const rawIp =
		typeof forwarded === "string" && forwarded.trim()
			? forwarded.split(",")[0].trim()
			: req.socket?.remoteAddress || "";
	const clientIp = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;
	const userAgent =
		typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "";
	return { clientIp, userAgent };
}

/**
 * Resolve and serve static files inside `public/` safely.
 *
 * @param {string} reqPath URL pathname.
 * @param {http.ServerResponse} res HTTP response stream.
 */
function serveStatic(reqPath, res) {
	const cleanPath = reqPath === "/" ? "index.html" : reqPath.replace(/^\/+/, "");
	const resolved = path.resolve(PUBLIC_DIR, cleanPath);
	if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== path.join(PUBLIC_DIR, "index.html")) {
		sendJson(res, 403, { error: "Forbidden" });
		return;
	}

	fs.readFile(resolved, (err, content) => {
		if (err) {
			sendJson(res, 404, { error: "Not found" });
			return;
		}
		const ext = path.extname(resolved).toLowerCase();
		res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
		res.end(content);
	});
}

/**
 * Handle HTTP requests for static assets and CAPI / form-submission endpoints.
 *
 * @param {http.IncomingMessage} req Incoming request.
 * @param {http.ServerResponse} res Response stream.
 */
export async function handleRequest(req, res) {
	const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

	if (url.pathname.startsWith("/api/")) {
		const { clientIp, userAgent } = extractClientContext(req);
		const result = await dispatchApiRoute({
			method: req.method,
			pathname: url.pathname,
			readBody: () => readJsonBody(req),
			clientIp,
			userAgent,
		});
		sendJson(res, result.status, result.data);
		return;
	}

	if (req.method === "GET") {
		serveStatic(url.pathname, res);
		return;
	}

	sendJson(res, 405, { error: "Method not allowed" });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const server = http.createServer(handleRequest);
	server.listen(PORT, () => {
		console.log(`Meta CAPI & Dataset Test Site listening on http://localhost:${PORT}`);
	});
}

export default handleRequest;
