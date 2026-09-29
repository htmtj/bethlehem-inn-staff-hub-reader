# Bethlehem Inn Staff Hub — Reader Beta

A clean Phase 1 reader experience for Bethlehem Inn organizational news, department updates, upcoming items, department spaces, and commonly used resources.

## Architecture

- React + Vite + TypeScript
- Static structured content in `src/content/*.json`
- Client-side lifecycle filtering and search
- The Reader is public and has no authentication requirement. Protected `/admin` publishing uses Cloudflare Access Email OTP, a `STAFF_HUB_ROLES` KV binding, and server-side GitHub Contents API writes with SHA conflict checks.
- GitHub `main` → Cloudflare Pages production deployment. The current GitHub repository is public; the dashboard controls Pages build settings and bindings.

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

The Reader and source repository are public. Every saved record, including drafts and scheduled records, must be treated as internet-visible even when lifecycle filters hide it from Reader views. Those filters are not access controls. Do not add confidential, participant, HR, employee, credential, security, or other protected information.

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

## Calendar and deployment boundaries

`functions/api/calendar.ts` reads the dedicated Staff Hub calendar and Case Management independently using a server-side credential with the Calendar events read-only scope. Case Management occurrences require the exact `[STAFF HUB]` prefix. The mapper emits fixed safe labels or an explicitly supplied `[TITLE: ...]` public label, removes descriptions/locations/links/private metadata, and hashes source IDs. Source owners must not put confidential data in an explicit public TITLE. Partial-source failure is disclosed without inventing events.

Calendar dates/times use America/Los_Angeles; Admin datetime inputs explicitly use the publisher device's local timezone. Resources remain absent from Reader navigation and `/resources` redirects to Links. Legacy resource publishing remains in Admin; saving a resource does not add it to Links.

Use `pnpm check` before proposing a release. Production deployment requires approval; pushing main triggers Cloudflare Pages. No live content/role/Access-policy changes are part of ordinary local QA. The checked-in Wrangler file describes an older Workers asset deployment and is ignored by the current Pages build; do not treat it as the full production configuration.
