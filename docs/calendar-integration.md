# Case Management Calendar integration

## Current boundary

The existing source calendar is `casemanagement@bethleheminn.org`. The connected account can read it, but the Staff Hub must not use that mixed-use calendar or a browser connector session as an application credential.

A dedicated staff-safe calendar was created for the eventual one-way feed:

- Name: `Bethlehem Inn Staff Hub Events`
- Calendar ID: `c_9ebfb87e322a0337c45664a545ed09ab877983d3fd73dbceaf8af5f76b270122@group.calendar.google.com`
- Owner: `jobs@bethleheminn.org`
- Sharing: owner-only (not public); organization-wide availability is enabled with “See event details”
- Current contents: empty; no Case Management records were copied

The Staff Hub Calendar Function now targets this calendar only. No public iCal or secret iCal address is used.

The current calendar contains Bend events as well as participant names, case-management titles, notes, and internal locations. The public Reader must never receive those raw records.

## Production architecture

Use the `/api/calendar` Cloudflare Pages Function as the only Calendar reader. It uses a dedicated service identity with `https://www.googleapis.com/auth/calendar.events.readonly` and a direct reader ACL on the dedicated calendar. The service-account JSON is stored as the encrypted Production secret `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`; no access token, private key, attendee list, organizer identity, attachment, Meet link, raw description, raw location, or Google event ID is sent to the Reader.

The existing Google Identity client is for sign-in and does not grant Calendar API access. Calendar authorization is provided here by the separate server-side service identity below; offline OAuth remains a fallback if the service-identity path is later retired.

Credential decision record:

1. Dedicated service identity selected and configured: `staff-hub-calendar-reader@clean-axiom-454114-m3.iam.gserviceaccount.com`, with no project IAM roles and direct “See event details” access only to this calendar.
2. Offline OAuth remains a fallback only; it is not configured.

The Google Calendar API is enabled in project `clean-axiom-454114-m3`. The browser Calendar connector session is not used as an application credential.

## Eligibility gate

Do not ingest the current mixed-use calendar until events have a deterministic staff-safe signal. The dedicated calendar above is now the preferred source. Other acceptable options are:

1. a dedicated curated Staff Hub / Staff Events calendar, or
2. an explicit marker such as `STAFF_HUB_PUBLIC` maintained by an authorized calendar owner.

The Function reads only the dedicated curated calendar, so calendar membership is the staff-safe signal. It never reads `casemanagement@bethleheminn.org`; a Bend location or keyword match is insufficient.

## Allowlist transformation

For an eligible event, `/api/calendar` returns only:

- staff-safe title supplied by the event owner
- start and end time, including all-day handling
- sanitized staff-safe location when explicitly approved
- Staff Hub department/category from a controlled mapping
- optional staff-facing description from the dedicated event

Strip all other fields. Stable identity, duplicate detection, recurrence expansion, cancellation, expiry, and source timestamps remain server-side implementation details.

## Failure behavior

Calendar reads are one-way and read-only. If authorization or the API fails, the Reader keeps its existing Upcoming content and shows a neutral unavailable state. Logs contain status, operation, and error class only; never event text, participant data, or credentials.
