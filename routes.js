import {
	DEFAULT_API_VERSION,
	buildCapiEvent,
	buildCapiPayload,
	sendToMetaCapi,
} from "./capi.js";

/**
 * Dispatch shared `/api/*` routes for both the local Node server and Cloudflare Worker.
 * Returns `null` for non-API paths so the caller can serve static assets.
 *
 * @param {object} params Route invocation parameters.
 * @returns {Promise<{ status: number, data: unknown } | null>} JSON response descriptor or null.
 */
export async function dispatchApiRoute({
	method,
	pathname,
	readBody,
	clientIp = "",
	userAgent = "",
	sendFn = sendToMetaCapi,
}) {
	if (!pathname.startsWith("/api/")) {
		return null;
	}

	if (pathname === "/api/health") {
		if (method !== "GET") {
			return { status: 405, data: { ok: false, error: "Method not allowed" } };
		}
		return { status: 200, data: { ok: true, service: "meta-capi-test-site" } };
	}

	const postRoutes = new Set(["/api/capi/send", "/api/capi/batch", "/api/form-submit"]);
	if (!postRoutes.has(pathname)) {
		return { status: 404, data: { ok: false, error: "API route not found" } };
	}

	if (method !== "POST") {
		return { status: 405, data: { ok: false, error: "Method not allowed" } };
	}

	let body;
	try {
		body = await readBody();
	} catch (err) {
		return { status: 400, data: { ok: false, error: err.message } };
	}

	try {
		if (pathname === "/api/capi/send") {
			const event = buildCapiEvent({
				eventName: body.eventName,
				eventId: body.eventId,
				eventTime: body.eventTime,
				eventSourceUrl: body.eventSourceUrl,
				actionSource: body.actionSource,
				userData: body.userData,
				customData: body.customData,
				optOut: body.optOut,
				clientIp,
				userAgent,
			});
			const payload = buildCapiPayload({
				events: [event],
				testEventCode: body.testEventCode,
			});
			const result = await sendFn({
				datasetId: body.datasetId,
				accessToken: body.accessToken,
				apiVersion: body.apiVersion || DEFAULT_API_VERSION,
				payload,
			});
			return { status: result.ok ? 200 : 502, data: result };
		}

		if (pathname === "/api/capi/batch") {
			if (!Array.isArray(body.events) || body.events.length === 0) {
				return { status: 400, data: { ok: false, error: "events array is required." } };
			}
			const builtEvents = body.events.map((item) =>
				buildCapiEvent({
					eventName: item?.eventName,
					eventId: item?.eventId,
					eventTime: item?.eventTime,
					eventSourceUrl: item?.eventSourceUrl,
					actionSource: item?.actionSource,
					userData: item?.userData,
					customData: item?.customData,
					optOut: item?.optOut,
					clientIp,
					userAgent,
				}),
			);
			const payload = buildCapiPayload({
				events: builtEvents,
				testEventCode: body.testEventCode,
			});
			const result = await sendFn({
				datasetId: body.datasetId,
				accessToken: body.accessToken,
				apiVersion: body.apiVersion || DEFAULT_API_VERSION,
				payload,
			});
			return { status: result.ok ? 200 : 502, data: result };
		}

		if (pathname === "/api/form-submit") {
			const submissionRecord = {
				receivedAt: new Date().toISOString(),
				eventName: body.eventName || "Lead",
				eventId: body.eventId || null,
				fields: body.formFields || {},
			};

			if (!body.sendCapi) {
				return { status: 200, data: { ok: true, submission: submissionRecord, capi: null } };
			}

			const event = buildCapiEvent({
				eventName: body.eventName || "Lead",
				eventId: body.eventId,
				eventSourceUrl: body.eventSourceUrl,
				actionSource: body.actionSource || "website",
				userData: body.userData,
				customData: body.customData,
				clientIp,
				userAgent,
			});
			const payload = buildCapiPayload({
				events: [event],
				testEventCode: body.testEventCode,
			});
			const capiResult = await sendFn({
				datasetId: body.datasetId,
				accessToken: body.accessToken,
				apiVersion: body.apiVersion || DEFAULT_API_VERSION,
				payload,
			});
			return {
				status: capiResult.ok ? 200 : 502,
				data: {
					ok: capiResult.ok,
					submission: submissionRecord,
					capi: capiResult,
				},
			};
		}

		return { status: 404, data: { ok: false, error: "API route not found" } };
	} catch (err) {
		return { status: 400, data: { ok: false, error: err.message } };
	}
}
