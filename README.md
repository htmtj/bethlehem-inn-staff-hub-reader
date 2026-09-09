# Bethlehem Inn Staff Hub — Reader Beta

A clean Phase 1 reader experience for Bethlehem Inn organizational news, department updates, upcoming items, department spaces, and commonly used resources.

## Architecture

- React + Vite + TypeScript
- Static structured content in `src/content/*.json`
- Client-side lifecycle filtering and search
- The Reader is public and has no authentication requirement. Protected `/admin` publishing uses Cloudflare Access Email OTP, a `STAFF_HUB_ROLES` KV binding, and server-side GitHub Contents API writes with SHA conflict checks.
- Netlify static deployment with a private GitHub source repository

## Local development

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm check
```

## Content safety

All current entries are fictional sample content. Because the reader beta is unauthenticated, every item must be treated as internet-visible. Do not add confidential, participant, HR, employee, credential, security, or other protected information.

## Content files

- `news.json`: important news and department updates
- `events.json`: upcoming events and deadlines
- `resources.json`: resource directory metadata and placeholder destinations
- `departments.json`: department identity and ownership placeholders

The reader UI consumes normalized selectors in `src/lib/content.ts`, allowing a later publishing mechanism to replace these files without redesigning the site.

## Publishing roles

- `publisher` manages only the department assigned in `STAFF_HUB_ROLES`.
- `admin` manages all supported content and department scopes.
- `ed_publisher` manages only News items in the `Executive Director Message` lane (`lane: "executive-director-message"`, department `administration`). This role can create, edit, schedule, and archive ED messages and cannot manage events, resources, or other departments.

The current Google Calendar connection is a read-only planning dependency. The production Reader must not fetch the Case Management calendar until a server-side credential is stored in the deployment environment and the public-event data policy is approved. Calendar records may include participant or case details that do not belong in a public Reader feed.
