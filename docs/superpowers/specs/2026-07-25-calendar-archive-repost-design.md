# Calendar: Archive & Re-post Events — Design

**Date:** 2026-07-25
**Status:** Approved (design), pending implementation plan

## Problem

littlelocals.au lists free and paid children's events for the Central Coast. Many
events are **recurring** and follow the school calendar: term-time events pause over
the holidays, holiday events pause during term. Both restart later.

Recurring events are stored as **one Firestore document per occurrence**, sharing a
`recurring_id`, generated only up to a `recurrence_until` date
(`frontend/src/pages/EventForm.jsx:334`). When a series ends, its occurrences become
past-dated.

The admin dashboard, on **every load**, hard-deletes every event whose `date` is
before today (`frontend/src/pages/AdminDashboard.jsx:111-123`) via `deleteDoc`, with
no archive. So when a term ended, all of that term's occurrences became past-dated and
were permanently deleted on the next dashboard load. ~100 events were lost this way.

The existing "Series Manager" can *extend* a series by 3 months
(`handleExtendSeries`), but only while at least one occurrence still exists — it
extends forward from the last occurrence. Once all occurrences pass and are deleted,
there is nothing to extend from. That is the gap.

**Consequence:** when the holidays end and term events should resume, the admin cannot
view or re-post the previous events — they no longer exist — and must recreate each one
by hand.

## Goal

1. **Stop losing event data** — past events are archived, not hard-deleted.
2. **Let the admin re-post** a previous recurring event series forward with a few
   clicks, instead of recreating it.

This makes every future term↔holiday transition a quick re-post rather than a rebuild.

## Non-goals

- **Bulk CSV import** — explicitly cut. The ~100 already-deleted events are entered
  once through the normal form; the archive protects them from that point on.
- **Recovering the already-deleted 100 events** — unrecoverable (no PITR, no backup,
  no source file, old source site gone, not re-scrapeable from current venue sources).
  The archive only protects data from the moment it ships forward.
- **Changing the public site** — public listing reads the `events` collection only and
  is unaffected.

## Design

### 1. New collection: `archived_events`

One record per archived **series**, deduped by `recurring_id`. One-off (non-recurring)
past events are archived keyed by their original event id so nothing is silently lost.

Fields (the event "template"):

- `title`, `category`, `location`, `time`, `age_group`, `description`, `image_url`,
  `price`, `link`
- `recurrence_type` (`weekly` | `fortnightly` | `monthly`), `recurring_id`,
  `is_recurring`
- `last_occurrence_date` — most recent occurrence date seen for this series
- `archived_at` — ISO timestamp

### 2. Archive-on-expire (root-cause fix)

Replace the blind delete loop in `AdminDashboard.jsx` `loadData`
(`frontend/src/pages/AdminDashboard.jsx:111-123`). For each expired occurrence
(`date < today`):

1. **Upsert into `archived_events`.**
   - Recurring (`recurring_id` present): one record per `recurring_id`. If a record
     already exists, keep the one with the **latest** `last_occurrence_date`.
   - One-off (no `recurring_id`): archive keyed by the event's own id.
2. **Then delete the occurrence from `events`.**

`events` stays lean (unbounded dead occurrences are not retained); the reusable
template survives in `archived_events`.

Note: the already-deleted 100 cannot be archived retroactively — there is nothing left
to read. Archiving protects everything that expires from this change onward.

### 3. "Past Events" admin tab

New tab in the dashboard tab bar alongside **Events** and **Posts**
(`activeTab` currently `'events' | 'posts'` — add `'archived'`).

- Searchable list of `archived_events` records.
- Each row shows: title, last-run date (`last_occurrence_date`), category, frequency.
- Row actions:
  - **Re-post** — recurring series only.
  - **Remove from archive** — all records (view/delete for one-offs).

### 4. Re-post flow

Clicking **Re-post** opens a small modal that asks:

- **Start date** — first occurrence of the new series.
- **Repeat-until date** — capped at 6 months from start, matching the existing
  validation (`frontend/src/pages/EventForm.jsx:325-329`).

On confirm, generate a fresh series forward, reusing the existing occurrence-generation
logic (the `while (curr <= untilDate)` step loop in
`frontend/src/pages/EventForm.jsx:334-346` / `handleExtendSeries`):

- Assign a **new `recurring_id`** (`rec_${Date.now()}_${random}`).
- Write one doc per occurrence to `events`, copying template fields from the archive
  record, with `is_recurring: true`.
- New occurrences appear in `events` immediately → live on the public site.

The archive record is **kept** after re-post, so the same event can be re-posted again
at the next term↔holiday flip.

### 5. Firestore rules

Add a match block for `archived_events`, admin-only read/write, mirroring
`dismissed_suggestions` (`firestore.rules:43-45`):

```
match /archived_events/{archivedId} {
  allow read, write: if request.auth != null;
}
```

## Data flow

1. Admin opens dashboard → `loadData` runs → expired occurrences are archived
   (upsert to `archived_events`) then deleted from `events`.
2. Admin opens **Past Events** tab → reads `archived_events`.
3. Admin clicks **Re-post** on a recurring series → picks start + until → new series
   generated into `events` with a new `recurring_id`.
4. Public site reads `events` → new occurrences are live.

## Error handling

- Re-post validation: until-date after start-date; until-date ≤ start + 6 months
  (reuse existing messages).
- Archive upsert failures are logged (as the current delete loop logs failures) and do
  not block dashboard load.
- Re-post is idempotent per click: a new `recurring_id` each time; double-clicks
  guarded by disabling the confirm button while writing.

## Testing

- Archive-on-expire: seed a past-dated recurring occurrence → load → assert record in
  `archived_events` and occurrence removed from `events`; second expired occurrence of
  same series keeps the latest `last_occurrence_date`.
- One-off past event → archived keyed by id, no Re-post button shown.
- Re-post: from an archive record, generate series → assert correct occurrence count and
  dates for weekly/fortnightly/monthly, new `recurring_id`, archive record retained.
- Rules: unauthenticated read/write to `archived_events` denied; admin allowed.

## Affected files

- `frontend/src/pages/AdminDashboard.jsx` — archive-on-expire, Past Events tab, re-post
  modal + handler.
- `firestore.rules` — `archived_events` rule.
