# Read-only, privacy-safe Calendar mirror

## Authority and audience
The Reader is public and requires no login. On September 16, 2026 the owner explicitly approved publishing the existence and exact timing of **every valid Case Management occurrence**, including otherwise-private appointments, under neutral titles where needed. Timing can itself reveal activity; this is an intentional organizational disclosure decision, not a claim that removing names makes all schedules anonymous.

This replaces the old prefix-only inclusion policy. No per-event approval, GitHub content commit, manual sync, or application redeployment is needed for a new event.

## Sources and unchanged credentials
- Case Management: `casemanagement@bethleheminn.org` — operational source of truth.
- Bethlehem Inn Staff Hub Events: `c_9ebfb87e322a0337c45664a545ed09ab877983d3fd73dbceaf8af5f76b270122@group.calendar.google.com` — existing intentionally curated supplemental source.
- Service identity: `staff-hub-calendar-reader@clean-axiom-454114-m3.iam.gserviceaccount.com`.
- Encrypted Production secret: `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`.
- Scope: `https://www.googleapis.com/auth/calendar.events.readonly`.
- Calendar sharing remains See event details. No write permission, domain-wide delegation, key creation, IAM change, cron, or mirror datastore was added.

Google Calendar sharing remains restricted even though the sanitized Staff Hub output is public. Avoid duplicating the same event into both sources: different source records deliberately retain separate identities.

## Case Management title projection
Classification happens only inside the server Function, before its response:
1. Exact known service names (case-insensitive, outer whitespace ignored) map to fixed public labels: Worksource, Worksource-BIRCH, DCBH, DCBH @ BIRCH, Yoga, Yoga at BIRCH / Yoga-BIRCH, Sound Bath / Sound Bath-Bend, Ideal Option / Ideal Option-Bend, Participant Job Fair-Bend.
2. Owner-approved intake classes (reconfirmed September 24, 2026): `P&P` / `P&P Intake` map to the constant `P&P Intake`; `EASA` / `EASA Intake` map to `EASA Intake`. Matching is case-insensitive and accepts the exact class alone or followed by ` - ` and private source text. No suffix is copied or parsed. Other intake types remain neutral until explicitly approved; there is no generic name-guessing rule.
3. Any other valid occurrence becomes `Case Management Event`. Missing or malformed titles also get this neutral label; malformed timing or cancellation never becomes an event.
4. The legacy `[STAFF HUB]` prefix is optional. It does not by itself expose unknown raw titles.
5. A deliberate separate safe title remains supported: `[STAFF HUB] [TITLE: Approved public title]` followed by private source text. Only the reviewed TITLE value is used. Never put names, identifiers, or case information in that public value. Malformed overrides get the neutral label, not the raw remainder.

This is controlled classification, not name stripping. Unknown types appear immediately as neutral occurrences; adding a new descriptive service-class label later is a bounded code/configuration change, not a requirement for the event to appear.

Case Management requests only `id,summary,status,start,end`. Output contains the safe title, timing, all-day flag, an opaque namespaced ID, and fixed contract fields. Description/location are empty and link is null. No descriptions, attendees, attachments, conference information, organizer, creator, extended properties, or raw payloads are requested/exposed. No Case Management location is currently approved for direct copying. A place in a fixed service label is not copied from a location field.

The dedicated curated calendar retains its previously approved title/description/location projection.

## Recurrence, edits and deletion
Each read uses Google's expanded occurrence list (`singleEvents=true`), including recurring exceptions and moved occurrences. Cancellation is excluded both upstream (`showDeleted=false`) and by normalization. Full successful reads replace the previous feed, so removed events do not remain as stored copies.

Source-aware SHA-256 IDs are stable across edits to an occurrence and prevent collisions between calendars. Pagination is independent per source. All pages must succeed before that source is accepted. Each source has a 15-second deadline and a 20-page cap; the API request has bounded dates (previous month through six months ahead), Pacific time, and a one-day UTC boundary pad. All-day exclusive ends and multi-day spans are preserved.

## Actual freshness, not an instant push guarantee
- The Function reads Google on every API request and sends `Cache-Control: no-store`.
- Calendar, Home Upcoming, Departments, and Search use the same normalized event contract.
- Visible Reader subscribers refresh every **60 seconds** and on tab focus/visibility return. Route entry and opening Search also read the feed.
- Simultaneous subscribers share the same in-flight request; completed responses are not cached.
- The Calendar's Checked timestamp comes from the successful server response, not a fabricated activity clock.
- Expected foreground change visibility is the next poll plus Google/network latency. This is polling, not a webhook/instant-sync SLA. Hidden/offline tabs cannot update until resumed/reconnected.
- If a source fails, none of its partial pages are exposed. The other source remains with a partial warning. Both failing yields a generic unavailable response. Reader failures clear prior calendar data and invite retry; they are not shown as a genuine empty schedule.

## Privacy and acceptance tests
Mock tests cover registered services, generic intake, unknown types, malformed titles, raw-field exclusion, recurring occurrences/exceptions, moved times, cancelled/deleted events, pagination, independent failures, timed/all-day conversion, exclusive multi-day ends, Pacific DST, Home/Calendar identical sanitization, and loading/empty/partial/error states.

Live QA compares the connector's source events against the public API without writing private source details into reports. A disposable, transparent, attendee-free test series may be created/edited/deleted using the owner's existing Calendar access solely for authorized propagation testing; the Staff Hub integration itself remains read-only.

## Reader content and tester guidance
Resources is dormant infrastructure, not a Reader feature. `/resources` redirects to `/links`; Home, Departments, and Search do not expose the old resource directory. Nine fictional seed announcements were moved intact to `fixtures/retired-reader-samples.json`, outside production content. They are not relabeled as real information. Administrators should create fresh approved announcements through Staff Admin.
