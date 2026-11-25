import assert from "node:assert/strict";
import test from "node:test";
import {
	buildCapiEvent,
	buildCapiPayload,
	normalizeAndHashUserData,
	normalizeUserField,
	sendToMetaCapi,
	sha256,
} from "../capi.js";
import { dispatchApiRoute } from "../routes.js";
import vercelHandler from "../api/[...path].js";
import worker from "../worker.js";

test("normalizeUserField handles Meta CAPI normalization rules and edge cases", () => {
	assert.equal(normalizeUserField("em", "  Alice.Smith@Example.COM  "), "alice.smith@example.com");
	assert.equal(normalizeUserField("ph", "+1 (415) 555-0199"), "14155550199");
	assert.equal(normalizeUserField("ph", "0091-98765 43210"), "919876543210");
	assert.equal(normalizeUserField("ct", "San Francisco!"), "sanfrancisco");
	assert.equal(normalizeUserField("st", "CA "), "ca");
	assert.equal(normalizeUserField("zp", " 94105 "), "94105");
	assert.equal(normalizeUserField("country", "USA"), "us");
	assert.equal(normalizeUserField("ge", "Female"), "f");
	assert.equal(normalizeUserField("ge", "male"), "m");
	assert.equal(normalizeUserField("ge", "other"), "");
	assert.equal(normalizeUserField("db", "1992-05-14"), "19920514");
	assert.equal(normalizeUserField("db", "1992"), "");
	assert.equal(normalizeUserField("em", ""), "");
	assert.equal(normalizeUserField("em", null), "");
});

test("normalizeAndHashUserData hashes PII as single-element arrays and keeps technical fields raw", () => {
	const result = normalizeAndHashUserData(
		{
			em: " User@Example.com ",
			ph: "+1 650 555 1234",
			fn: "Jane",
			fbp: "fb.1.1700000000.123456",
			fbc: "fb.1.1700000000.AbCdEf",
		},
		{ clientIp: "203.0.113.10", userAgent: "Mozilla/5.0" },
	);

	assert.deepEqual(result.em, [sha256("user@example.com")]);
	assert.deepEqual(result.ph, [sha256("16505551234")]);
	assert.deepEqual(result.fn, [sha256("jane")]);
	assert.equal(result.fbp, "fb.1.1700000000.123456");
	assert.equal(result.fbc, "fb.1.1700000000.AbCdEf");
	assert.equal(result.client_ip_address, "203.0.113.10");
	assert.equal(result.client_user_agent, "Mozilla/5.0");
});

test("buildCapiEvent and buildCapiPayload include test_event_code only when non-empty", () => {
	const evt = buildCapiEvent({
		eventName: "Purchase",
		eventId: "dedup-123",
		eventTime: 1732470000,
		eventSourceUrl: "http://localhost:4321/",
		actionSource: "website",
		userData: { em: "buyer@example.com" },
		customData: { value: 49, currency: "USD", emptyField: "" },
	});

	assert.equal(evt.event_name, "Purchase");
	assert.equal(evt.event_id, "dedup-123");
	assert.equal(evt.event_time, 1732470000);
	assert.deepEqual(evt.custom_data, { value: 49, currency: "USD" });

	const withTest = buildCapiPayload({ events: [evt], testEventCode: " TEST999 " });
	assert.equal(withTest.test_event_code, "TEST999");

	const withoutTest = buildCapiPayload({ events: [evt], testEventCode: "   " });
	assert.equal("test_event_code" in withoutTest, false);
});

test("buildCapiEvent and buildCapiPayload reject invalid inputs", () => {
	assert.throws(() => buildCapiEvent({ eventName: "  " }), /eventName is required/);
	assert.throws(() => buildCapiPayload({ events: [] }), /At least one event/);
});

test("sendToMetaCapi validates inputs and sends Bearer token to Graph API without leaking token", async () => {
	let capturedUrl = "";
	let capturedOpts = null;
	const mockFetch = async (url, opts) => {
		capturedUrl = url;
		capturedOpts = opts;
		return {
			ok: true,
			status: 200,
			text: async () => JSON.stringify({ events_received: 1, fbtrace_id: "trace_1" }),
		};
	};

	const payload = buildCapiPayload({
		events: [buildCapiEvent({ eventName: "Lead", eventId: "evt-1" })],
		testEventCode: "TEST1",
	});

	const res = await sendToMetaCapi({
		datasetId: "123456789012345",
		accessToken: "secret-token",
		apiVersion: "v26.0",
		payload,
		fetchFn: mockFetch,
	});

	assert.equal(capturedUrl, "https://graph.facebook.com/v26.0/123456789012345/events");
	assert.equal(capturedOpts.headers.Authorization, "Bearer secret-token");
	assert.equal(res.ok, true);
	assert.equal(res.response.events_received, 1);
	assert.equal(JSON.stringify(res).includes("secret-token"), false);

	await assert.rejects(
		() => sendToMetaCapi({ datasetId: "not-numeric", accessToken: "t", payload, fetchFn: mockFetch }),
		/numeric Meta Dataset/,
	);
	await assert.rejects(
		() => sendToMetaCapi({ datasetId: "1234567890", accessToken: "", payload, fetchFn: mockFetch }),
		/accessToken is required/,
	);
});

test("dispatchApiRoute handles health, form-submit, batch, and error statuses", async () => {
	assert.equal(
		await dispatchApiRoute({ method: "GET", pathname: "/", readBody: async () => ({}) }),
		null,
	);

	const health = await dispatchApiRoute({
		method: "GET",
		pathname: "/api/health",
		readBody: async () => ({}),
	});
	assert.equal(health.status, 200);
	assert.equal(health.data.ok, true);

	const wrongMethod = await dispatchApiRoute({
		method: "POST",
		pathname: "/api/health",
		readBody: async () => ({}),
	});
	assert.equal(wrongMethod.status, 405);

	const formNoCapi = await dispatchApiRoute({
		method: "POST",
		pathname: "/api/form-submit",
		readBody: async () => ({
			sendCapi: false,
			eventName: "Lead",
			eventId: "form-1",
			formFields: { email: "user@example.com" },
		}),
	});
	assert.equal(formNoCapi.status, 200);
	assert.equal(formNoCapi.data.submission.eventId, "form-1");
	assert.equal(formNoCapi.data.capi, null);

	const upstreamFail = await dispatchApiRoute({
		method: "POST",
		pathname: "/api/capi/batch",
		readBody: async () => ({
			datasetId: "1234567890",
			accessToken: "tok",
			events: [{ eventName: "ViewContent" }],
		}),
		clientIp: "198.51.100.2",
		userAgent: "TestAgent",
		sendFn: async ({ payload }) => {
			assert.equal(payload.data[0].user_data.client_ip_address, "198.51.100.2");
			return { ok: false, status: 400, endpoint: "mock", requestPayload: payload, response: { error: "bad" } };
		},
	});
	assert.equal(upstreamFail.status, 502);
	assert.equal(upstreamFail.data.ok, false);
});

test("Cloudflare worker delegates static requests to ASSETS and handles API edge cases", async () => {
	let assetCalled = false;
	const mockEnv = {
		ASSETS: {
			async fetch(req) {
				assetCalled = true;
				return new Response(`asset:${new URL(req.url).pathname}`, { status: 200 });
			},
		},
	};

	const assetRes = await worker.fetch(new Request("https://example.workers.dev/styles.css"), mockEnv);
	assert.equal(assetCalled, true);
	assert.equal(await assetRes.text(), "asset:/styles.css");

	const healthRes = await worker.fetch(new Request("https://example.workers.dev/api/health"), mockEnv);
	assert.equal(healthRes.status, 200);
	assert.deepEqual(await healthRes.json(), { ok: true, service: "meta-capi-test-site" });

	const badJsonRes = await worker.fetch(
		new Request("https://example.workers.dev/api/capi/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{not-json",
		}),
		mockEnv,
	);
	assert.equal(badJsonRes.status, 400);

	const oversizedRes = await worker.fetch(
		new Request("https://example.workers.dev/api/capi/send", {
			method: "POST",
			headers: { "Content-Type": "application/json", "Content-Length": String(2 * 1024 * 1024) },
			body: "{}",
		}),
		mockEnv,
	);
	assert.equal(oversizedRes.status, 400);
});

test("Vercel serverless catch-all handler dispatches API routes correctly", async () => {
	function createMockRes() {
		return {
			statusCode: 200,
			headers: {},
			data: null,
			setHeader(k, v) {
				this.headers[k.toLowerCase()] = v;
			},
			status(code) {
				this.statusCode = code;
				return this;
			},
			json(obj) {
				this.data = obj;
				return this;
			},
			end(str) {
				this.data = JSON.parse(str);
				return this;
			},
		};
	}

	// 1. Health check
	const healthReq = {
		method: "GET",
		url: "/api/health",
		headers: { host: "meta-capi.vercel.app" },
	};
	const healthRes = createMockRes();
	await vercelHandler(healthReq, healthRes);
	assert.equal(healthRes.statusCode, 200);
	assert.deepEqual(healthRes.data, { ok: true, service: "meta-capi-test-site" });

	// 2. Bad route 404
	const missingReq = {
		method: "GET",
		url: "/api/nonexistent",
		headers: { host: "meta-capi.vercel.app" },
	};
	const missingRes = createMockRes();
	await vercelHandler(missingReq, missingRes);
	assert.equal(missingRes.statusCode, 404);

	// 3. Post to form-submit
	const sendReq = {
		method: "POST",
		url: "/api/form-submit",
		headers: {
			host: "meta-capi.vercel.app",
			"x-forwarded-for": "198.51.100.1, 10.0.0.1",
			"user-agent": "Mozilla/5.0 Test",
		},
		body: {
			sendCapi: false,
			eventName: "Lead",
			eventId: "v-evt-123",
			formFields: { email: "user@example.com" },
		},
	};
	const sendRes = createMockRes();
	await vercelHandler(sendReq, sendRes);
	assert.equal(sendRes.statusCode, 200);
	assert.equal(sendRes.data.ok, true);
	assert.equal(sendRes.data.submission.eventId, "v-evt-123");
});
