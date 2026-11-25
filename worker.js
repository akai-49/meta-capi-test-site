import { dispatchApiRoute } from "./routes.js";

const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Read and parse a JSON body from a Fetch `Request` with a 1 MB limit.
 *
 * @param {Request} request Incoming Worker request.
 * @returns {Promise<Record<string, unknown>>} Parsed JSON object.
 */
async function readWorkerJsonBody(request) {
	const contentLength = Number(request.headers.get("content-length") || 0);
	if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
		throw new Error("Request body exceeds 1 MB limit.");
	}

	const text = (await request.text()).trim();
	if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
		throw new Error("Request body exceeds 1 MB limit.");
	}
	if (!text) return {};

	const parsed = JSON.parse(text);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Request body must be a JSON object.");
	}
	return parsed;
}

/**
 * Cloudflare Worker entrypoint handling `/api/*` CAPI routes and delegating
 * static pages/assets to the Workers Static Assets `ASSETS` binding.
 */
export default {
	/**
	 * Handle incoming HTTP requests on Cloudflare Workers.
	 *
	 * @param {Request} request Incoming HTTP request.
	 * @param {{ ASSETS: { fetch: (req: Request) => Promise<Response> } }} env Worker bindings.
	 * @returns {Promise<Response>} HTTP response.
	 */
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/api/")) {
			const forwarded = request.headers.get("x-forwarded-for");
			const clientIp =
				request.headers.get("cf-connecting-ip") ||
				(forwarded ? forwarded.split(",")[0].trim() : "") ||
				"";
			const userAgent = request.headers.get("user-agent") || "";

			const result = await dispatchApiRoute({
				method: request.method,
				pathname: url.pathname,
				readBody: () => readWorkerJsonBody(request),
				clientIp,
				userAgent,
			});

			if (result.status >= 500) {
				console.error(
					JSON.stringify({
						message: "capi_route_upstream_error",
						path: url.pathname,
						status: result.status,
					}),
				);
			} else {
				console.log(
					JSON.stringify({
						message: "capi_route_handled",
						method: request.method,
						path: url.pathname,
						status: result.status,
					}),
				);
			}

			return Response.json(result.data, { status: result.status });
		}

		if (env?.ASSETS?.fetch) {
			return env.ASSETS.fetch(request);
		}

		return new Response("Static assets binding is not configured.", { status: 500 });
	},
};
