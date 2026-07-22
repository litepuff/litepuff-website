# WhatsApp Business Platform Infrastructure

This phase provides the secure Meta WhatsApp Cloud API foundation. It verifies Meta webhooks, validates request signatures, classifies incoming events, exposes integration health, and preserves the existing outbound OTP provider. It does not implement conversations, chatbots, notifications, marketing, media, or event business logic.

Phase 2 adds a centralized outbound messaging platform. It supports reusable builders, templates, media, interactive payloads, validation, delivery state, retries, and an adapter-neutral queue. It still does not process conversations or execute webhook business logic.

Phase 3 adds verified incoming-event processing, normalized message parsing, rule-based intent classification, customer lookup, conversation routing, and persistent WhatsApp conversation sessions. It does not send automated replies and contains no AI, campaign, admin, or analytics implementation.

## Architecture

```text
Meta GET challenge -> /api/webhooks/whatsapp -> WhatsAppWebhookController -> WhatsAppWebhookService
Meta POST event    -> raw body -> X-Hub-Signature-256 middleware -> controller -> service -> classify/log/acknowledge
Health request     -> /api/health/whatsapp -> WhatsAppHealthService -> singleton MetaClient
Outbound OTP       -> AuthService -> WhatsAppOTPProvider -> singleton MetaClient -> Graph API
Any outbound module -> WhatsAppMessagingService -> builders/validation -> queue -> retry -> singleton MetaClient
Verified incoming event -> WebhookEventProcessor -> MessageParserService -> IncomingMessageService -> ConversationEngine
ConversationEngine -> customer/session lookup -> isolated message handler -> Google Sheets conversation state
```

`server/config/WhatsAppConfig.js` is the only WhatsApp component that reads environment variables. Invalid or incomplete WhatsApp configuration disables the integration but never terminates Express.

## Environment variables

Required for the complete integration:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
META_APP_SECRET=
```

Configuration with production-safe defaults:

```env
META_API_VERSION=v23.0
WHATSAPP_TIMEOUT_MS=10000
WHATSAPP_MAX_RETRIES=2
WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

The verify token is a private, high-entropy value chosen by LitePuff. Enter the identical value in Hostinger and Meta. `META_APP_SECRET` is the App Secret from Meta App Settings. Never commit either value.

## Endpoints

- `GET /api/webhooks/whatsapp` — Meta subscription challenge.
- `POST /api/webhooks/whatsapp` — signed Meta events. Requires `X-Hub-Signature-256`.
- `GET /api/health/whatsapp` — sanitized configuration and connection diagnostics.

## Messaging API

Backend modules import the singleton `whatsAppMessagingService` and call one of:

```text
sendTemplate   sendText       sendImage      sendDocument
sendVideo      sendAudio      sendSticker    sendLocation
sendContact    sendInteractive
```

Every method requires an E.164 recipient such as `+919876543210`. Media accepts exactly one `mediaId` or public HTTPS `url`. Image, video, and document messages may include captions; only documents may include filenames.

Supported template aliases are authentication, welcome, order confirmation, payment success, payment failed, order packed, order shipped, out for delivery, delivered, cancelled, refund initiated, refund completed, coupon, marketing, festival campaign, and custom. Template aliases must correspond to approved templates in Meta before live delivery.

## Retry and queue policy

The current queue uses `ImmediateQueueAdapter`. Business modules depend only on `WhatsAppQueueService`, allowing a later adapter for BullMQ, Redis, RabbitMQ, or SQS without changing callers.

Retries use bounded exponential backoff and `WHATSAPP_MAX_RETRIES`. Network errors, timeouts, HTTP 429, HTTP 5xx, and errors explicitly marked temporary are retried. HTTP 400/401/403/404, invalid tokens, permissions, recipients, templates, and media validation failures are not retried.

Delivery metadata is maintained in bounded memory with queued, sent, retrying, delivered, read, and failed states. It stores identifiers, status, attempt count, and timestamps—not message bodies or recipients. Phase 3 can feed webhook delivery updates through the existing provider-message-ID lookup.

## Incoming messages and conversations

Incoming messages are normalized into a shared envelope before routing. Supported types include text, image, video, audio, document, sticker, location, contacts, reaction, interactive, button reply, list reply, and unknown future types. Unknown events are logged and ignored without failing the webhook.

Rule-based intent classification recognizes greeting, order inquiry, product inquiry, complaint, support, general question, media upload, and unknown. It does not use AI and does not generate replies.

Conversation state is persisted in `WHATSAPP_CONVERSATIONS`; channel sessions are persisted in `WHATSAPP_SESSIONS`. Sessions resume within `WHATSAPP_SESSION_TIMEOUT_MINUTES`, expire automatically after inactivity, and create a new conversation on the next message. Provider message IDs are used to ignore immediate duplicate webhook deliveries.

The guarded Google startup check automatically provisions the registered Phase 3 worksheets without removing existing sheets. They can also be synchronized manually before deployment:

```bash
npm run sheets:sync
```

The health endpoint reports conversation-engine status, webhook status, active session/conversation counts, parser status, last incoming message time, and last event type.

Production callback URL:

```text
https://litepuff.in/api/webhooks/whatsapp
```

## Meta configuration

1. Create or select the LitePuff Meta app and add WhatsApp.
2. Copy the permanent system-user access token, Phone Number ID, WhatsApp Business Account ID, and App Secret into Hostinger environment variables.
3. Generate a unique verify token and store it as `WHATSAPP_VERIFY_TOKEN` in Hostinger.
4. Redeploy/restart the Node application.
5. Confirm `GET https://litepuff.in/api/health/whatsapp` reports `configured: true` and `connected: true`.
6. In Meta Webhooks, set Callback URL to `https://litepuff.in/api/webhooks/whatsapp` and enter the exact `WHATSAPP_VERIFY_TOKEN` value.
7. Subscribe the WhatsApp Business Account to the required webhook fields. This foundation safely ignores unknown events.

## Security

- POST bodies are retained as raw bytes until signature verification completes.
- Signatures use HMAC-SHA256 and `crypto.timingSafeEqual`.
- Missing, malformed, and invalid signatures fail closed.
- Tokens, secrets, headers, and webhook payloads are never logged or returned by health endpoints.
- Webhooks are rate limited and malformed payloads are rejected safely.
- Invalid Meta configuration never crashes application startup.
- Outbound callers never access Meta directly; all message types use the singleton messaging service and Meta client.
- Structured logs contain delivery IDs, type, status, attempts, and safe error codes only.

## Verification

```bash
npm run test:server
curl https://litepuff.in/api/health/whatsapp
```
