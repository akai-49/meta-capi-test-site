const SCRIPT_STORAGE_KEY = "meta_pixel_custom_script";

export const STANDARD_EVENTS = [
	{
		name: "PageView",
		summary: "Basic website visit & page loading signal",
		category: "discovery",
		categoryLabel: "Discovery",
		defaultCustomData: {},
	},
	{
		name: "ViewContent",
		summary: "Key product or article detail view",
		category: "ecommerce",
		categoryLabel: "E-Commerce",
		defaultCustomData: { content_type: "product", content_ids: ["SKU-1001"], content_name: "Ultralight Runner", value: 129.99, currency: "USD" },
	},
	{
		name: "Search",
		summary: "Product or site catalog query execution",
		category: "discovery",
		categoryLabel: "Discovery",
		defaultCustomData: { search_string: "running shoes", content_category: "Footwear" },
	},
	{
		name: "AddToCart",
		summary: "Items added to shopping basket",
		category: "ecommerce",
		categoryLabel: "E-Commerce",
		defaultCustomData: { content_type: "product", content_ids: ["SKU-1001"], num_items: 1, value: 129.99, currency: "USD" },
	},
	{
		name: "AddToWishlist",
		summary: "Items saved for future consideration",
		category: "ecommerce",
		categoryLabel: "E-Commerce",
		defaultCustomData: { content_type: "product", content_ids: ["SKU-1001"], value: 129.99, currency: "USD" },
	},
	{
		name: "InitiateCheckout",
		summary: "User started the checkout payment funnel",
		category: "ecommerce",
		categoryLabel: "E-Commerce",
		defaultCustomData: { content_type: "product", content_ids: ["SKU-1001"], num_items: 1, value: 129.99, currency: "USD" },
	},
	{
		name: "AddPaymentInfo",
		summary: "Customer entered billing / credit card credentials",
		category: "ecommerce",
		categoryLabel: "E-Commerce",
		defaultCustomData: { content_type: "product", content_ids: ["SKU-1001"], value: 129.99, currency: "USD" },
	},
	{
		name: "Purchase",
		summary: "Order successfully completed & paid",
		category: "ecommerce",
		categoryLabel: "E-Commerce",
		defaultCustomData: { content_type: "product", content_ids: ["SKU-1001"], num_items: 1, value: 129.99, currency: "USD", order_id: "ORD-9842" },
	},
	{
		name: "Lead",
		summary: "Qualified prospect or contact form captured",
		category: "leads",
		categoryLabel: "Leads",
		defaultCustomData: { content_name: "Inquiry Form", value: 25.0, currency: "USD" },
	},
	{
		name: "CompleteRegistration",
		summary: "New account or profile registration verified",
		category: "leads",
		categoryLabel: "Leads",
		defaultCustomData: { content_name: "Member Signup", status: true, value: 0, currency: "USD" },
	},
	{
		name: "Contact",
		summary: "Inbound message or customer inquiry sent",
		category: "leads",
		categoryLabel: "Leads",
		defaultCustomData: { content_name: "Support Desk" },
	},
	{
		name: "CustomizeProduct",
		summary: "User configured custom attributes (color/size)",
		category: "ecommerce",
		categoryLabel: "E-Commerce",
		defaultCustomData: { content_type: "product", content_ids: ["SKU-1001"] },
	},
	{
		name: "Donate",
		summary: "Non-profit or contribution transaction",
		category: "discovery",
		categoryLabel: "Discovery",
		defaultCustomData: { value: 50.0, currency: "USD" },
	},
	{
		name: "FindLocation",
		summary: "Physical store or dealership lookup",
		category: "discovery",
		categoryLabel: "Discovery",
		defaultCustomData: { search_string: "San Francisco Downtown" },
	},
	{
		name: "Schedule",
		summary: "Demo or consultation appointment booked",
		category: "leads",
		categoryLabel: "Leads",
		defaultCustomData: { content_name: "Strategy Session" },
	},
	{
		name: "StartTrial",
		summary: "Free software or service trial initiated",
		category: "leads",
		categoryLabel: "Leads",
		defaultCustomData: { value: 0, currency: "USD", predicted_ltv: 180.0 },
	},
	{
		name: "SubmitApplication",
		summary: "Credit, job, or partner application sent",
		category: "leads",
		categoryLabel: "Leads",
		defaultCustomData: { content_name: "Partner Application" },
	},
	{
		name: "Subscribe",
		summary: "Recurring subscription agreement started",
		category: "leads",
		categoryLabel: "Leads",
		defaultCustomData: { value: 29.0, currency: "USD", predicted_ltv: 348.0 },
	},
];

let detectedPixelId = null;
let eventCounter = 0;

const els = {
	pixelScriptInput: document.getElementById("cfg-pixel-script"),
	btnApplyScript: document.getElementById("btn-apply-script"),
	btnClearScript: document.getElementById("btn-clear-script"),
	btnSampleScript: document.getElementById("btn-sample-script"),
	scriptFeedback: document.getElementById("script-feedback"),
	editorCharCount: document.getElementById("editor-char-count"),
	pixelStatusPill: document.getElementById("pixel-status-pill"),
	fbpStatusPill: document.getElementById("fbp-status-pill"),
	fbcStatusPill: document.getElementById("fbc-status-pill"),
	logCountBadge: document.getElementById("log-count-badge"),
	eventsGrid: document.getElementById("standard-events-grid"),
	editorEventName: document.getElementById("editor-event-name"),
	editorEventKind: document.getElementById("editor-event-kind"),
	editorEventId: document.getElementById("editor-event-id"),
	editorCustomData: document.getElementById("editor-custom-data"),
	leadForm: document.getElementById("lead-test-form"),
	eventLog: document.getElementById("event-log"),
};

function getCookie(name) {
	const prefix = `${name}=`;
	for (const part of document.cookie.split(";")) {
		const trimmed = part.trim();
		if (trimmed.startsWith(prefix)) {
			return decodeURIComponent(trimmed.slice(prefix.length));
		}
	}
	return "";
}

function getFbcFromUrlOrCookie() {
	const cookieFbc = getCookie("_fbc");
	if (cookieFbc) return cookieFbc;
	const fbclid = new URLSearchParams(window.location.search).get("fbclid");
	if (fbclid) {
		return `fb.1.${Date.now()}.${fbclid}`;
	}
	return "";
}

function refreshCookiePills() {
	const fbp = getCookie("_fbp");
	const fbc = getFbcFromUrlOrCookie();
	if (els.fbpStatusPill) {
		els.fbpStatusPill.innerHTML = `<span class="label">_fbp: ${fbp ? escapeHtml(fbp.slice(0, 15)) + "..." : "none"}</span>`;
		els.fbpStatusPill.className = `status-pill ${fbp ? "status-active" : "status-muted"}`;
	}
	if (els.fbcStatusPill) {
		els.fbcStatusPill.innerHTML = `<span class="label">_fbc: ${fbc ? escapeHtml(fbc.slice(0, 15)) + "..." : "none"}</span>`;
		els.fbcStatusPill.className = `status-pill ${fbc ? "status-active" : "status-muted"}`;
	}
}

function generateEventId() {
	if (window.crypto?.randomUUID) {
		return window.crypto.randomUUID();
	}
	return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractPixelId(codeText) {
	if (!codeText) return null;
	const initMatch = codeText.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i);
	if (initMatch) return initMatch[1];
	const trMatch = codeText.match(/[?&]id=(\d+)/i);
	if (trMatch) return trMatch[1];
	return null;
}

function updatePixelStatus(pixelId = null) {
	if (pixelId) {
		detectedPixelId = pixelId;
		els.pixelStatusPill.className = "status-pill status-active";
		els.pixelStatusPill.innerHTML = `<span class="dot"></span><span class="label">Pixel: ${escapeHtml(pixelId)} Active</span>`;
		return;
	}
	if (window.fbq && typeof window.fbq === "function") {
		els.pixelStatusPill.className = "status-pill status-active";
		els.pixelStatusPill.innerHTML = `<span class="dot"></span><span class="label">Pixel Script Running</span>`;
		return;
	}
	detectedPixelId = null;
	els.pixelStatusPill.className = "status-pill status-muted";
	els.pixelStatusPill.innerHTML = `<span class="dot"></span><span class="label">Pixel: Not Detected</span>`;
}

function executeSnippet(snippet) {
	if (!snippet || !snippet.trim()) return false;
	const trimmed = snippet.trim();
	const id = extractPixelId(trimmed);

	const oldScript = document.getElementById("dynamic-meta-pixel");
	if (oldScript) oldScript.remove();

	const scriptTagMatch = trimmed.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/i);
	const codeToRun = scriptTagMatch ? scriptTagMatch[1] : trimmed;

	try {
		const scriptEl = document.createElement("script");
		scriptEl.id = "dynamic-meta-pixel";
		scriptEl.textContent = codeToRun;
		document.head.appendChild(scriptEl);

		updatePixelStatus(id);
		showFeedback(id ? `Active Pixel initialized for ID ${id}.` : "Meta Pixel script running successfully.", "success");
		setTimeout(refreshCookiePills, 800);
		return true;
	} catch (err) {
		showFeedback(`Script execution error: ${err.message}`, "error");
		return false;
	}
}

function showFeedback(msg, type = "info") {
	if (!els.scriptFeedback) return;
	els.scriptFeedback.textContent = msg;
	els.scriptFeedback.style.color = type === "error" ? "#fca5a5" : type === "success" ? "#6ee7b7" : "#93c5fd";
}

function readFormUserData() {
	const fd = new FormData(els.leadForm);
	const raw = {
		fn: String(fd.get("first_name") || "").trim(),
		ln: String(fd.get("last_name") || "").trim(),
		em: String(fd.get("email") || "").trim(),
		ph: String(fd.get("phone") || "").trim(),
		ct: String(fd.get("city") || "").trim(),
		st: String(fd.get("state") || "").trim(),
		zp: String(fd.get("zip") || "").trim(),
		country: String(fd.get("country") || "").trim(),
		ge: String(fd.get("gender") || "").trim(),
		db: String(fd.get("dob") || "").trim(),
		external_id: String(fd.get("external_id") || "").trim(),
	};
	const cleaned = {};
	for (const [k, v] of Object.entries(raw)) {
		if (v) cleaned[k] = v;
	}
	return cleaned;
}

function appendLogEntry({ eventName, eventId, status, details, error }) {
	const empty = els.eventLog.querySelector(".empty-state");
	if (empty) empty.remove();

	eventCounter++;
	if (els.logCountBadge) {
		els.logCountBadge.textContent = String(eventCounter);
	}

	const isOk = !error;
	const entry = document.createElement("div");
	entry.className = `log-item ${isOk ? "is-ok" : "is-err"}`;

	const time = new Date().toLocaleTimeString();
	const statusBadge = isOk
		? `<span class="chip-status is-ok">${escapeHtml(status || "fbq sent")}</span>`
		: `<span class="chip-status is-err">${escapeHtml(status || "Error")}</span>`;

	const detailObj = {
		eventName,
		eventId,
		status,
		timestamp: new Date().toISOString(),
		...(details || {}),
		...(error ? { error } : {}),
	};

	entry.innerHTML = `
		<div class="log-item-header">
			<span class="log-event-name">${escapeHtml(eventName)}</span>
			<span class="log-timestamp">${escapeHtml(time)}</span>
		</div>
		<div class="log-badges">
			${statusBadge}
		</div>
		<div class="log-id-row">
			<span>event_id: <code>${escapeHtml(eventId)}</code></span>
			<button type="button" class="copy-btn" data-copy="${escapeHtml(eventId)}">Copy ID</button>
		</div>
		<details class="payload-details">
			<summary>Inspect Signal Payload</summary>
			<pre>${escapeHtml(JSON.stringify(detailObj, null, 2))}</pre>
		</details>
	`;

	const copyBtn = entry.querySelector(".copy-btn");
	if (copyBtn) {
		copyBtn.addEventListener("click", () => {
			navigator.clipboard?.writeText(eventId).then(() => {
				copyBtn.textContent = "Copied!";
				setTimeout(() => { copyBtn.textContent = "Copy ID"; }, 1500);
			});
		});
	}

	els.eventLog.prepend(entry);
	refreshCookiePills();
}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function dispatchEvent({ eventName, eventKind = "standard", customData = {}, eventIdOverride = "" }) {
	const eventId = eventIdOverride.trim() || generateEventId();

	if (!window.fbq || typeof window.fbq !== "function") {
		appendLogEntry({
			eventName,
			eventId,
			status: "Pixel not loaded",
			error: "Meta Pixel script is not active. Paste your snippet into the editor above and click 'Apply & Run Script'.",
		});
		showFeedback("Pixel script not loaded. Apply snippet above first.", "error");
		return;
	}

	const method = eventKind === "custom" ? "trackCustom" : "track";
	try {
		window.fbq(method, eventName, customData, { eventID: eventId });
		appendLogEntry({
			eventName,
			eventId,
			status: `fbq('${method}', '${eventName}')`,
			details: { method, eventName, customData },
		});
	} catch (err) {
		appendLogEntry({
			eventName,
			eventId,
			status: "Execution error",
			error: err.message,
		});
	}
}

function renderStandardEvents(filterCategory = "all") {
	els.eventsGrid.innerHTML = "";
	const list = filterCategory === "all"
		? STANDARD_EVENTS
		: STANDARD_EVENTS.filter((e) => e.category === filterCategory);

	for (const evt of list) {
		const card = document.createElement("div");
		card.className = "event-card";
		card.setAttribute("role", "button");
		card.setAttribute("tabindex", "0");
		card.dataset.category = evt.category;
		card.innerHTML = `
			<div class="event-card-content">
				<div class="event-card-top">
					<span class="event-category-tag tag-${escapeHtml(evt.category)}">${escapeHtml(evt.categoryLabel)}</span>
				</div>
				<div class="event-card-title">${escapeHtml(evt.name)}</div>
				<div class="event-card-desc">${escapeHtml(evt.summary)}</div>
			</div>
			<div class="event-card-footer">
				<span class="event-card-arrow">Fire &rarr;</span>
			</div>
		`;

		const trigger = () => {
			els.editorEventName.value = evt.name;
			els.editorEventKind.value = "standard";
			els.editorCustomData.value = JSON.stringify(evt.defaultCustomData, null, 2);
			dispatchEvent({
				eventName: evt.name,
				eventKind: "standard",
				customData: evt.defaultCustomData,
				eventIdOverride: els.editorEventId.value,
			});
		};

		card.addEventListener("click", trigger);
		card.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				trigger();
			}
		});
		els.eventsGrid.appendChild(card);
	}
}

function bindTabs() {
	const tabs = document.querySelectorAll(".nav-tab");
	const panels = document.querySelectorAll(".tab-panel");
	for (const tab of tabs) {
		tab.addEventListener("click", () => {
			const targetId = tab.dataset.tab;
			for (const t of tabs) {
				const active = t === tab;
				t.classList.toggle("is-active", active);
				t.setAttribute("aria-selected", String(active));
			}
			for (const p of panels) {
				const active = p.id === targetId;
				p.classList.toggle("is-active", active);
				p.hidden = !active;
			}
		});
	}
}

function bindCategoryFilters() {
	const chips = document.querySelectorAll(".category-filters .chip");
	for (const chip of chips) {
		chip.addEventListener("click", () => {
			for (const c of chips) c.classList.remove("is-active");
			chip.classList.add("is-active");
			renderStandardEvents(chip.dataset.filter);
		});
	}
}

function bindPresetLinks() {
	const links = document.querySelectorAll("[data-preset]");
	for (const link of links) {
		link.addEventListener("click", () => {
			const key = link.dataset.preset;
			let match;
			if (key === "purchase") match = STANDARD_EVENTS.find((e) => e.name === "Purchase");
			else if (key === "lead") match = STANDARD_EVENTS.find((e) => e.name === "Lead");
			else if (key === "view") match = STANDARD_EVENTS.find((e) => e.name === "ViewContent");

			if (match) {
				els.editorEventName.value = match.name;
				els.editorEventKind.value = "standard";
				els.editorCustomData.value = JSON.stringify(match.defaultCustomData, null, 2);
			}
		});
	}
}

function updateMicrodataPreview() {
	const id = document.getElementById("funnel-product-id").value.trim() || "SKU-NEO-PRO";
	const name = document.getElementById("funnel-product-name").value.trim() || "Ultralight Performance Runner";
	const category = document.getElementById("funnel-category").value.trim() || "Footwear / Athletics";
	const price = document.getElementById("funnel-price").value.trim() || "129.99";
	const currency = (document.getElementById("funnel-currency").value.trim() || "USD").toUpperCase();

	document.getElementById("md-id").setAttribute("content", id);
	document.getElementById("md-name").textContent = name;
	document.getElementById("md-category").textContent = category;
	document.getElementById("md-price").textContent = price;
	document.getElementById("md-currency").textContent = currency;
}

function getFunnelCustomData(eventName) {
	const productId = document.getElementById("funnel-product-id").value.trim() || "SKU-NEO-PRO";
	const productName = document.getElementById("funnel-product-name").value.trim();
	const category = document.getElementById("funnel-category").value.trim();
	const price = Number(document.getElementById("funnel-price").value) || 129.99;
	const currency = (document.getElementById("funnel-currency").value.trim() || "USD").toUpperCase();
	const qty = Math.max(1, Number(document.getElementById("funnel-qty").value) || 1);
	const search = document.getElementById("funnel-search")?.value?.trim() || "";
	const orderId = document.getElementById("funnel-order-id").value.trim() || `ORD-${Date.now()}`;

	if (eventName === "Search") {
		return {
			search_string: search || productName || "shoes",
			...(category ? { content_category: category } : {}),
		};
	}

	const data = {
		content_type: "product",
		content_ids: [productId],
		...(productName ? { content_name: productName } : {}),
		...(category ? { content_category: category } : {}),
		num_items: qty,
		value: Number((price * qty).toFixed(2)),
		currency,
	};

	if (eventName === "Purchase") {
		data.order_id = orderId;
	}
	return data;
}

function wireEvents() {
	els.btnApplyScript.addEventListener("click", () => {
		const snippet = els.pixelScriptInput.value.trim();
		if (!snippet) {
			showFeedback("Paste your Meta Pixel snippet (<script>...) first.", "error");
			return;
		}
		localStorage.setItem(SCRIPT_STORAGE_KEY, snippet);
		executeSnippet(snippet);
	});

	els.btnClearScript.addEventListener("click", () => {
		localStorage.removeItem(SCRIPT_STORAGE_KEY);
		els.pixelScriptInput.value = "";
		const oldScript = document.getElementById("dynamic-meta-pixel");
		if (oldScript) oldScript.remove();
		updatePixelStatus(null);
		showFeedback("Cleared stored Meta Pixel script.", "info");
	});

	if (els.btnSampleScript) {
		els.btnSampleScript.addEventListener("click", () => {
			const template = `<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '123456789012345');\nfbq('track', 'PageView');\n<\/script>`;
			els.pixelScriptInput.value = template;
			showFeedback("Demo template loaded. Click 'Apply & Run Script' to activate.", "info");
		});
	}

	document.getElementById("btn-fire-all").addEventListener("click", async () => {
		if (!window.fbq) {
			showFeedback("Please apply your Meta Pixel snippet first.", "error");
			return;
		}
		showFeedback("Firing all 18 standard events...", "info");
		for (const evt of STANDARD_EVENTS) {
			dispatchEvent({
				eventName: evt.name,
				eventKind: "standard",
				customData: evt.defaultCustomData,
			});
			await new Promise((resolve) => setTimeout(resolve, 180));
		}
		showFeedback("Dispatched all 18 standard events successfully.", "success");
	});

	document.getElementById("btn-fire-editor").addEventListener("click", () => {
		let parsedCustomData = {};
		const rawJson = els.editorCustomData.value.trim();
		if (rawJson) {
			try {
				parsedCustomData = JSON.parse(rawJson);
			} catch (err) {
				showFeedback(`Invalid custom_data JSON: ${err.message}`, "error");
				return;
			}
		}
		dispatchEvent({
			eventName: els.editorEventName.value.trim(),
			eventKind: els.editorEventKind.value,
			customData: parsedCustomData,
			eventIdOverride: els.editorEventId.value,
		});
	});

	document.getElementById("btn-fire-custom").addEventListener("click", () => {
		els.editorEventKind.value = "custom";
		if (!els.editorEventName.value.trim() || STANDARD_EVENTS.some((e) => e.name === els.editorEventName.value.trim())) {
			els.editorEventName.value = "CustomMilestone";
		}
		els.editorCustomData.value = JSON.stringify({ milestone_level: 2, badge_unlocked: "pro_tester" }, null, 2);
		showFeedback("Custom event preset configured.", "info");
	});

	els.leadForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const fd = new FormData(els.leadForm);
		const eventName = String(fd.get("form_event_name") || "Lead");
		const eventId = generateEventId();
		const value = Number(fd.get("value"));
		const currency = String(fd.get("currency") || "").trim().toUpperCase();
		const customData = {
			content_name: "Lead Form Submission",
			...(Number.isFinite(value) && fd.get("value") !== "" ? { value } : {}),
			...(currency ? { currency } : {}),
		};

		if (window.fbq && typeof window.fbq === "function") {
			window.fbq("track", eventName, customData, { eventID: eventId });
		}

		let submitStatus = `fbq('${eventName}') sent`;
		let submitError = null;
		try {
			const formFields = Object.fromEntries(fd.entries());
			const res = await fetch("/api/form-submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sendCapi: false,
					eventName,
					eventId,
					eventSourceUrl: window.location.href,
					formFields,
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				submitError = data.error || `HTTP ${res.status}`;
			}
		} catch (err) {
			submitError = err.message;
		}

		appendLogEntry({
			eventName: `Form Submit &bull; ${eventName}`,
			eventId,
			status: submitError ? "Form API Error" : `${submitStatus} + Stored`,
			details: {
				formEvent: eventName,
				pixelActive: Boolean(window.fbq),
				submittedFields: Object.fromEntries(fd.entries()),
			},
			error: submitError,
		});
	});

	document.getElementById("btn-sync-user-data").addEventListener("click", () => {
		if (!window.fbq || !detectedPixelId) {
			showFeedback("Pixel script must be loaded with an initialized Pixel ID first.", "error");
			return;
		}
		const userData = readFormUserData();
		window.fbq("init", detectedPixelId, userData);
		showFeedback("Synchronized form fields to Meta Pixel Advanced Matching.", "success");
	});

	for (const id of ["funnel-product-id", "funnel-product-name", "funnel-category", "funnel-price", "funnel-currency"]) {
		const el = document.getElementById(id);
		if (el) el.addEventListener("input", updateMicrodataPreview);
	}

	for (const btn of document.querySelectorAll("[data-funnel-event]")) {
		btn.addEventListener("click", () => {
			const eventName = btn.dataset.funnelEvent;
			dispatchEvent({
				eventName,
				eventKind: "standard",
				customData: getFunnelCustomData(eventName),
			});
		});
	}

	document.getElementById("btn-clear-log").addEventListener("click", () => {
		els.eventLog.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h.01"></path><path d="M7 20v-4"></path><path d="M12 20v-8"></path><path d="M17 20V8"></path><path d="M22 4v16"></path></svg></div><p>Log cleared.</p><small>Trigger any event to resume real-time signal stream.</small></div>';
		eventCounter = 0;
		if (els.logCountBadge) els.logCountBadge.textContent = "0";
	});

	wireArchitectureDiagram();
}

function wireArchitectureDiagram() {
	const nodeDetails = {
		dom: {
			tier: "Client Environment",
			title: "DOM User Interactions",
			desc: "User interactions (button clicks, funnel stage progress, checkout submissions) initiate the event lifecycle. Client JavaScript captures these synchronously and attaches contextual event parameters.",
			keys: "click, submit, change, DOMContentLoaded",
			window: "Immediate / Synchronous",
			cookies: "Local DOM Scope",
			privacy: "Raw Form Inputs",
		},
		pixel: {
			tier: "Client SDK",
			title: "Meta Pixel (fbevents.js / fbq)",
			desc: "Meta's official client library queues and issues fbq('track', eventName, payload, { eventID }) calls. It automatically reads and sends browser first-party cookies (_fbp and _fbc).",
			keys: "fbq('track'), fbq('trackCustom')",
			window: "Active Session",
			cookies: "_fbp, _fbc (First Party Cookie)",
			privacy: "Browser Cookie Sandboxing",
		},
		dispatch: {
			tier: "Client Pipeline",
			title: "Dual-Signal Dispatcher & Event ID Stager",
			desc: "Critical for deduplication: the client generates a cryptographic UUID v4 (event_id) and attaches the exact same event_id to both the browser fbq() call and the backend CAPI payload.",
			keys: "event_id, event_name, event_time",
			window: "Exact Match Pairing",
			cookies: "Preserves _fbp & _fbc state",
			privacy: "Zero Collision Guarantee",
		},
		"edge-ingest": {
			tier: "Cloudflare Edge",
			title: "API Endpoint Ingestion (/api/capi/send)",
			desc: "Zero-latency Cloudflare Edge Worker accepts the payload, authenticates origin security headers, parses JSON parameters, and forwards to the cryptographic normalization pipeline.",
			keys: "POST /api/capi/send, POST /api/form-submit",
			window: "< 15ms Edge Execution",
			cookies: "Header & Body Extraction",
			privacy: "Zero Client Credential Leakage",
		},
		hasher: {
			tier: "Edge Security",
			title: "PII Normalizer & SHA-256 Hasher",
			desc: "Normalizes user data according to Meta's strict rules (trim whitespace, lowercase emails, strip symbols from phone numbers) and produces standard SHA-256 hexadecimal digests.",
			keys: "em, ph, fn, ln, ct, st, zp, country",
			window: "Pre-Flight Cryptography",
			cookies: "Technical cookies kept raw",
			privacy: "One-Way Hash (Unreversible)",
		},
		enrich: {
			tier: "Edge Context",
			title: "Edge Context Enrichment",
			desc: "Extracts CF-Connecting-IP and User-Agent headers, formats timestamps in Unix epoch seconds, and appends test_event_code when testing via Meta Events Manager.",
			keys: "client_ip_address, client_user_agent",
			window: "Request-Scoped Header Context",
			cookies: "cf-connecting-ip passthrough",
			privacy: "Compliant IP Anonymization",
		},
		"capi-ingest": {
			tier: "Meta Cloud",
			title: "Meta Graph API (Conversions API)",
			desc: "Meta's enterprise endpoint graph.facebook.com/v21.0/{dataset_id}/events accepts authenticated JSON payloads via Bearer tokens, providing server-level delivery reliability unaffected by ad blockers.",
			keys: "POST /v21.0/{dataset_id}/events",
			window: "Direct Server-to-Server",
			cookies: "_fbp and _fbc in user_data",
			privacy: "TLS 1.3 Encrypted Transit",
		},
		dedup: {
			tier: "Focal Component",
			title: "Meta Event Deduplication Engine",
			desc: "When both Meta Pixel (client) and Conversions API (server) send the same user interaction, Meta matches them using event_name and event_id within a 48-hour window. It records one conversion and merges signals for maximum Match Quality.",
			keys: "event_name + event_id",
			window: "48-Hour Deduplication Window",
			cookies: "Matched across Browser & Server",
			privacy: "Cryptographic Single-Counting",
		},
		emq: {
			tier: "Analytics & Optimization",
			title: "Dataset Attribution & Event Match Quality",
			desc: "Events Manager computes an Event Match Quality (EMQ) score from 1 to 10 based on matched identifiers (email, phone, fbp, fbc, IP). High EMQ significantly reduces Cost Per Acquisition (CPA).",
			keys: "EMQ Score (0 - 10), Matched Rate",
			window: "Continuous Attribution Model",
			cookies: "First-Party Attribution",
			privacy: "Aggregated Event Measurement",
		},
	};

	for (const nodeEl of document.querySelectorAll(".diagram-node")) {
		nodeEl.addEventListener("click", () => {
			const key = nodeEl.dataset.node;
			const info = nodeDetails[key];
			if (!info) return;

			for (const n of document.querySelectorAll(".diagram-node")) {
				n.classList.remove("is-selected");
			}
			nodeEl.classList.add("is-selected");

			const inspector = document.getElementById("arch-inspector-box");
			if (inspector) {
				inspector.querySelector("#arch-info-tier").textContent = info.tier;
				inspector.querySelector("#arch-info-title").textContent = info.title;
				inspector.querySelector("#arch-info-desc").textContent = info.desc;
				const metaGrid = inspector.querySelector(".arch-meta-grid");
				if (metaGrid) {
					metaGrid.innerHTML = `
						<div class="meta-card">
							<span class="meta-label">Primary Keys</span>
							<code class="meta-code">${escapeHtml(info.keys)}</code>
						</div>
						<div class="meta-card">
							<span class="meta-label">Timing</span>
							<code class="meta-code">${escapeHtml(info.window)}</code>
						</div>
						<div class="meta-card">
							<span class="meta-label">Identifier Handling</span>
							<code class="meta-code">${escapeHtml(info.cookies)}</code>
						</div>
						<div class="meta-card">
							<span class="meta-label">Privacy &amp; Security</span>
							<code class="meta-code">${escapeHtml(info.privacy)}</code>
						</div>
					`;
				}
			}
		});
	}
}

function initOnStartup() {
	renderStandardEvents();
	bindTabs();
	bindCategoryFilters();
	bindPresetLinks();
	wireEvents();
	refreshCookiePills();
	updateMicrodataPreview();

	if (els.editorCustomData) {
		els.editorCustomData.value = JSON.stringify(STANDARD_EVENTS.find((e) => e.name === "Purchase").defaultCustomData, null, 2);
	}

	const headCode = document.getElementById("embedded-meta-pixel")?.textContent || "";
	const embeddedId = extractPixelId(headCode);
	if (embeddedId || (window.fbq && typeof window.fbq === "function")) {
		updatePixelStatus(embeddedId);
		showFeedback(embeddedId ? `Meta Pixel ${embeddedId} detected from <head>.` : "Meta Pixel script detected in page.", "success");
		return;
	}

	const savedSnippet = localStorage.getItem(SCRIPT_STORAGE_KEY);
	if (savedSnippet) {
		els.pixelScriptInput.value = savedSnippet;
		executeSnippet(savedSnippet);
	}
}

initOnStartup();
