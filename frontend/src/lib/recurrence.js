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

// Add n calendar months to a date, clamping the day to the last valid day of the target month.
function addMonths(date, n) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const lastDayOfTarget = new Date(y, m + n + 1, 0).getDate(); // day 0 of next month = last day
  return new Date(y, m + n, Math.min(d, lastDayOfTarget));
}

// Returns an array of YYYY-MM-DD strings from start..until inclusive.
// type: 'weekly' | 'fortnightly' | 'monthly'. Unknown types return [start].
export function generateOccurrenceDates(startStr, untilStr, type) {
  const until = parseYmd(untilStr);
  const startDate = parseYmd(startStr);
  const dates = [];
  let curr = startDate;
  let monthIndex = 0;
  while (curr <= until) {
    dates.push(toYmd(curr));
    if (type === 'weekly') {
      curr = new Date(curr); curr.setDate(curr.getDate() + 7);
    } else if (type === 'fortnightly') {
      curr = new Date(curr); curr.setDate(curr.getDate() + 14);
    } else if (type === 'monthly') {
      monthIndex += 1;
      curr = addMonths(startDate, monthIndex);
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
  const max = addMonths(start, 6);
  if (until > max) {
    throw new Error('To keep performance high, a recurring series cannot repeat for more than 6 months.');
  }
}

export function newRecurringId() {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
