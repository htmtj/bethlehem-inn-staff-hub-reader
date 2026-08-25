# Bethlehem Inn Staff Hub — Reader Beta

A clean Phase 1 reader experience for Bethlehem Inn organizational news, department updates, upcoming items, department spaces, and commonly used resources.

## Architecture

- React + Vite + TypeScript
- Static structured content in `src/content/*.json`
- Client-side lifecycle filtering and search
- No authentication, sessions, database, admin CMS, Google APIs, or Onboarding dependency
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
