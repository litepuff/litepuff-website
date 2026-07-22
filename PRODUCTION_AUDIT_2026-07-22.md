# LitePuff Backend Production Audit

Audit date: 2026-07-22

## Decision

The application code is release-ready, but the current environment is not ready to run with `NODE_ENV=production`. Deployment is blocked until production authentication secrets and provider credentials are supplied. No values from `.env` are included in this report.

## Verified

- Production frontend build: PASS (2,418 modules)
- Backend automated tests: PASS (41/41)
- Express HTTP smoke checks: PASS
- Google Sheets authentication and access: PASS
- Google Sheets CRUD, search, filter, batch read/update, validation, retry recovery, and cleanup: PASS
- Google Sheets integrity audit: PASS (0 duplicate keys, 0 orphan references, 0 invalid mapped values)
- Registered worksheets: PASS (26/26)
- Authentication: JWT claims, expiry, refresh rotation, replay invalidation, sessions, logout, cookies, OTP expiry/attempt/cooldown/replay controls: PASS
- Authorization: roles, permissions, ownership, customer/admin protection, 401/403 behavior, and audit redaction: PASS
- Security middleware: Helmet, CORS allowlist, compression, request limits, sanitization, rate limits, CSRF origin guard, secure production cookies: PASS
- API response envelope and centralized error handling: PASS
- Frontend API route compatibility: PASS

## Safe fixes made

1. Failed Razorpay event reporting now sends and validates the existing signed checkout intent.
2. Google Sheets cold initialization now uses the existing batch-read API rather than 26 sequential reads.
3. Disabled email delivery uses structured redacted logging instead of direct application console output.
4. Production startup now requires a hashed admin password and rejects plaintext-only admin configuration.
5. Duplicate `SUPPORT_EMAIL` entry removed from `.env.example`; the real `.env` was not modified.

## Performance

- Health endpoint: approximately 18 ms in local smoke test.
- Product API cold request before fix: approximately 14.9 s.
- Product API cold request after fix: approximately 2.6 s.
- Product API warm request after fix: approximately 35 ms end-to-end (server log approximately 8 ms).
- Google access token, metadata, and row caches are reused. Writes invalidate/update relevant row caches.

## Environment blockers

- Replace all authentication placeholder/development secrets with four independent random production secrets (minimum 32 characters); current production validation fails at `JWT_SECRET`.
- Set `ADMIN_PASSWORD_HASH` and remove/deactivate plaintext `ADMIN_PASSWORD` for production.
- Set `NODE_ENV=production` on Hostinger.
- Configure SMTP for email OTP login.
- Configure Meta WhatsApp credentials for WhatsApp OTP login.
- Configure a live Razorpay key pair and webhook secret before accepting online payments.
- Configure Shiprocket and/or Delhivery plus the shipping origin PIN before automated shipment creation.

Production URLs are present, HTTPS, non-local, and consistent with the frontend API configuration.

## Warnings and follow-up

- `CUSTOMER_TOKEN_DAYS` and Google OAuth variables in `.env` are unused by the current passwordless architecture and can be removed after deployment configuration is backed up.
- `bcrypt` and `resend` packages are not imported; `bcryptjs` and Nodemailer are the active implementations. Remove unused packages in a separately reviewed dependency-maintenance change.
- Some legacy controllers use the compatibility Google Sheets facade directly. It shares the same singleton connection/cache and is operational, but gradual service-boundary cleanup is recommended after launch.
- Large frontend PNG assets are a page-performance concern, not a backend deployment blocker.
- Uploads use local VPS storage. Configure persistent backup/retention for `server/uploads` on Hostinger.

## Scores

- Backend: 94%
- Security: 91%
- Performance: 90%
- Database/Google Sheets: 98%
- Frontend integration: 96%
- Deployment configuration: 72%
- Overall production readiness: 90%

