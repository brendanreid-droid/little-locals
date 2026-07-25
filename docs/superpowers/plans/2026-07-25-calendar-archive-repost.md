# Calendar Archive & Re-post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop hard-deleting past events; archive them and let the admin re-post a previous recurring series forward in a few clicks.

**Architecture:** Extract the duplicated recurrence date-generation into a pure, unit-tested module. Add a pure archive-record helper module. Change the admin dashboard's expiry loop to archive-then-delete into a new `archived_events` Firestore collection. Add a "Past Events" admin tab that lists archived records and re-posts recurring series forward with a new `recurring_id`.

**Tech Stack:** React 19, Vite, Firebase Firestore (web SDK v12), Vitest (added in Task 1) for unit tests.

**Spec:** `docs/superpowers/specs/2026-07-25-calendar-archive-repost-design.md`

---

## File Structure

- **Create** `frontend/src/lib/recurrence.js` — pure recurrence helpers: `generateOccurrenceDates`, `validateRecurrenceRange`, `newRecurringId`. (DRY: replaces inline logic duplicated in `EventForm.jsx` and `AdminDashboard.jsx`'s extend-series code.)
- **Create** `frontend/src/lib/recurrence.test.js` — unit tests for the above.
- **Create** `frontend/src/lib/archive.js` — pure archive helpers: `archiveKeyFor`, `buildArchiveRecord`, `mergeArchiveRecord`.
- **Create** `frontend/src/lib/archive.test.js` — unit tests for the above.
- **Modify** `frontend/package.json` — add Vitest dev dependency + `test` script.
- **Modify** `firestore.rules` — add `archived_events` admin-only rule.
- **Modify** `frontend/src/pages/AdminDashboard.jsx` — archive-on-expire in `loadData`; load archived records; "Past Events" tab button + content block; re-post modal + handler; remove-from-archive handler.

Each task below is self-contained and ends in a commit.

---

## Task 1: Pure recurrence module + Vitest

**Files:**
- Create: `frontend/src/lib/recurrence.js`
- Test: `frontend/src/lib/recurrence.test.js`
- Modify: `frontend/package.json`

- [ ] **Step 1: Add Vitest and a test script**

In `frontend/`, run:

```bash
npm install -D vitest@^2
```

Then edit `frontend/package.json` `scripts` block to add a `test` line (keep existing lines):

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/lib/recurrence.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { generateOccurrenceDates, validateRecurrenceRange, newRecurringId } from './recurrence.js';

describe('generateOccurrenceDates', () => {
  it('weekly: inclusive start, 7-day step', () => {
    expect(generateOccurrenceDates('2026-07-27', '2026-08-17', 'weekly'))
      .toEqual(['2026-07-27', '2026-08-03', '2026-08-10', '2026-08-17']);
  });

  it('fortnightly: 14-day step', () => {
    expect(generateOccurrenceDates('2026-07-27', '2026-08-24', 'fortnightly'))
      .toEqual(['2026-07-27', '2026-08-10', '2026-08-24']);
  });

  it('monthly: same day each month', () => {
    expect(generateOccurrenceDates('2026-07-15', '2026-10-15', 'monthly'))
      .toEqual(['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15']);
  });

  it('stops before passing the until date', () => {
    expect(generateOccurrenceDates('2026-07-27', '2026-08-15', 'weekly'))
      .toEqual(['2026-07-27', '2026-08-03', '2026-08-10']);
  });

  it('unknown frequency yields just the start date', () => {
    expect(generateOccurrenceDates('2026-07-27', '2026-08-17', 'nope'))
      .toEqual(['2026-07-27']);
  });
});

describe('validateRecurrenceRange', () => {
  it('rejects until <= start', () => {
    expect(() => validateRecurrenceRange('2026-07-27', '2026-07-27'))
      .toThrow(/after the start/i);
  });

  it('rejects ranges longer than 6 months', () => {
    expect(() => validateRecurrenceRange('2026-01-01', '2026-08-01'))
      .toThrow(/6 months/i);
  });

  it('accepts a valid range', () => {
    expect(() => validateRecurrenceRange('2026-07-27', '2026-10-27')).not.toThrow();
  });
});

describe('newRecurringId', () => {
  it('is prefixed and unique-ish', () => {
    const a = newRecurringId();
    const b = newRecurringId();
    expect(a).toMatch(/^rec_/);
    expect(a).not.toEqual(b);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — cannot resolve `./recurrence.js`.

- [ ] **Step 4: Write minimal implementation**

Create `frontend/src/lib/recurrence.js`. This mirrors the existing generation logic in `EventForm.jsx:318-350`, made pure. Dates are `YYYY-MM-DD` strings; construct with explicit local Date parts to avoid timezone drift.

```js
// Pure recurrence helpers shared by event creation and re-post.

function parseYmd(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns an array of YYYY-MM-DD strings from start..until inclusive.
// type: 'weekly' | 'fortnightly' | 'monthly'. Unknown types return [start].
export function generateOccurrenceDates(startStr, untilStr, type) {
  const until = parseYmd(untilStr);
  const dates = [];
  let curr = parseYmd(startStr);
  while (curr <= until) {
    dates.push(toYmd(curr));
    if (type === 'weekly') {
      curr = new Date(curr); curr.setDate(curr.getDate() + 7);
    } else if (type === 'fortnightly') {
      curr = new Date(curr); curr.setDate(curr.getDate() + 14);
    } else if (type === 'monthly') {
      curr = new Date(curr); curr.setMonth(curr.getMonth() + 1);
    } else {
      break;
    }
  }
  return dates;
}

// Throws Error with a user-facing message if the range is invalid.
export function validateRecurrenceRange(startStr, untilStr) {
  const start = parseYmd(startStr);
  const until = parseYmd(untilStr);
  if (until <= start) {
    throw new Error('Repeat Until Date must be after the start Date.');
  }
  const max = new Date(start);
  max.setMonth(max.getMonth() + 6);
  if (until > max) {
    throw new Error('To keep performance high, a recurring series cannot repeat for more than 6 months.');
  }
}

export function newRecurringId() {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS — all `recurrence.test.js` cases green.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/recurrence.js frontend/src/lib/recurrence.test.js
git commit -m "feat: pure recurrence module with unit tests"
```

---

## Task 2: Pure archive-record helper + tests

**Files:**
- Create: `frontend/src/lib/archive.js`
- Test: `frontend/src/lib/archive.test.js`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/archive.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { archiveKeyFor, buildArchiveRecord, mergeArchiveRecord } from './archive.js';

const recurringEvent = {
  id: 'evt1', title: 'Toddler Storytime', category: 'Playgroups',
  location: 'Gosford Library', time: '10:30 AM', age_group: '0-5 years',
  description: 'Songs and books', image_url: 'http://img', price: 'FREE',
  link: 'http://l', recurrence_type: 'weekly', recurring_id: 'rec_abc',
  is_recurring: true, date: '2026-06-09',
};

const oneOff = { ...recurringEvent, id: 'evt9', recurring_id: undefined, is_recurring: false, date: '2026-06-10' };

describe('archiveKeyFor', () => {
  it('uses recurring_id for a series', () => {
    expect(archiveKeyFor(recurringEvent)).toBe('rec_abc');
  });
  it('uses oneoff-prefixed id for a non-recurring event', () => {
    expect(archiveKeyFor(oneOff)).toBe('oneoff_evt9');
  });
});

describe('buildArchiveRecord', () => {
  it('captures the template fields plus last_occurrence_date and archived_at', () => {
    const rec = buildArchiveRecord(recurringEvent);
    expect(rec.title).toBe('Toddler Storytime');
    expect(rec.recurrence_type).toBe('weekly');
    expect(rec.recurring_id).toBe('rec_abc');
    expect(rec.is_recurring).toBe(true);
    expect(rec.last_occurrence_date).toBe('2026-06-09');
    expect(typeof rec.archived_at).toBe('string');
    expect(rec).not.toHaveProperty('id');
    expect(rec).not.toHaveProperty('date');
  });
});

describe('mergeArchiveRecord', () => {
  it('keeps the later last_occurrence_date and its template', () => {
    const older = buildArchiveRecord({ ...recurringEvent, date: '2026-06-09', title: 'Old Title' });
    const newer = buildArchiveRecord({ ...recurringEvent, date: '2026-06-16', title: 'New Title' });
    const merged = mergeArchiveRecord(older, newer);
    expect(merged.last_occurrence_date).toBe('2026-06-16');
    expect(merged.title).toBe('New Title');
  });
  it('keeps the existing record when the incoming occurrence is older', () => {
    const existing = buildArchiveRecord({ ...recurringEvent, date: '2026-06-16', title: 'Keep' });
    const incoming = buildArchiveRecord({ ...recurringEvent, date: '2026-06-09', title: 'Drop' });
    const merged = mergeArchiveRecord(existing, incoming);
    expect(merged.last_occurrence_date).toBe('2026-06-16');
    expect(merged.title).toBe('Keep');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — cannot resolve `./archive.js`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/lib/archive.js`:

```js
// Pure helpers for turning an expiring event into an archive record.

const TEMPLATE_FIELDS = [
  'title', 'category', 'location', 'time', 'age_group', 'description',
  'image_url', 'price', 'link', 'recurrence_type', 'recurring_id', 'is_recurring',
];

// Stable key for an archive record: one per recurring series, or per one-off event.
export function archiveKeyFor(event) {
  if (event.recurring_id) return event.recurring_id;
  return `oneoff_${event.id}`;
}

// Build the archive record (template) from an expiring occurrence.
export function buildArchiveRecord(event) {
  const rec = {};
  for (const f of TEMPLATE_FIELDS) {
    rec[f] = event[f] ?? null;
  }
  rec.is_recurring = !!event.is_recurring;
  rec.last_occurrence_date = event.date ?? null;
  rec.archived_at = new Date().toISOString();
  return rec;
}

// Merge an incoming record into an existing one, keeping the later occurrence's data.
export function mergeArchiveRecord(existing, incoming) {
  if (!existing) return incoming;
  const a = existing.last_occurrence_date || '';
  const b = incoming.last_occurrence_date || '';
  return b > a ? incoming : existing;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS — both `recurrence.test.js` and `archive.test.js` green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/archive.js frontend/src/lib/archive.test.js
git commit -m "feat: pure archive-record helper with unit tests"
```

---

## Task 3: Firestore rule for `archived_events`

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add the rule**

In `firestore.rules`, after the `dismissed_suggestions` block (ends at line 45), add:

```
    // Allow admin-only read/write access to archived event templates
    match /archived_events/{archivedId} {
      allow read, write: if request.auth != null;
    }
```

- [ ] **Step 2: Verify syntax compiles**

Run (from repo root):

```bash
npx firebase deploy --only firestore:rules --dry-run
```

Expected: rules compile with no syntax error. (If the Firebase CLI is not authenticated in this environment, skip the dry-run and rely on deploy-time validation; the block mirrors the existing `dismissed_suggestions` rule and is known-valid.)

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: admin-only Firestore rule for archived_events"
```

---

## Task 4: Archive-on-expire in AdminDashboard `loadData`

**Files:**
- Modify: `frontend/src/pages/AdminDashboard.jsx` (imports; expiry loop at lines 111-124; add archived-events fetch)

- [ ] **Step 1: Import Firestore write helpers and archive helpers**

At the top of `frontend/src/pages/AdminDashboard.jsx`, the Firestore import (line 3) currently is:

```js
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
```

Change it to also import `setDoc`:

```js
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, setDoc, query, orderBy } from 'firebase/firestore';
```

Then add, below the existing page imports (near the other `import` lines at the top of the file):

```js
import { archiveKeyFor, buildArchiveRecord, mergeArchiveRecord } from '../lib/archive.js';
import { generateOccurrenceDates, validateRecurrenceRange, newRecurringId } from '../lib/recurrence.js';
```

- [ ] **Step 2: Add archived-events state**

In the component state block (near line 10, alongside `const [events, setEvents] = useState([]);`), add:

```js
  const [archivedEvents, setArchivedEvents] = useState([]);
```

- [ ] **Step 3: Replace the expiry loop with archive-then-delete**

In `loadData`, the current loop (lines 111-124) is:

```js
        // Delete past events from Firestore
        const activeEvents = [];
        for (const event of fetchedEvents) {
          if (event.date && event.date < todayStr) {
            try {
              await deleteDoc(doc(db, 'events', event.id));
            } catch (err) {
              console.error("Failed to delete expired event:", event.id, err);
            }
          } else {
            activeEvents.push(event);
          }
        }
        setEvents(activeEvents);
```

Replace it with:

```js
        // Fetch existing archive records once, keyed by doc id, so merges are in-memory.
        const archivedSnap = await getDocs(collection(db, 'archived_events'));
        const archiveById = new Map(archivedSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

        // Archive past events (template per series / one-off), then delete the occurrence.
        const activeEvents = [];
        const pendingArchive = new Map(); // key -> merged archive record (this load's expiries)
        for (const event of fetchedEvents) {
          if (event.date && event.date < todayStr) {
            const key = archiveKeyFor(event);
            const incoming = buildArchiveRecord(event);
            pendingArchive.set(key, mergeArchiveRecord(pendingArchive.get(key), incoming));
          } else {
            activeEvents.push(event);
          }
        }

        // Write archive records, merging each against any pre-existing record for the same key.
        for (const [key, record] of pendingArchive) {
          try {
            const existing = archiveById.get(key);
            const merged = mergeArchiveRecord(existing || null, record);
            await setDoc(doc(db, 'archived_events', key), merged);
            archiveById.set(key, { id: key, ...merged });
          } catch (err) {
            console.error("Failed to archive expired event:", key, err);
          }
        }

        // Only after archiving, delete the expired occurrences from events.
        for (const event of fetchedEvents) {
          if (event.date && event.date < todayStr) {
            try {
              await deleteDoc(doc(db, 'events', event.id));
            } catch (err) {
              console.error("Failed to delete expired event:", event.id, err);
            }
          }
        }
        setEvents(activeEvents);

        // Populate the Past Events tab from the up-to-date archive map.
        const fetchedArchived = Array.from(archiveById.values())
          .sort((a, b) => (b.last_occurrence_date || '').localeCompare(a.last_occurrence_date || ''));
        setArchivedEvents(fetchedArchived);
```

Note: `mergeArchiveRecord(existing, record)` returns whichever record has the later `last_occurrence_date`. Because `buildArchiveRecord` copies the current occurrence's template fields, re-archiving a still-running series with a newer occurrence refreshes the stored template too.

- [ ] **Step 4: Manual verification in the dev app**

Run: `cd frontend && npm run dev`, open the admin dashboard, and log in.
Because this requires real Firestore data, verify with a seeded past event:

1. In the Firebase console, add one `events` doc with a past `date` (e.g. `2026-06-01`), a `title`, and `recurring_id: "rec_testverify"`, `is_recurring: true`, `recurrence_type: "weekly"`.
2. Reload the admin dashboard.
3. Confirm in the console: the `events` doc is gone, and an `archived_events/rec_testverify` doc now exists with `last_occurrence_date: "2026-06-01"` and the template fields.

Expected: past occurrence moved from `events` to `archived_events`; no console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AdminDashboard.jsx
git commit -m "feat: archive past events instead of hard-deleting them"
```

---

## Task 5: "Past Events" tab (button + list)

**Files:**
- Modify: `frontend/src/pages/AdminDashboard.jsx` (tab bar at lines 1019-1085; add a content block)

- [ ] **Step 1: Add the tab button**

In the tab selector `div` (after the "Suggested" button, which closes at line 1084), add a fourth button:

```jsx
              <button
                onClick={() => { setActiveTab('archived'); setSearchTerm(''); }}
                style={{
                  padding: '8px 16px',
                  fontWeight: '900',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  border: '2px solid var(--text-dark)',
                  borderRadius: '50px',
                  backgroundColor: activeTab === 'archived' ? 'var(--primary)' : 'var(--bg-white)',
                  color: activeTab === 'archived' ? 'white' : 'var(--text-dark)',
                  boxShadow: activeTab === 'archived' ? '2px 2px 0px 0px var(--text-dark)' : 'none',
                  transform: activeTab === 'archived' ? 'translateY(-2px)' : 'none',
                  transition: 'var(--transition-bouncy)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                className="admin-tab-btn"
              >
                Past Events ({archivedEvents.length})
              </button>
```

- [ ] **Step 2: Add a filtered list derived value**

Near the existing `filteredEvents` / `filteredPosts` derivations (lines 749-757), add:

```js
  const filteredArchived = archivedEvents.filter(a =>
    (a.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (a.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
```

- [ ] **Step 3: Add the content block**

Find where tab content is rendered conditionally on `activeTab` (the block that follows the `loading ? (...)` spinner around line 1088; the `events`, `posts`, and `suggestions` panels are rendered there). Add a new panel that renders when `activeTab === 'archived'`. Place it alongside the other `activeTab === '...'` panels:

```jsx
          {activeTab === 'archived' && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredArchived.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px 0', fontWeight: '700', color: 'var(--text-dark)' }}>
                  No past events archived yet. When a recurring event's dates pass, it will appear here to re-post.
                </p>
              ) : (
                filteredArchived.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '12px', padding: '14px 18px', border: '2px solid var(--text-dark)',
                    borderRadius: '14px', backgroundColor: 'var(--bg-white)', flexWrap: 'wrap'
                  }}>
                    <div style={{ minWidth: '200px' }}>
                      <div style={{ fontWeight: '900', fontSize: '0.95rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted, #666)' }}>
                        {item.category || 'Uncategorised'} · Last ran {item.last_occurrence_date || 'unknown'}
                        {item.is_recurring ? ` · ${item.recurrence_type || 'recurring'}` : ' · one-off'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {item.is_recurring && (
                        <button
                          onClick={() => openRepostModal(item)}
                          style={{
                            padding: '8px 14px', fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer',
                            border: '2px solid var(--text-dark)', borderRadius: '50px',
                            backgroundColor: 'var(--primary)', color: 'white', textTransform: 'uppercase'
                          }}
                        >
                          Re-post
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveArchived(item)}
                        style={{
                          padding: '8px 14px', fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer',
                          border: '2px solid var(--text-dark)', borderRadius: '50px',
                          backgroundColor: 'var(--bg-white)', color: 'var(--text-dark)', textTransform: 'uppercase'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
```

Note: `openRepostModal` and `handleRemoveArchived` are added in Task 6. This step will not fully run until Task 6 is complete; that is expected. If you want the app to compile after this step alone, add temporary no-op stubs `const openRepostModal = () => {};` and `const handleRemoveArchived = () => {};` and delete them in Task 6. Otherwise, do Task 5 and Task 6 back-to-back before verifying.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AdminDashboard.jsx
git commit -m "feat: Past Events tab listing archived events"
```

---

## Task 6: Re-post modal + handlers

**Files:**
- Modify: `frontend/src/pages/AdminDashboard.jsx` (state; handlers; modal JSX)

- [ ] **Step 1: Add modal state**

In the component state block (near `archivedEvents`), add:

```js
  const [repostTarget, setRepostTarget] = useState(null); // archive record being re-posted
  const [repostStart, setRepostStart] = useState('');
  const [repostUntil, setRepostUntil] = useState('');
  const [reposting, setReposting] = useState(false);
```

- [ ] **Step 2: Add the open handler + remove handler**

Near the other handlers (e.g. after `handleDeleteRecurringSeries`, around line 747), add:

```js
  const openRepostModal = (archiveRecord) => {
    setRepostTarget(archiveRecord);
    // Default start = today; default until = today + 3 months.
    const today = new Date();
    const until = new Date(today);
    until.setMonth(until.getMonth() + 3);
    const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setRepostStart(toYmd(today));
    setRepostUntil(toYmd(until));
  };

  const handleRemoveArchived = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from the archive? This does not affect any live events.`)) return;
    try {
      await deleteDoc(doc(db, 'archived_events', item.id));
      setArchivedEvents(prev => prev.filter(a => a.id !== item.id));
    } catch (err) {
      console.error("Failed to remove archived event:", err);
      alert("Failed to remove archived event: " + err.message);
    }
  };
```

- [ ] **Step 3: Add the re-post submit handler**

Directly below the handlers from Step 2, add:

```js
  const handleRepostSubmit = async () => {
    if (!repostTarget) return;
    try {
      validateRecurrenceRange(repostStart, repostUntil);
    } catch (err) {
      alert(err.message);
      return;
    }
    setReposting(true);
    try {
      const type = repostTarget.recurrence_type || 'weekly';
      const dates = generateOccurrenceDates(repostStart, repostUntil, type);
      const recurringId = newRecurringId();
      const eventsCol = collection(db, 'events');

      const template = {
        title: repostTarget.title || '',
        category: repostTarget.category || 'Playgrounds',
        location: repostTarget.location || '',
        time: repostTarget.time || '',
        age_group: repostTarget.age_group || 'All Ages',
        description: repostTarget.description || '',
        image_url: repostTarget.image_url || '',
        price: 'FREE',
        link: repostTarget.link || '',
        recurrence_type: type,
      };

      const created = [];
      for (const occDate of dates) {
        const docAdded = await addDoc(eventsCol, {
          ...template,
          date: occDate,
          recurring_id: recurringId,
          is_recurring: true,
        });
        created.push({ id: docAdded.id, ...template, date: occDate, recurring_id: recurringId, is_recurring: true });
      }

      // New occurrences may be in the future; add them to the live events list.
      setEvents(prev => [...prev, ...created].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setRepostTarget(null);
      alert(`Re-posted "${template.title}" — created ${created.length} occurrences (${type}).`);
    } catch (err) {
      console.error("Failed to re-post series:", err);
      alert("Failed to re-post series: " + err.message);
    } finally {
      setReposting(false);
    }
  };
```

- [ ] **Step 4: Add the modal JSX**

Near the other modals/overlays in the returned JSX (e.g. where `showSeriesManager` or the media library modal renders), add a re-post modal that renders when `repostTarget` is set:

```jsx
      {repostTarget && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-white)', border: '3px solid var(--text-dark)', borderRadius: '18px',
            padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '6px 6px 0 0 var(--text-dark)'
          }}>
            <h3 style={{ fontWeight: '900', marginBottom: '4px' }}>Re-post event</h3>
            <p style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '16px' }}>
              "{repostTarget.title}" — {repostTarget.recurrence_type || 'weekly'}
            </p>

            <label style={{ display: 'block', fontWeight: '800', fontSize: '0.8rem', marginBottom: '4px' }}>Start date</label>
            <input
              type="date" value={repostStart} onChange={e => setRepostStart(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '2px solid var(--text-dark)', borderRadius: '10px', marginBottom: '12px' }}
            />

            <label style={{ display: 'block', fontWeight: '800', fontSize: '0.8rem', marginBottom: '4px' }}>Repeat until (max 6 months)</label>
            <input
              type="date" value={repostUntil} onChange={e => setRepostUntil(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '2px solid var(--text-dark)', borderRadius: '10px', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRepostTarget(null)} disabled={reposting}
                style={{ padding: '10px 16px', fontWeight: '900', border: '2px solid var(--text-dark)', borderRadius: '50px', backgroundColor: 'var(--bg-white)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRepostSubmit} disabled={reposting}
                style={{ padding: '10px 16px', fontWeight: '900', border: '2px solid var(--text-dark)', borderRadius: '50px', backgroundColor: 'var(--primary)', color: 'white', cursor: reposting ? 'wait' : 'pointer' }}
              >
                {reposting ? 'Re-posting…' : 'Re-post'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Remove any temporary stubs**

If you added the temporary `const openRepostModal = () => {};` / `const handleRemoveArchived = () => {};` stubs in Task 5 Step 3, delete them now — the real implementations exist.

- [ ] **Step 6: Verify the build compiles and lints**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: lint passes; Vite build succeeds with no unresolved-reference errors.

- [ ] **Step 7: Manual verification in the dev app**

Run: `cd frontend && npm run dev`, open the admin dashboard, log in.

1. Open the **Past Events** tab. Confirm the archived record from Task 4 verification appears (a recurring one shows a **Re-post** button).
2. Click **Re-post** → set a start date a few days ahead and an until date ~1 month later → confirm.
3. Confirm the success alert reports the expected occurrence count, and the new occurrences appear on the **Events** tab and on the public event list.
4. Confirm the archive record is still present in Past Events (kept after re-post).
5. Click **Remove** on a test archive record → confirm it disappears and the `archived_events` doc is deleted in Firestore.

Expected: re-post creates a fresh forward series with a new `recurring_id`; archive record retained; remove deletes only the archive record.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/AdminDashboard.jsx
git commit -m "feat: re-post modal and archive removal for past events"
```

---

## Task 7: Final full-suite check

- [ ] **Step 1: Run the unit suite and build**

```bash
cd frontend && npm test && npm run lint && npm run build
```

Expected: all unit tests pass; lint clean; build succeeds.

- [ ] **Step 2: Commit any incidental fixes**

If lint/build surfaced fixes, commit them:

```bash
git add -A
git commit -m "chore: lint/build fixes for archive & re-post feature"
```

---

## Deployment note (out of band, done by the maintainer)

The `archived_events` Firestore rule must be deployed for the archive to work in production:

```bash
npx firebase deploy --only firestore:rules
```

Then deploy the frontend as usual (Vercel / Firebase Hosting per existing pipeline).
