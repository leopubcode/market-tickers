/** Calendar helpers on YYYY-MM-DD strings, always in UTC. */

export const toDay = (d: Date): string => d.toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toDay(d);
}

function isWeekday(day: string): boolean {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** `day` itself when it is a weekday, otherwise the Friday before it. */
export function latestWeekday(day: string): string {
  let d = day;
  while (!isWeekday(d)) d = addDays(d, -1);
  return d;
}

export function weekdaysBack(day: string, n: number): string {
  let d = day;
  for (let left = n; left > 0; ) {
    d = addDays(d, -1);
    if (isWeekday(d)) left--;
  }
  return d;
}

/** `day` itself when it is a weekday, otherwise the Monday after it. */
export function nextWeekday(day: string): string {
  let d = day;
  while (!isWeekday(d)) d = addDays(d, 1);
  return d;
}
