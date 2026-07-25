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
