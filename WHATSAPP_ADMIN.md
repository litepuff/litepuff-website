# LitePuff WhatsApp Admin Backend (Phase 4)

## Architecture

Authenticated admin requests enter at `/api/admin/whatsapp`. Existing admin JWT protection, centralized permission middleware, audit logging, standard error middleware, and the Phase 2 messaging service remain the only security and delivery paths.

Google Sheets stores durable admin state in `WHATSAPP_MESSAGES`, `WHATSAPP_CAMPAIGNS`, and `WHATSAPP_TEMPLATES`. `WHATSAPP_CONVERSATIONS` is extended safely with unread, pin, assignment, and resolution columns. Startup schema synchronization appends missing worksheets/headers without deleting existing data.

## API

- `GET /api/admin/whatsapp/conversations`
- `GET /api/admin/whatsapp/conversations/:id`
- `PATCH /api/admin/whatsapp/conversations/:id` (`pin`, `assign`, `resolve`, `read`)
- `GET /api/admin/whatsapp/messages`
- `GET /api/admin/whatsapp/search?q=`
- `GET /api/admin/whatsapp/customers`
- `GET /api/admin/whatsapp/customers/:id`
- `POST /api/admin/whatsapp/messages`
- `POST /api/admin/whatsapp/messages/bulk` (maximum 100 unique recipients)
- `POST /api/admin/whatsapp/messages/:id/resend`
- `POST /api/admin/whatsapp/messages/:id/retry`
- `DELETE /api/admin/whatsapp/messages/:id` (soft delete)
- `GET|POST /api/admin/whatsapp/campaigns`
- `PUT|DELETE /api/admin/whatsapp/campaigns/:id`
- `POST /api/admin/whatsapp/campaigns/:id/schedule|pause|resume`
- `GET /api/admin/whatsapp/campaigns/:id/stats`
- `GET /api/admin/whatsapp/templates`
- `POST /api/admin/whatsapp/templates/sync`
- `GET /api/admin/whatsapp/analytics`
- `GET /api/admin/whatsapp/exports/:resource/:format` where resource is `conversations`, `messages`, or `campaigns` and format is `csv`, `xlsx`, or `json`.

List endpoints accept `page`, `limit`, `search`, date/status/type/customer/campaign filters as applicable. Global search covers phone, customer, order, conversation, message, and campaign identifiers/content.

## Security

All routes inherit `protectAdminRoute`. Read operations require dashboard permission; messaging/template mutation requires settings-management permission; campaigns require campaign-management permission; analytics and exports require analytics permission. Mutations and exports write to the existing `AUTH_AUDIT` service. Secrets, tokens, webhook headers, and message bodies are never logged. Deletes are reversible soft deletes.

## Analytics

The dashboard reports total/today/week/month messages, sent/delivered/read/failed/retries, delivery/read/failure rates, active/resolved/unread conversations, campaign performance, customer growth, and average response time. `/api/health/whatsapp` now reports dashboard, analytics, campaign, queue, and conversation status.

## Deployment

No new environment variables or packages are required. Deploy normally, then allow the existing Google Sheets startup synchronizer to add the three Phase 4 worksheets and missing conversation headers. The configured Google service account must retain Editor access. Meta template synchronization additionally requires the existing WhatsApp access token and Business Account ID.

Run `npm run test:server` before deployment and confirm `/api/health/whatsapp` reports `dashboardStatus`, `analyticsStatus`, and `campaignStatus` as `ready`.
