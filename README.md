# Meta Pixel & Dataset Test Lab

Standalone web app (runs locally on Node.js or on **Cloudflare Workers + Static Assets**) to test:
- **Direct Meta Pixel script integration (`<script>...</script>`)**: Paste your official Meta Pixel snippet directly into `<head>` or into the on-page script box. No manual Pixel ID or API Token form fields on the website.
- **Automatic detection**: Detects `fbq`, extracts the Pixel ID, initializes cookies (`_fbp`, `_fbc`), and enables Advanced Matching.
- **All 18 Meta Standard Events & Custom Events**: Click any event tile (`PageView`, `ViewContent`, `AddToCart`, `Purchase`, `Lead`, `Subscribe`, etc.) or fire all 18 events with one click.
- **Form Submission**: Real HTML form submission (`POST /api/form-submit`) triggering Meta `Lead` / `CompleteRegistration` / `Contact` events with semantic form inputs for the Event Setup Tool.
- **E-Commerce Funnel & Microdata**: Step through the shopping funnel with live Schema.org `Product` microdata tags on the page.
- **Live Event Log**: Inspect all event fires, event IDs, and custom data payloads in real time.

## Run Locally (Node.js)

```bash
cd /Users/abhishek/Frappe/meta-capi-test-site
PORT=4321 npm start
```

Open `http://localhost:4321`.

## How to Add the Meta Pixel Script

1. **Option A (In the UI)**: Open `http://localhost:4321`, paste your `<!-- Meta Pixel Code --> <script>...</script>` into the "Meta Pixel Script" box, and click **Apply & Run Script**. (Saved in browser storage so it persists across refreshes).
2. **Option B (Direct in HTML)**: Paste your snippet inside `<head>` in `public/index.html` under the `<!-- META PIXEL BASE SCRIPT -->` comment. The site detects it automatically on load.

## Host on Vercel

Configured for **Vercel Edge Static CDN + Serverless API Functions** ([vercel.json](vercel.json) and [api/[...path].js](api/[...path].js)):

```bash
# Deploy to production on Vercel
npx vercel --prod
```

## Host on Cloudflare Workers + Static Assets

Uses [wrangler.jsonc](wrangler.jsonc) and [worker.js](worker.js) with Cloudflare Workers Static Assets (`./public/`):

```bash
cd /Users/abhishek/Frappe/meta-capi-test-site
npm run cf:dev       # Local Workers runtime preview
npm run cf:dry-run   # Validate bundle + config without deploying
npx wrangler login   # Authenticate with Cloudflare once
npm run cf:deploy    # Deploy to *.workers.dev (or custom domain)
```

## Features

- **Direct Meta Pixel script integration (`<script>...</script>`)**: Paste your official Meta Pixel snippet directly into `<head>` or into the on-page script box. No manual Pixel ID or API Token form fields on the website.
- **Automatic detection**: Detects `fbq`, extracts the Pixel ID, initializes cookies (`_fbp`, `_fbc`), and enables Advanced Matching.
- **All 18 Meta Standard Events & Custom Events**: Click any event tile (`PageView`, `ViewContent`, `AddToCart`, `Purchase`, `Lead`, `Subscribe`, etc.) or fire all 18 events with one click.
- **Dual-Signal Architecture & Deduplication Pipeline**: Visual interactive SVG diagram created with `diagram-design` principles illustrating the 3-zone lifecycle (Client Browser, Cloudflare/Vercel Edge Ingestion, Meta Cloud 48h Deduplication Engine).
- **Form Submission**: Real HTML form submission (`POST /api/form-submit`) triggering Meta `Lead` / `CompleteRegistration` / `Contact` events with semantic form inputs for the Event Setup Tool.
- **E-Commerce Funnel & Microdata**: Step through the shopping funnel with live Schema.org `Product` microdata tags on the page.
- **Live Event Log**: Inspect all event fires, event IDs, and custom data payloads in real time with copyable `event_id`s.

## Tests

```bash
cd /Users/abhishek/Frappe/meta-capi-test-site
npm test
```
