# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hostr is a file sharing platform. Backend uses Koa.js, frontend uses AngularJS 1.7.9 with Webpack, database is PostgreSQL via Sequelize ORM, with Redis for sessions/pub-sub/job queue.

## Development Commands

All development runs inside containers via Podman Compose (or Docker Compose):

```bash
# Start services (app, postgres, redis, minio)
make podman compose-up    # or: podman compose up -d

# Initialize storage directories and database
make init migrate

# Build frontend (webpack + sass)
make build

# Watch frontend for changes during development
make watch-frontend

# Run tests (seeds test user, then runs mocha)
make test

# Tail application logs
make logs

# Shell into container
make shell
```

### Running commands directly (inside container or locally)

```bash
yarn run lint              # ESLint (airbnb/base config)
yarn test                  # Seeds test DB + runs mocha
yarn run build             # Webpack + SASS
yarn run watch             # Watch JS + SASS
yarn run watch-server      # Nodemon
```

### Running a single test file

```bash
mocha test/api/file.spec.js
```

## Architecture

### Two-app structure mounted in `app.js`

- **`api/`** — REST API mounted at `/api`, JSON responses, Basic/token auth, CORS enabled
- **`web/`** — Server-rendered EJS views + AngularJS SPA, session-based auth, CSRF protection

Both are Koa routers composed into the main Koa app in `app.js`. WebSocket routes also mount under `/api`.

### Key directories

- **`models/`** — Sequelize models (User, File, Activation, Reset, Remember, Login, Transaction, Malware). Uses paranoid (soft) deletes.
- **`lib/`** — Shared backend utilities: `uploader.js` (file upload pipeline), `redis.js` (connection + middleware), `s3.js` (MinIO/S3 storage), `resize.js` (image thumbnails via jimp), `malware.js` (VirusTotal scanning)
- **`web/public/src/`** — AngularJS frontend source, bundled by Webpack into `web/public/build/bundle.js`
- **`web/views/`** — EJS server-rendered templates
- **`test/`** — Mocha + Supertest tests organized as `api/`, `web/`, `unit/`

### Request flow

1. `app.js` sets up middleware: bodyparser → helmet → HTTPS redirect → session → redis → compression → static files
2. API routes (`api/app.js`): CORS → error handler → auth middleware → route handlers
3. Web routes (`web/app.js`): CSRF → views (EJS) → session auth → route handlers

### File upload pipeline (`lib/uploader.js`)

checkLimit → accept (Busboy stream, MD5, progress via Redis pub/sub) → processImage (detect type, generate 150x/970x thumbnails) → finalise → malwareScan

### Real-time events

Redis pub/sub on channels `/user/{userId}` and `/file/{fileId}`, relayed to clients via WebSockets (`koa-websocket`).

### Authentication

- **API**: Basic auth (email:password) or token auth (`:token` in Authorization header, token stored in Redis)
- **Web**: Session-based via Redis store, remember-me cookie

### Plan limits

- Free: 20MB max file size, 15 daily uploads
- Pro: 500MB max file size, unlimited uploads

## Code Style

- Native ES modules (`"type": "module"` in package.json, no Babel)
- ESLint with airbnb-base: single quotes, no underscore dangle restriction, `++` allowed in for loops
- ES module `import/export` syntax runs natively on Node 22+
- Use `import.meta.dirname` instead of `__dirname`

## Environment Configuration

See `.envrc.example`. Key variables: `DATABASE_URL`, `REDIS_URL`, `WEB_BASE_URL`, `API_BASE_URL`, `UPLOAD_STORAGE_PATH`, `COOKIE_KEY`, `AWS_*` (S3/MinIO), `SENDGRID_KEY`, `STRIPE_*`, `VIRUSTOTAL_KEY`.

## Custom Error Codes

API errors use custom codes: 601 (file too large), 602 (daily limit), 603 (not activated), 604 (not found), 606 (invalid token), 607 (incorrect login), 608 (too many attempts).
