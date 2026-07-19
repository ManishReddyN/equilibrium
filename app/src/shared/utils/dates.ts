/**
 * Vanilla Date/Intl helpers -- no date-fns/dayjs dependency, since the app's
 * date needs are narrow (bucket assignments, format a cool-off countdown,
 * format ledger timestamps) and don't justify an extra dependency to pin.
 */

export type DueBucket = 'overdue' | 'today' | 'upcoming';

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Buckets an assignment's `target_completion_date` relative to `now` for the
 * dashboard's Today / Overdue / Upcoming sections. "Overdue" means the
 * deadline has passed and the day isn't today; a same-day-but-past deadline
 * still counts as "today" (still actionable today, not yet a broken promise).
 */
export function bucketDueDate(dueDate: Date, now: Date = new Date()): DueBucket {
  if (isSameDay(dueDate, now)) {
    return 'today';
  }
  return dueDate.getTime() < startOfDay(now).getTime() ? 'overdue' : 'upcoming';
}

/** "Today" / "Tomorrow" / "Mon, Jan 5" -- for row subtitles and section headers. */
export function formatDueDate(date: Date, now: Date = new Date()): string {
  if (isSameDay(date, now)) {
    return 'Today';
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "Mon, Jan 5, 3:45 PM" -- for ledger history rows. */
export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a millisecond duration as "Xh Ym" (feedback cool-off countdown,
 * e.g. "Delivers in 3h 20m"). Clamps negative durations to "0m" rather than
 * showing a negative countdown -- by the time it's due for release the RLS
 * policy already allows the read, so the UI moves it out of "pending" instead.
 */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}
