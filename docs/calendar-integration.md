# Case Management Calendar integration

## Current boundary

The authoritative calendar is `casemanagement@bethleheminn.org`. The connected account can read it, but the Staff Hub deployment has no Calendar credential and must not use a browser connector session as an application credential.

The current calendar contains Bend events as well as participant names, case-management titles, notes, and internal locations. The public Reader must never receive those raw records.

## Production architecture

Use a Cloudflare Pages Function as the only Calendar reader. Store a rotatable Google OAuth refresh token, OAuth client ID, and client secret as encrypted Production secrets. Request only `https://www.googleapis.com/auth/calendar.readonly`. Never send an access token, refresh token, attendee list, organizer identity, attachment, Meet link, raw description, raw location, or Google event ID to the Reader.

The existing Google Identity client is for sign-in and does not grant Calendar API access. Calendar authorization therefore needs a separate server-side delegated authorization, or an approved safe-calendar/proxy owned by Bethlehem Inn.

## Eligibility gate

Do not ingest the current mixed-use calendar until events have a deterministic staff-safe signal. Preferred options are:

1. a dedicated curated Staff Hub / Staff Events calendar, or
2. an explicit marker such as `STAFF_HUB_PUBLIC` maintained by an authorized calendar owner.

The Function must reject every event without that signal. A Bend location or a keyword match is insufficient.

## Allowlist transformation

For an eligible event, return only:

- staff-safe title supplied by the event owner
- start and end time, including all-day handling
- sanitized staff-safe location when explicitly approved
- Staff Hub department/category from a controlled mapping
- optional staff-facing description from a dedicated safe field

Strip all other fields. Stable identity, duplicate detection, recurrence expansion, cancellation, expiry, and source timestamps remain server-side implementation details.

## Failure behavior

Calendar reads are one-way and read-only. If authorization, the API, or the eligibility gate fails, the Reader keeps its existing Upcoming content and shows a neutral unavailable state. Logs contain status, operation, and error class only; never event text, participant data, or credentials.

