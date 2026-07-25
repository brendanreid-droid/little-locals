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

  it('monthly: clamps month-end start dates and anchors to the original day', () => {
    expect(generateOccurrenceDates('2026-01-31', '2026-04-30', 'monthly'))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
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
