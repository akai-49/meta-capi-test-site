import { dispatchApiRoute } from "../routes.js";

export const config = {
	maxDuration: 15,
};

/**
 * Vercel Serverless Function catch-all handler for `/api/*` routes.
 *
 * @param {import("http").IncomingMessage & { body?: any, query?: any }} req
 * @param {import("http").ServerResponse & { status: (c: number) => any, json: (d: any) => any }} res
 */
export default async function handler(req, res) {
	const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
	const proto = req.headers["x-forwarded-proto"] || "https";
	const url = new URL(req.url, `${proto}://${host}`);
	const pathname = url.pathname;
	const method = req.method || "GET";

	const forwarded = req.headers["x-forwarded-for"];
	const clientIp =
		(forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim()) : "") ||
		req.headers["x-real-ip"] ||
		req.socket?.remoteAddress ||
		"";

	const userAgent = req.headers["user-agent"] || "";

	const result = await dispatchApiRoute({
		method,
		pathname,
		readBody: async () => {
			if (req.body && typeof req.body === "object") {
				return req.body;
			}
			if (typeof req.body === "string" && req.body.trim()) {
				return JSON.parse(req.body);
			}
			return {};
		},
		clientIp,
		userAgent,
	});

	if (!result) {
		res.statusCode = 404;
		res.setHeader("Content-Type", "application/json");
		if (typeof res.json === "function") {
			return res.json({ ok: false, error: "API route not found" });
		}
		return res.end(JSON.stringify({ ok: false, error: "API route not found" }));
	}

	res.statusCode = result.status;
	res.setHeader("Content-Type", "application/json");
	if (typeof res.json === "function") {
		return res.json(result.data);
	}
	return res.end(JSON.stringify(result.data));
}
