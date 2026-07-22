# LitePuff

Production ecommerce application built with React, Vite, Tailwind CSS, Node.js, Express, and Google Sheets.

## Requirements

- Node.js 20 LTS or newer
- npm 10 or newer
- Google Cloud service account with access to the configured spreadsheet

## Installation

```bash
npm ci
```

Copy `.env.example` to `.env` locally and provide private values. Never commit `.env`.

## Development

```bash
npm run dev
```

The combined development command starts Vite and the Express API. Individual commands are available as `npm run dev:client` and `npm run dev:server`.

## Verification

```bash
npm run test:server
npm run sheets:verify-foundation
npm run build
```

The Sheets verifier uses temporary safe records and cleans them up. Run it only against an account authorized for the target spreadsheet.

## Production

```bash
npm ci
npm run build
npm start
```

Express serves the Vite output from `dist`, the API under `/api`, and uploaded assets under `/uploads`. Client-side routes fall back to `dist/index.html` so browser refresh works.

Required production configuration includes application URLs, four independent authentication secrets, a hashed administrator password, and Google Sheets credentials. SMTP, Meta WhatsApp, Razorpay, Shiprocket, and Delhivery variables are required only when their corresponding production integration is enabled. See [.env.example](.env.example) and [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md).

## Hostinger deployment

1. Use Node.js 20 LTS or newer.
2. Set the application root to this repository directory.
3. Install with `npm ci`.
4. Configure environment variables in Hostinger; do not upload `.env` to GitHub.
5. Build with `npm run build`.
6. Start with `npm start`.
7. Point the domain to the Node application and enable SSL/HTTPS.
8. Ensure `server/uploads` is persistent and writable.
9. Verify `/api/health` and `/api/health/google-sheets`.

## Meta WhatsApp infrastructure

The production webhook callback is `https://litepuff.in/api/webhooks/whatsapp`. Meta verification uses `WHATSAPP_VERIFY_TOKEN`; signed POST events require `META_APP_SECRET` and are validated with `X-Hub-Signature-256` before JSON parsing. Sanitized diagnostics are available at `/api/health/whatsapp`.

Configure these values in Hostinger, never in Git: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_VERIFY_TOKEN`, and `META_APP_SECRET`. Optional operational settings are `META_API_VERSION`, `WHATSAPP_TIMEOUT_MS`, `WHATSAPP_MAX_RETRIES`, and `WHATSAPP_TEMPLATE_LANGUAGE`. Incomplete WhatsApp configuration disables the integration without stopping Express.

See [WHATSAPP_INFRASTRUCTURE.md](WHATSAPP_INFRASTRUCTURE.md) for deployment, Meta configuration, endpoint, and security details.

All backend WhatsApp delivery goes through `WhatsAppMessagingService`. It supports templates, text, image, document/PDF, video, audio, sticker, location, contacts, and interactive payloads with strict E.164 validation, an immediate queue adapter, bounded retries, and delivery lifecycle metadata. Future queue implementations can replace the adapter without changing business modules.

Verified incoming WhatsApp events use `WebhookEventProcessor`, a common message parser, isolated type handlers, rule-based intent classification, and persistent conversation/session repositories. The guarded Google startup check provisions `WHATSAPP_CONVERSATIONS` and `WHATSAPP_SESSIONS` without removing existing sheets; `npm run sheets:sync` remains available for manual synchronization. Session inactivity is controlled by `WHATSAPP_SESSION_TIMEOUT_MINUTES` (default: 30).

Detailed instructions are in [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md).

## Structure

```text
public/                 Static public assets
scripts/                Development and Google Sheets verification scripts
server/config/          Environment, authentication, and worksheet configuration
server/controllers/     HTTP controllers
server/middleware/      Security, authentication, validation, and error middleware
server/routes/          Express API routes
server/services/        Domain and integration services
server/tests/           Backend unit and integration-style tests
server/utils/           Shared backend utilities
src/components/         Reusable React components
src/context/            React application state
src/pages/              Storefront and administration pages
src/routes/             Frontend routing and route guards
src/services/           Frontend API clients
```

## Security

- Secrets are loaded from environment variables.
- `.env`, uploaded files, build output, logs, and editor settings are ignored by Git.
- Authentication uses signed HTTP-only cookies, access/refresh tokens, rotation, and replay protection.
- API middleware provides Helmet headers, CORS validation, rate limiting, sanitization, and standardized errors.

Additional architecture and API documentation is available in the Markdown files at the repository root.
