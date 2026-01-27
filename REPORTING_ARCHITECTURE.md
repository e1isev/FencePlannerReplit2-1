# Reporting Architecture (FencePlanner)

This document captures a professional baseline for in-app bug reporting and GitHub issue creation.

## Target Architecture

### Client (FencePlanner app)
- Captures diagnostics, screenshot, recent logs, and a sanitized state snapshot.
- Sends a single **create report** request to the backend.

### Backend (report service)
- Validates payload size and content type.
- Redacts sensitive data from logs and state.
- Applies rate limiting and idempotency.
- Stores artifacts (screenshot, report bundle, JSON) in object storage.
- Creates the GitHub Issue via the GitHub API.
- Returns the Issue URL and report ID to the client.

### Storage
- Use S3 (or equivalent) for large artifacts.
- Persist a database row per report for dedupe, audit, and retention.

### Queue (recommended)
- Use a job queue for GitHub calls so transient failures do not break the user flow.
- Retries should be safe (idempotent) with backoff and jitter.

## GitHub Authentication (Professional Approach)
- Use a **GitHub App**, not a personal access token.
- Install the app on the target repo with minimum permissions (typically **Issues: write**).
- Authenticate server-side:
  1. Create a JWT for the app.
  2. Exchange the JWT for an installation access token using:
     - `POST /app/installations/{installation_id}/access_tokens`
- Installation tokens expire (about one hour). Mint on demand and cache briefly.

## End-to-End Data Flow
1. **User clicks Report** in the app.
2. Client builds payload:
   - User description + repro steps.
   - App metadata (version, commit hash, environment, feature flags).
   - Recent logs (ring buffer).
   - Breadcrumbs (last 30–100 user actions).
   - Sanitized state snapshot (no secrets).
   - Screenshot (or short recording, if enabled).
3. Client sends `POST /api/reports` to the server.
4. Server:
   - Validates size limits and content type.
   - Redacts sensitive keys from logs and state.
   - Stores artifacts in object storage; records URLs, hashes, report ID in DB.
   - Creates a GitHub issue using:
     - `POST /repos/{owner}/{repo}/issues`
     - With title, body, labels, assignees as needed.
5. Issue body includes:
   - Report ID and timestamp.
   - App version and platform.
   - Error summary and stack trace.
   - Links to screenshot and report bundle.
   - Repro steps and expected vs actual.
6. Server responds with **Issue URL + report ID**.

## Screenshots and Bundles
- GitHub issue creation is text-only (no file upload form).
- Store screenshots/bundles externally and link them in the issue body.
- Typical patterns:
  - Private object storage with time-limited signed URLs.
  - Internal authenticated report viewer page.
  - Public bucket only for open-source with strict redaction.
- Apply retention policies (e.g., delete artifacts after 30–90 days).

## Reliability, Idempotency, and Rate Limiting
### Idempotency
- Assign a stable `report_id` per submission.
- Create the DB record before calling GitHub.
- If GitHub call fails, retry later.
- If the client re-submits, detect duplicates and avoid duplicate issues.

### Rate Limiting
- Honor GitHub headers: `x-ratelimit-remaining`, `x-ratelimit-reset`.
- Respect `retry-after` for secondary limits.
- Use a queue worker with backoff, jitter, and circuit breaker logic.

## Security and Privacy Controls
- Never allow the client to call GitHub directly.
- Store tokens in a secret manager.
- Authenticate or sign client requests to prevent spam.
- Enforce strict payload limits and content types.
- Scrub PII/secrets (API keys, bearer tokens, etc.).
- Allow opting out of screenshots and provide a redact tool.

## Issue Formatting (Triage-Friendly)
Recommended issue template:
- **Summary**
- **Steps to reproduce**
- **Expected vs actual**
- **Environment**
- **Logs** (truncated + link to full bundle)
- **Screenshot link**
- **Report metadata** (report ID, correlation ID)

## Professional Minimum for FencePlanner
- GitHub App auth on the server.
- Report intake endpoint storing screenshot + JSON bundle.
- Worker that creates issues via `POST /repos/{owner}/{repo}/issues`.
- Dedupe by report hash plus GitHub rate-limiting guidance.
