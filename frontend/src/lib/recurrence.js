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
