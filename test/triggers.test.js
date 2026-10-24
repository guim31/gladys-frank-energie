// -----------------------------------------------------------------------------
// The scene triggers: which events go out when an hour begins, once.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarketPrices } from '../src/frankenergie.js';
import { slotsOfDay } from '../src/prices.js';
import { eventsForSlot, TRIGGER } from '../src/triggers.js';
import { createWorld, FIXTURES } from './helpers/world.js';

const day = slotsOfDay(parseMarketPrices(FIXTURES.today).electricity.all_in_with_vat, '2026-10-24');
const at = (hour) => day[hour]; // the slot starting at hour:00 in Amsterdam
const summary = (events) => events.map((e) => `${e.key}:${e.data.hours}`);

test('13:00, the cheapest hour of 24 October: every "N cheapest hours" and the short windows', () => {
  const events = eventsForSlot(day, at(13));
  assert.deepEqual(summary(events), [
    'cheapest_window_started:1',
    'cheapest_window_started:2',
    'cheapest_window_started:3',
    'cheap_hour_started:1',
    'cheap_hour_started:2',
    'cheap_hour_started:3',
    'cheap_hour_started:4',
    'cheap_hour_started:5',
    'cheap_hour_started:6',
    'cheap_hour_started:8',
    'cheap_hour_started:10',
    'cheap_hour_started:12',
  ]);
  assert.deepEqual(events[0].data, {
    hours: '1',
    average_price: 0.13377,
    start_time: '13:00',
    end_time: '14:00',
  });
  assert.deepEqual(events[3].data, {
    hours: '1',
    rank: 1,
    price: 0.13377,
    start_time: '13:00',
    end_time: '14:00',
  });
});

test('the longer windows begin earlier, around the sunny afternoon', () => {
  const started = (hour) =>
    eventsForSlot(day, at(hour))
      .filter((e) => e.key === TRIGGER.CHEAPEST_WINDOW)
      .map((e) => Number(e.data.hours));
  const byHour = Object.fromEntries(
    day.map((_, hour) => [hour, started(hour)]).filter(([, list]) => list.length > 0),
  );
  // Each N begins exactly once a day: 5 and 6 hours from 11:00, 8 from 09:00.
  assert.deepEqual(byHour, { 9: [8], 11: [5, 6], 12: [4], 13: [1, 2, 3] });
  const six = eventsForSlot(day, at(11)).find((e) => e.data.hours === '6');
  assert.equal(six.data.start_time, '11:00');
  assert.equal(six.data.end_time, '17:00');
});

test('19:00, the most expensive hour, fires nothing', () => {
  assert.deepEqual(eventsForSlot(day, at(19)), []);
  // A slot of another day is never compared with this one.
  assert.deepEqual(eventsForSlot(day.slice(1), at(0)), []);
});

test('each N cheapest hours fires exactly N times a day', () => {
  const counts = {};
  for (const slot of day) {
    for (const event of eventsForSlot(day, slot)) {
      if (event.key === TRIGGER.CHEAP_HOUR) {
        counts[event.data.hours] = (counts[event.data.hours] ?? 0) + 1;
      }
    }
  }
  assert.deepEqual(counts, { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 8, 10: 10, 12: 12 });
});

test('the events go out when the hour begins, once, even across a restart', async () => {
  const world = await createWorld({ at: '2026-10-24T10:59:30Z' }); // 12:59:30
  const before = world.gladys.fake.sceneEvents.length;
  world.clock.set('2026-10-24T11:00:02Z');
  await world.app.cycle();
  const fired = world.gladys.fake.sceneEvents.length - before;
  assert.equal(fired, 12);
  world.clock.set('2026-10-24T11:01:02Z');
  await world.app.cycle();
  assert.equal(world.gladys.fake.sceneEvents.length - before, 12, 'once');

  // The container restarts at 13:02 with the same /data: nothing again.
  const restarted = await createWorld({ at: '2026-10-24T11:02:00Z', dataDir: world.dataDir });
  assert.equal(restarted.gladys.fake.sceneEvents.length, 0);
});

test('an hour that began more than 10 minutes ago fires nothing', async () => {
  const world = await createWorld({ at: '2026-10-24T11:11:00Z' }); // 13:11
  assert.deepEqual(world.gladys.fake.sceneEvents, []);
  const onTime = await createWorld({ at: '2026-10-24T11:09:00Z' });
  assert.equal(onTime.gladys.fake.sceneEvents.length, 12);
});

test('a refused event is sent again on the next cycle, the others are not duplicated', async (t) => {
  const world = await createWorld({ at: '2026-10-24T10:59:30Z' });
  const original = world.gladys.publishSceneEvent.bind(world.gladys);
  let calls = 0;
  t.mock.method(world.gladys, 'publishSceneEvent', async (key, data) => {
    calls += 1;
    if (calls === 3) {
      throw new Error('429 TOO_MANY_REQUESTS');
    }
    return original(key, data);
  });
  world.clock.set('2026-10-24T11:00:02Z');
  await world.app.cycle();
  assert.equal(world.gladys.fake.sceneEvents.length, 2);
  world.clock.set('2026-10-24T11:01:02Z');
  await world.app.cycle();
  const sent = world.gladys.fake.sceneEvents.map((e) => `${e.key}:${e.data.hours}`);
  assert.equal(sent.length, 12);
  assert.equal(new Set(sent).size, 12);
});
