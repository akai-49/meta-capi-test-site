import crypto from "node:crypto";

export const META_GRAPH_BASE_URL = "https://graph.facebook.com";
export const DEFAULT_API_VERSION = "v26.0";
export const MAX_BATCH_EVENTS = 1000;

const VALID_API_VERSION_RE = /^v\d+\.\d+$/;
const VALID_DATASET_ID_RE = /^\d{5,30}$/;

/**
 * Compute lowercase SHA-256 hex digest for a normalized string.
 * Returns undefined when input is empty after trimming.
 *
 * @param {string | number | null | undefined} value Raw value to hash.
 * @returns {string | undefined} SHA-256 hex string or undefined.
 */
export function sha256(value) {
	if (value === null || value === undefined) return undefined;
	const str = String(value).trim();
	if (!str) return undefined;
	return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

/**
 * Normalize a value according to Meta CAPI user_data rules before hashing.
 *
 * @param {string} field Meta CAPI user_data field key.
 * @param {string | number | null | undefined} raw Raw input value.
 * @returns {string} Normalized string (empty string if invalid/empty).
 */
export function normalizeUserField(field, raw) {
	if (raw === null || raw === undefined) return "";
	const str = String(raw).trim();
	if (!str) return "";

	switch (field) {
		case "em":
			return str.toLowerCase();
		case "ph": {
			const digits = str.replace(/\D+/g, "").replace(/^0+/, "");
			return digits;
		}
		case "fn":
		case "ln":
		case "ct":
			return str.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]/gi, "");
		case "st":
			return str.toLowerCase().replace(/[^a-z0-9]/gi, "");
		case "zp":
			return str.toLowerCase().replace(/\s+/g, "");
		case "country":
			return str.toLowerCase().replace(/[^a-z]/g, "").slice(0, 2);
		case "ge": {
			const lower = str.toLowerCase();
			if (lower === "m" || lower === "male") return "m";
			if (lower === "f" || lower === "female") return "f";
			return "";
		}
		case "db": {
			const digits = str.replace(/\D+/g, "");
			return digits.length === 8 ? digits : "";
		}
		case "external_id":
			return str.toLowerCase();
		default:
			return str.toLowerCase();
	}
}

/**
 * Build a Meta Conversions API `user_data` object with SHA-256 hashed PII
 * and unhashed technical signals (`fbp`, `fbc`, `client_ip_address`, `client_user_agent`).
 *
 * @param {Record<string, unknown>} rawUserData Raw user data from form/client.
 * @param {{ clientIp?: string, userAgent?: string }} [context] Request metadata.
 * @returns {Record<string, unknown>} Normalized and hashed `user_data`.
 */
export function normalizeAndHashUserData(rawUserData = {}, context = {}) {
	const hashedFields = ["em", "ph", "fn", "ln", "ct", "st", "zp", "country", "ge", "db", "external_id"];
	const userData = {};

	for (const field of hashedFields) {
		const normalized = normalizeUserField(field, rawUserData[field]);
		if (normalized) {
			userData[field] = [sha256(normalized)];
		}
	}

	if (typeof rawUserData.fbp === "string" && rawUserData.fbp.trim()) {
		userData.fbp = rawUserData.fbp.trim();
	}
	if (typeof rawUserData.fbc === "string" && rawUserData.fbc.trim()) {
		userData.fbc = rawUserData.fbc.trim();
	}

	const clientIp =
		(typeof rawUserData.client_ip_address === "string" && rawUserData.client_ip_address.trim()) ||
		(typeof context.clientIp === "string" && context.clientIp.trim()) ||
		"";
	if (clientIp) {
		userData.client_ip_address = clientIp;
	}

	const userAgent =
		(typeof rawUserData.client_user_agent === "string" && rawUserData.client_user_agent.trim()) ||
		(typeof context.userAgent === "string" && context.userAgent.trim()) ||
		"";
	if (userAgent) {
		userData.client_user_agent = userAgent;
	}

	return userData;
}

/**
 * Build a single Meta CAPI event object.
 *
 * @param {object} params Event parameters.
 * @returns {Record<string, unknown>} Meta CAPI event object.
 */
export function buildCapiEvent({
	eventName,
	eventId,
	eventTime,
	eventSourceUrl,
	actionSource = "website",
	userData = {},
	customData,
	optOut,
	clientIp,
	userAgent,
}) {
	if (!eventName || typeof eventName !== "string" || !eventName.trim()) {
		throw new Error("eventName is required.");
	}

	const unixTime =
		Number.isFinite(Number(eventTime)) && Number(eventTime) > 0
			? Math.floor(Number(eventTime))
			: Math.floor(Date.now() / 1000);

	const eventObj = {
		event_name: eventName.trim(),
		event_time: unixTime,
		event_id:
			typeof eventId === "string" && eventId.trim() ? eventId.trim() : crypto.randomUUID(),
		action_source:
			typeof actionSource === "string" && actionSource.trim() ? actionSource.trim() : "website",
		user_data: normalizeAndHashUserData(userData, { clientIp, userAgent }),
	};

	if (typeof eventSourceUrl === "string" && eventSourceUrl.trim()) {
		eventObj.event_source_url = eventSourceUrl.trim();
	}

	if (customData && typeof customData === "object" && !Array.isArray(customData)) {
		const cleaned = {};
		for (const [key, value] of Object.entries(customData)) {
			if (value !== undefined && value !== null && value !== "") {
				cleaned[key] = value;
			}
		}
		if (Object.keys(cleaned).length > 0) {
			eventObj.custom_data = cleaned;
		}
	}

	if (typeof optOut === "boolean") {
		eventObj.opt_out = optOut;
	}

	return eventObj;
}

/**
 * Build the root Meta Conversions API POST payload.
 *
 * @param {object} params Payload options.
 * @returns {{ data: Array<Record<string, unknown>>, test_event_code?: string }} Root CAPI body.
 */
export function buildCapiPayload({ events, testEventCode }) {
	if (!Array.isArray(events) || events.length === 0) {
		throw new Error("At least one event is required.");
	}
	if (events.length > MAX_BATCH_EVENTS) {
		throw new Error(`Batch cannot exceed ${MAX_BATCH_EVENTS} events.`);
	}

	const payload = { data: events };
	if (typeof testEventCode === "string" && testEventCode.trim()) {
		payload.test_event_code = testEventCode.trim();
	}
	return payload;
}

/**
 * Send a Conversions API payload to Meta Graph API.
 * Never includes the access token in the returned object.
 *
 * @param {object} params Request configuration and payload.
 * @returns {Promise<{ ok: boolean, status: number, endpoint: string, requestPayload: object, response: unknown }>}
 */
export async function sendToMetaCapi({
	datasetId,
	accessToken,
	apiVersion = DEFAULT_API_VERSION,
	payload,
	fetchFn = globalThis.fetch,
}) {
	const cleanDatasetId = typeof datasetId === "string" ? datasetId.trim() : "";
	if (!VALID_DATASET_ID_RE.test(cleanDatasetId)) {
		throw new Error("datasetId must be a numeric Meta Dataset / Pixel ID.");
	}

	const cleanToken = typeof accessToken === "string" ? accessToken.trim() : "";
	if (!cleanToken) {
		throw new Error("accessToken is required to send server CAPI events.");
	}

	const cleanVersion =
		typeof apiVersion === "string" && VALID_API_VERSION_RE.test(apiVersion.trim())
			? apiVersion.trim()
			: DEFAULT_API_VERSION;

	const endpoint = `${META_GRAPH_BASE_URL}/${cleanVersion}/${cleanDatasetId}/events`;

	const res = await fetchFn(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${cleanToken}`,
		},
		body: JSON.stringify(payload),
	});

	const rawText = await res.text();
	let parsed;
	try {
		parsed = JSON.parse(rawText);
	} catch {
		parsed = { raw: rawText };
	}

	return {
		ok: res.ok,
		status: res.status,
		endpoint,
		requestPayload: payload,
		response: parsed,
	};
}
