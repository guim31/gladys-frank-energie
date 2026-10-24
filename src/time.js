// -----------------------------------------------------------------------------
// The market clock.
//
// Frank Energie prices the Dutch day-ahead market: a "day" is a calendar day of
// Europe/Amsterdam, whatever the timezone of the Gladys host (the supervisor
// injects TZ, but a Gladys set to UTC must not shift the cheapest hour of the
// day by one or two hours). Every date shown to the user (the hour of the
// minimum price, the scene variables) is in this clock too, the one the
// supplier's app and contract use.
// -----------------------------------------------------------------------------

export const MARKET_TIMEZONE = 'Europe/Amsterdam';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: MARKET_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * @param {Date} date
 * @returns {{ year: string, month: string, day: string, hour: string, minute: string }}
 */
function parts(date) {
  const found = {};
  for (const { type, value } of formatter.formatToParts(date)) {
    found[type] = value;
  }
  return found;
}

/**
 * The market day of an instant, `YYYY-MM-DD` (also the `date` argument of the
 * Frank Energie API).
 * @param {Date} date
 */
export function marketDay(date) {
  const { year, month, day } = parts(date);
  return `${year}-${month}-${day}`;
}

/**
 * The market day after `day` (pure calendar arithmetic: no DST pitfall).
 * @param {string} day `YYYY-MM-DD`
 * @param {number} [offset] days to add, 1 by default
 */
export function addDays(day, offset = 1) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + offset)).toISOString().slice(0, 10);
}

/**
 * The market clock time of an instant, `HH:MM`.
 * @param {Date} date
 */
export function marketTime(date) {
  const { hour, minute } = parts(date);
  return `${hour}:${minute}`;
}

/**
 * The hour of the market clock, 0 to 23.
 * @param {Date} date
 */
export function marketHour(date) {
  return Number(parts(date).hour);
}
