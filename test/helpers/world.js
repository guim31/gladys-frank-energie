// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake Frank Energie API serving
// the real fixtures, a settable clock and a temporary /data, with the
// integration wired on top through createApp — the very wiring index.js uses.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createApp } from '../../src/app.js';

// The integration logs its lifecycle; keep the test output readable
// (LOG_LEVEL is read on every log call). LOG_LEVEL=debug npm test shows them.
process.env.LOG_LEVEL ??= 'silent';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/frank-energie/${name}`, import.meta.url), 'utf8'));

export const TODAY = '2026-10-24';
// The day the clocks go back: 25 hours.
export const TOMORROW = '2026-10-25';

export const FIXTURES = {
  today: fixture('market-prices-2026-10-24.json'),
  tomorrow: fixture('market-prices-2026-10-25.json'),
  notPublished: fixture('not-published-2026-10-26.json'),
  invalidDate: fixture('invalid-date.json'),
};

/** 24 October 2026, 10:30 in Amsterdam (CEST, UTC+2). */
export const DAY_TIME = '2026-10-24T08:30:00Z';

/**
 * A fake Frank Energie GraphQL API. `answers[day]` is a body, a function
 * `(day) => body`, or `{ status, body }`; a day without an answer is "not
 * published yet", the real error of the API. `down` makes every request fail
 * like an unreachable host.
 */
export function createFakeApi(answers = {}) {
  const api = {
    answers: { [TODAY]: FIXTURES.today, [TOMORROW]: FIXTURES.tomorrow, ...answers },
    down: false,
    requests: [],
    async fetch(url, init) {
      const body = JSON.parse(init.body);
      api.requests.push({ url: String(url), init, body, day: body.variables?.date });
      if (api.down) {
        throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
      }
      let answer = api.answers[body.variables?.date] ?? FIXTURES.notPublished;
      if (typeof answer === 'function') {
        answer = answer(body.variables?.date);
      }
      const { status = 200, body: payload = answer } =
        answer && typeof answer.status === 'number' ? answer : {};
      return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    /** Requests sent, for one day or for all. */
    count(day) {
      return api.requests.filter((r) => day === undefined || r.day === day).length;
    },
  };
  return api;
}

/** A clock the test moves by hand. */
export function createClock(iso = DAY_TIME) {
  let current = new Date(iso).getTime();
  return {
    now: () => current,
    set(next) {
      current = new Date(next).getTime();
    },
    advance(ms) {
      current += ms;
    },
  };
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {boolean} [options.created] the user already added the device
 * @param {object} [options.answers] see createFakeApi
 * @param {string} [options.at] the clock, ISO
 * @param {boolean} [options.connect]
 * @param {string} [options.dataDir]
 */
export async function createWorld({
  config = {},
  created = true,
  answers,
  at = DAY_TIME,
  connect = true,
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-frank-energie-')),
} = {}) {
  const api = createFakeApi(answers);
  const clock = createClock(at);
  const gladys = createFakeGladys({ config });
  const app = createApp(gladys, { fetch: api.fetch, now: clock.now, timers: false, dataDir });
  const world = { gladys, api, clock, app, dataDir };
  if (created) {
    // The device as the user added it, before the integration connects.
    const { buildDevice } = await import('../../src/device.js');
    const { normalizeConfig } = await import('../../src/config.js');
    gladys.fake.devices = [buildDevice(gladys, normalizeConfig(config))];
  }
  if (connect) {
    await gladys.connect();
  }
  return world;
}

/** External id of a feature of the Frank Energie device. */
export const featureId = (gladys, key) => gladys.externalIds('prices', 'nl').feature(key);

/** The last state of a feature: a number, or the text of a text feature. */
export function last(gladys, key) {
  const id = featureId(gladys, key);
  const states = gladys.fake.states.filter((s) => s.device_feature_external_id === id);
  const state = states.at(-1);
  return state === undefined ? undefined : (state.text ?? state.state);
}
