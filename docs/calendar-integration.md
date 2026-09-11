# Approved read-only Calendar feed

## Sources and permissions

The public Reader consumes only the Cloudflare Pages Function `/api/calendar`. The Function reads:

- **Bethlehem Inn Staff Hub Events**: `c_9ebfb87e322a0337c45664a545ed09ab877983d3fd73dbceaf8af5f76b270122@group.calendar.google.com`. Intentionally curated events are eligible.
- **Case Management**: `casemanagement@bethleheminn.org`. Only titles beginning with the exact prefix `[STAFF HUB]` are eligible.

No events are copied between calendars. This supersedes the proposed write-sync approach that Workspace policy prevented. No cron, mirror database, new infrastructure, key, IAM role or policy change is required.

The existing service identity is `staff-hub-calendar-reader@clean-axiom-454114-m3.iam.gserviceaccount.com`. Its existing JSON credential stays in encrypted **Production** secret `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`. The sole scope remains `https://www.googleapis.com/auth/calendar.events.readonly`, with **See event details** required on each calendar. The service token contains no delegated-user `sub` claim. The browser connector is not the application credential.

Staff Hub Events is owned by `jobs@bethleheminn.org`; its Google calendar is not public. Existing organization visibility is unchanged. **Auto-accept invitations → Do not show invitations** was saved and verified after reload September 11, 2026. The Reader itself is public even though Google calendar sharing is restricted.

## Staff approval workflow

1. Select a non-sensitive organizational event. Never approve participant appointments, intakes, case notes or resident-specific meetings.
2. Review its title and timing for **public web visibility**. The software does not identify or redact participant names from an approved title.
3. Add the exact prefix, for example `[STAFF HUB] WorkSource-BIRCH`. Leading spaces, different capitalization or a marker later in the title do not qualify.
4. Save in Google Calendar. For recurring events, deliberately choose the occurrence(s) or series being approved.
5. Open Staff Hub Calendar and use **Refresh calendar**. Visible Reader tabs also refresh every five minutes. Opening Search performs a fresh read.

Edits appear on the next successful read. Removing the prefix or cancelling/deleting an event removes it from subsequent feeds. Already-open pages may retain previously approved content until their next refresh; this is not an instant revocation channel. Do not duplicate approved Case Management events manually into Staff Hub Events.

## Privacy boundary

Case Management requests only `id,summary,status,start,end`. The backend checks the untouched prefix before projecting any event. Malformed, cancelled, invalid-date and empty-title records fail closed.

Approved Case Management output includes only title without the prefix, timing, all-day state, an opaque ID and fixed fields needed by the existing Reader contract. Description/location are empty; link is null. Category/department are fixed values, not source metadata. Descriptions, guests, conference links, attachments, locations, notes, creators, organizers and extended properties are not requested or included even if unexpectedly present upstream. Raw event bodies and source errors are never logged or returned.

The curated Staff Hub Events projection retains its intentionally approved title, description and location. Existing seed/sample events are not used as Calendar fallback.

## Reliability

Each source has independent pagination, a 15-second deadline, a 20-page limit, the same bounded rolling range, Pacific time and expanded recurring occurrences. All-day dates retain their exclusive end date.

If any page fails, that source's partial pages are discarded. Valid events from the other source remain available with `availability: "partial"` and a visible incomplete-information notice. If both sources or credentials fail, HTTP 503 returns only a generic unavailable response. Responses use `Cache-Control: no-store`.

IDs hash the calendar ID plus occurrence ID. Repeated source records deduplicate; identical IDs from different calendars cannot overwrite one another. Separate manually created copies of the same real-world event remain distinct. Title/time heuristics must not collapse legitimate distinct events. No private source data is persisted in GitHub or KV.

## Verification

Synthetic mock tests cover exact approval, unapproved organizational/intake exclusion, metadata stripping, malformed records, all-day/Pacific dates, independent pagination, stable namespaced IDs, edits, approval removal, cancellation and source failure isolation.

Live acceptance requires the service-account Case Management reader ACL plus one deliberately approved non-sensitive event compared through the public API and rendered Calendar. Unapproved records must remain absent without copying private details into logs, reports or test fixtures. No fabricated production events are needed.
