# File Drive

A working Drive-style file workspace built from the supplied File Distributor project. React/Vite frontend, FastAPI backend, SQLite by default (PostgreSQL can be configured).

## Included

- Account registration, password hashing, JWT login, session expiry and sign-out
- Private storage per account and ownership checks on destinations and mutations
- Files and nested folders, breadcrumbs, file and folder uploads, drag-and-drop, upload progress
- Recursive folder copies, file copies, moves, renaming, multi-selection
- Search, sorting, list/grid views, persistent favorites, recent files and storage usage
- Preview/download, file replacement and version restoration
- Revocable public download links and a view of files with active links
- Recursive trash, restore and permanent deletion; separately trashed children remain in trash when restoring their parent
- Settings for light/dark/device theme, compact spacing, start page and default layout
- Account management: name, email/login ID, password and profile picture (PNG/JPEG/WebP, up to 2 MB)
- Email/password changes require the current password and invalidate old sessions
- Advanced search by type, name, content, folder/subfolders, stars, trash and date modified
- Ascending/descending sorting by name, size, creation date or modification date
- Help articles, an issue report form and a private history of saved support reports
- Responsive desktop/mobile interface

## Setup on Windows

Requires Python 3.11+ and Node.js 22.12+.

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd frontend
npm.cmd ci
cd ..
```

Create `.env` from `.env.example` and replace SECRET_KEY with a random secret. Generate one with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

In terminal 1:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

In terminal 2:

```powershell
cd frontend
npm.cmd run dev
```

Open the URL printed by Vite (normally http://localhost:5174). Choose **Create account**. No fixed admin or shared demo password is required.

For the already prepared workspace, `Start.ps1` can launch both services in the background. Logs are saved in `logs`; `Stop.ps1` stops only the process IDs saved by this project's launcher. The current development preview may use port 5175 if 5174 is occupied.

The frontend uses `/api`; Vite proxies it to port 8001. Set VITE_API_URL for a different backend. Backend database and uploaded bytes persist on disk in `drive.db` and `uploads/`. Back up both together.

## Verify

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_drive_local.py -q --basetemp .test-temp-local
cd frontend
npm.cmd run build
npm.cmd audit
```

The integration suite uses an isolated database and temporary uploads. It tests login validation, account isolation, folder destination permissions, uploads into folders, recursive copy, cycle prevention, search, favorites, sharing, trash recovery, permanent deletion version recovery, profile/settings persistence, avatar validation, password rotation, email changes, session invalidation, support report isolation and advanced search. The older tests supplied in the ZIP require a running server and configured TEST_EMAIL/TEST_PASSWORD; they are not part of the isolated suite.

## Scope and deployment

This is an independent Drive-style application. Google account sign-in, password-reset email, Google Docs/Sheets live editing, real-time collaboration, email-invited sharing, Google Drive synchronization, distributed object storage, virus scanning and enforced storage quotas are not implemented. The storage meter reports disk usage; it does not enforce a Google storage plan. Recent sorts by file creation time.

Before internet deployment, configure HTTPS, a stable secret, backups, a production database/storage service, appropriate CORS origins and perimeter request/rate limits. Serve the frontend build behind a same-origin `/api` reverse proxy; the Vite proxy is for local development. Public links are bearer links: anyone with the link can download the file until it is revoked or the file is trashed/deleted.

The deliverable ZIP excludes credentials, existing user databases/uploads, dependency folders and temporary test files. Uploaded files from the original archive remain only in the extracted workspace.

## Upload fix and new controls

Multipart uploads use XMLHttpRequest, including file replacements and profile pictures. This avoids fetch request streaming incompatibilities in embedded browsers while keeping upload progress. Small text and 8 MB binary uploads were verified in the browser.

The top-right gear opens Settings; the question mark opens Help & support; your avatar opens Manage your account. The sliders button in the search box opens Advanced search. Content search supports text/CSV/Markdown/JSON and DOCX/XLSX files; it does not search video or image contents. Plain-text content search reads the first 2 MB; Office search bounds file and expanded XML sizes to 10 MB. Owner searches remain scoped to your own account.

Support reports are saved in the server database with a reference number and shown under My reports. No external support system or email delivery is configured.

## Expanded private previews

Open any active file to enter the full-screen viewer. Supported browser image formats (including JPG/PNG/GIF/WebP/SVG) offer fit, zoom and rotation. Audio and video (including MP3/WAV/MP4/WebM, subject to browser codec support) stream with HTTP byte ranges and offer play/pause, seek, volume, playback speed and looping. Video includes native fullscreen and picture-in-picture where available. PDFs use PDF.js, loaded on demand, with page navigation and zoom. DOCX/XLSX use a safe reading view of text/tables; PPTX shows slide text. Office previews do not reproduce complete original layouts, images, charts or animations.

Text/code/JSON/XML/HTML/CSV/Markdown show escaped source, line numbers, matching-line highlighting and wrapping. ZIP archives list up to 5,000 entries and preview supported images/media/PDF/text entries without extracting anything to disk; entries can be downloaded individually. Office documents inside ZIPs can be inspected as bytes or downloaded; nested archives are not recursively opened. Encrypted or exceptionally large/compressed entries have clear download guidance.

Every file has metadata, original download and a binary inspector (first 4 KB), including formats without a visual renderer. This provides a useful fallback; it cannot render every proprietary, encrypted, damaged format or unsupported media codec. Text previews read at most 2 MB and show at most 10,000 lines. Office documents are limited to 20 MB stored / 50 MB expanded; spreadsheets show at most 30 sheets, 1,000 rows and 100 columns per sheet. ZIP entry previews are capped at 20 MB with expansion-ratio checks.

Preview URLs are scoped to one file, expire after two hours, validate account session version, and stop working when the file is trashed. They cannot authenticate as login tokens. Uploaded HTML/scripts are displayed as source, never executed. Native streaming and document responses use private no-store caching. The isolated tests also check byte-range seeking, preview ownership, token scoping, trash revocation, source safety and ZIP safeguards.

## Account security and preview polish

The preview uses a translucent dark backdrop with blur and image shadows. Icon controls show a label on hover and keyboard focus; all have accessible names. The account Security tab includes optional authenticator-based TOTP verification (RFC 6238), a locally generated QR code, eight one-time recovery codes (with verified regeneration), signed-in session management, sign-out of other sessions and a private security activity list. The password form is collapsed below the protection controls. MFA enrollment requires the current password and a valid authenticator code; turning it off and signing out all other sessions require the password plus a second factor when enabled. Email/password changes also require the second factor when enabled. The actual user's MFA setting is not changed automatically.

Authenticator secrets are encrypted in the database using a Fernet key derived from SECRET_KEY; recovery codes are stored only as SHA-256 hashes of random 128-bit codes. This protects database-only theft of the authenticator secret, not compromise of the server and its key. Keep SECRET_KEY and database backups secure and retain the key when restoring backups; there is no automated MFA key rotation or email-based account recovery. Losing the authenticator and every recovery code can lock out the account. Authenticator codes cannot be reused after enrollment or successful authentication; wait for the next 30-second code if needed.

New access tokens expire after at most 60 minutes and are tied to revocable database sessions. Logout invalidates the current tracked session; revoking any tracked session also revokes its native preview links. Password/email changes, MFA configuration changes and sign-out of other sessions invalidate older tokens via the existing account version. Sessions issued before this upgrade can be registered with Track this session; use Sign out other sessions to invalidate all older tokens. Password hashes use PBKDF2-SHA256 at 600,000 iterations; old hashes remain readable for existing accounts. Bearer tokens still use browser local storage; production session design should evaluate HttpOnly cookies with CSRF protection.

Database-backed throttling allows at most five attempts per login email and thirty attempts per source IP per 15-minute window; a successful login clears the email bucket. Registration and security confirmations have their own account buckets. Configure a shared production database and enforce additional limits at a trusted reverse proxy; do not trust arbitrary forwarded IP headers. Events include sign-in success/failure, second-factor failures, MFA changes, session revocation, password/profile changes and creation of public sharing links. Events are private to the account and not a complete file-access audit trail.

MAX_UPLOAD_MB defaults to 1024. Both declared and streamed request bodies are bounded (multipart permits 1 MB of envelope overhead), and individual new/replacement files are checked before copying. Avatars are capped at 2 MB with a 3 MB request envelope; other request bodies are capped at 64 KB. Private API responses disable caching, prevent MIME sniffing, suppress referrers and restrict framing/active content; HSTS is set for HTTPS requests. Configure HTTPS and trusted proxy behavior for deployment. The sharing dialog offers one-day, seven-day, thirty-day or explicitly non-expiring links. Its initial selection is seven days; existing links are not changed.

**Deployment limits:** files remain unencrypted on server disk; this is not end-to-end encrypted storage. HTTPS is not configured in the local preview. Malware scanning, encrypted storage/managed keys, backup/restore drills, operational monitoring and an independent security review are still needed before handling real confidential production data. No security certification or guarantee is claimed.

Security implementation references: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), and [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html).

Run the security suite alongside the existing isolated suite: `python -m pytest tests/test_drive_local.py tests/test_security_local.py -q --basetemp .test-temp-security`.
