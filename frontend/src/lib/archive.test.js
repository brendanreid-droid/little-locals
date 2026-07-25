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
