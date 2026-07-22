# LitePuff Google Credentials Migration

## Architecture

```text
Environment / secret file
  -> GoogleCredentialProvider
     -> validation + PEM normalization
     -> singleton google.auth.JWT
     -> GoogleSheetsConfig
     -> existing GoogleSheetsService and repositories
```

Credential priority is `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT_BASE64`, `GOOGLE_SERVICE_ACCOUNT_FILE`, then legacy variables. `GOOGLE_SHEET_ID` is required for spreadsheet operations with every source.

## Credential flow

```text
Load highest-priority source
  -> validate service-account fields
  -> normalize and parse PKCS#8 PEM
  -> create official JWT client lazily
  -> authenticate during startup self-test
  -> read workbook metadata
  -> connected: cache metadata and expose status
  -> failure: store reason, disable Sheets, keep Express running
```

## Hostinger setup

Prefer Base64 because it contains no newline or quote-sensitive JSON syntax:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('service-account.json')) | Set-Clipboard
```

Configure `GOOGLE_SERVICE_ACCOUNT_BASE64` with the clipboard value and `GOOGLE_SHEET_ID` with the spreadsheet ID. Remove a malformed higher-priority `GOOGLE_SERVICE_ACCOUNT_JSON`, because source priority is intentional.

## Other deployment options

- Local/Railway/Render: set compact `GOOGLE_SERVICE_ACCOUNT_JSON` or Base64.
- Docker/Kubernetes: mount the JSON as a secret and set `GOOGLE_SERVICE_ACCOUNT_FILE` to its absolute container path.
- VPS: use a protected file readable only by the application account, or Base64.
- Legacy: retain `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `GOOGLE_SHEET_ID`.

Never commit the JSON file or credential value. Share the target spreadsheet with `client_email` as Editor and enable the Google Sheets API in the service account's project.

## Health checks

- `GET /api/health`: server availability and connected/disabled Google state.
- `GET /api/health/google`: credential source, authentication state, workbook title, worksheet count, client email, timestamps, and last safe failure reason.
- `GET /api/health/google-sheets`: detailed registered worksheet validation.

No health response exposes private keys, JSON bodies, access tokens, or JWTs.

## Rollback

1. Remove `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT_BASE64`, and `GOOGLE_SERVICE_ACCOUNT_FILE`.
2. Restore the legacy email, private key, and spreadsheet ID variables.
3. Redeploy. The provider automatically selects legacy credentials without code changes.

## Deployment checklist

- Google Sheets API enabled.
- Spreadsheet shared with the exact service-account client email as Editor.
- `GOOGLE_SHEET_ID` contains the ID, not the full URL.
- Exactly one preferred credential source configured.
- Secret is absent from Git and application logs.
- `/api/health` returns HTTP 200 even when Google is disabled.
- `/api/health/google` reports `authenticated: true` and `spreadsheetConnected: true` before enabling Google-dependent workflows.
