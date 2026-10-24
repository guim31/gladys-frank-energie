// -----------------------------------------------------------------------------
// The price computations and the market clock, DST days included.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarketPrices } from '../src/frankenergie.js';
import {
  cheapestWindow,
  rankOf,
  roundPrice,
  slotAfter,
  slotAt,
  slotsOfDay,
  summarize,
} from '../src/prices.js';
import { addDays, marketDay, marketHour, marketTime } from '../src/time.js';
import { FIXTURES } from './helpers/world.js';

const slots = [FIXTURES.today, FIXTURES.tomorrow].flatMap(
  (body) => parseMarketPrices(body).electricity.all_in_with_vat,
);
const day = slotsOfDay(slots, '2026-10-24');

/** Hourly slots from `startIso`, one per price. */
function hourly(startIso, prices) {
  const start = new Date(startIso).getTime();
  return prices.map((price, index) => ({
    start: new Date(start + index * 3600000),
    end: new Date(start + (index + 1) * 3600000),
    price,
  }));
}

test('a market day runs from midnight to midnight in Amsterdam', () => {
  assert.equal(day.length, 24);
  assert.equal(day[0].start.toISOString(), '2026-10-23T22:00:00.000Z');
  assert.equal(marketTime(day[0].start), '00:00');
  assert.equal(day.at(-1).end.toISOString(), '2026-10-24T22:00:00.000Z');
  assert.equal(slotsOfDay(slots, '2026-10-26').length, 0);
});

test('average, minimum and maximum of the day, the earliest hour on a tie', () => {
  const summary = summarize(day);
  assert.equal(roundPrice(summary.average), 0.16968);
  assert.equal(summary.min.price, 0.13377);
  assert.equal(marketTime(summary.min.start), '13:00');
  assert.equal(summary.max.price, 0.25391);
  assert.equal(marketTime(summary.max.start), '19:00');
  assert.equal(summarize([]), null);
  const tie = hourly('2026-10-24T00:00:00Z', [0.3, 0.1, 0.1]);
  assert.equal(summarize(tie).min, tie[1]);
});

test('every hour has its own rank, 1 the cheapest', () => {
  const ranks = day.map((slot) => rankOf(day, slot));
  assert.deepEqual(
    [...ranks].sort((a, b) => a - b),
    Array.from({ length: 24 }, (_, i) => i + 1),
  );
  assert.equal(rankOf(day, day[13]), 1); // 13:00
  assert.equal(rankOf(day, day[14]), 2); // 14:00
  assert.equal(rankOf(day, day[19]), 24); // 19:00, the most expensive
  const tie = hourly('2026-10-24T00:00:00Z', [0.1, 0.1]);
  assert.deepEqual(
    tie.map((slot) => rankOf(tie, slot)),
    [1, 2],
  );
});

test('the cheapest window of consecutive hours', () => {
  const one = cheapestWindow(day, 1);
  assert.equal(marketTime(one.start), '13:00');
  const four = cheapestWindow(day, 4);
  assert.equal(marketTime(four.start), '12:00');
  assert.equal(marketTime(four.end), '16:00');
  assert.equal(four.average, (day[12].price + day[13].price + day[14].price + day[15].price) / 4);
  assert.equal(cheapestWindow(day.slice(0, 2), 3), null);
  // A gap (an hour missing in the answer) breaks a window.
  const withGap = hourly('2026-10-24T00:00:00Z', [0.3, 0.1, 0.1, 0.3]);
  withGap.splice(2, 1);
  assert.equal(cheapestWindow(withGap, 2).average, 0.2);
});

test('current and next hour', () => {
  const at = new Date('2026-10-24T08:30:00Z');
  const current = slotAt(slots, at);
  assert.equal(current.start.toISOString(), '2026-10-24T08:00:00.000Z');
  assert.equal(slotAfter(slots, current).start.toISOString(), '2026-10-24T09:00:00.000Z');
  assert.equal(slotAt(slots, new Date('2030-01-01T00:00:00Z')), null);
  assert.equal(slotAfter(slots, slots.at(-1)), null);
});

test('the market clock on the DST days: 23 and 25 hours', () => {
  // 29 March 2026: 02:00 does not exist. 25 October 2026: 02:00 twice, in
  // the real answer of Frank Energie too.
  const spring = hourly('2026-03-28T23:00:00Z', new Array(23).fill(0.2));
  assert.equal(slotsOfDay(spring, '2026-03-29').length, 23);
  assert.equal(marketTime(spring[2].start), '03:00');
  const autumn = slotsOfDay(slots, '2026-10-25');
  assert.equal(autumn.length, 25);
  assert.equal(marketTime(autumn[2].start), '02:00');
  assert.equal(marketTime(autumn[3].start), '02:00');

  assert.equal(marketDay(new Date('2026-10-24T22:30:00Z')), '2026-10-25');
  assert.equal(marketDay(new Date('2026-10-24T21:30:00Z')), '2026-10-24');
  assert.equal(addDays('2026-10-25'), '2026-10-26');
  assert.equal(addDays('2026-12-31'), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(marketHour(new Date('2026-10-24T11:05:00Z')), 13);
});
