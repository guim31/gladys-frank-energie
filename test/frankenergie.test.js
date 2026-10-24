// -----------------------------------------------------------------------------
// The Frank Energie client, against real answers of the API (recorded on
// 24 October 2026) and a fake fetch: never the network.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_URL,
  fetchMarketPrices,
  FrankEnergieError,
  parseMarketPrices,
  STREAMS,
  VAT_RATE,
} from '../src/frankenergie.js';
import { createFakeApi, FIXTURES, TODAY, TOMORROW } from './helpers/world.js';

test('one day gives 24 hourly electricity and gas prices in each of the four streams', () => {
  const { electricity, gas } = parseMarketPrices(FIXTURES.today);
  for (const stream of STREAMS) {
    assert.equal(electricity[stream].length, 24, stream);
    assert.equal(gas[stream].length, 24, stream);
  }
  const [first] = electricity.all_in_with_vat;
  assert.equal(first.start.toISOString(), '2026-10-23T22:00:00.000Z');
  assert.equal(first.end.toISOString(), '2026-10-23T23:00:00.000Z');
  assert.equal(first.price, 0.16178);
  assert.equal(electricity.market[0].price, 0.02709);
  // VAT included: market price + its VAT, without the float noise.
  assert.equal(electricity.market_with_vat[0].price, 0.03278);
  // All-in without VAT: the markup and the energy tax taken back by 21 %.
  assert.equal(electricity.all_in[0].price, 0.1337);
  for (const [index, slot] of electricity.all_in.entries()) {
    const withVat = electricity.all_in_with_vat[index].price;
    assert.ok(Math.abs(slot.price * (1 + VAT_RATE) - withVat) < 2e-5, `hour ${index}`);
  }
});

test('the day the clocks go back has 25 hours', () => {
  const { electricity } = parseMarketPrices(FIXTURES.tomorrow);
  assert.equal(electricity.all_in_with_vat.length, 25);
  assert.equal(electricity.market.filter((slot) => slot.price < 0).length, 13);
});

test('the gas price changes at 06:00, the start of the gas day', () => {
  const { gas } = parseMarketPrices(FIXTURES.today);
  const prices = gas.all_in_with_vat;
  assert.equal(prices[5].start.toISOString(), '2026-10-24T03:00:00.000Z'); // 05:00
  assert.equal(prices[5].price, 1.8751);
  assert.equal(prices[6].price, 1.90508); // 06:00
  assert.equal(new Set(prices.slice(6).map((slot) => slot.price)).size, 1);
});

test('a day not published yet is empty, any other API error a failure', () => {
  const empty = parseMarketPrices(FIXTURES.notPublished);
  for (const stream of STREAMS) {
    assert.deepEqual(empty.electricity[stream], []);
    assert.deepEqual(empty.gas[stream], []);
  }
  assert.throws(
    () => parseMarketPrices(FIXTURES.invalidDate),
    (err) =>
      err instanceof FrankEnergieError &&
      err.kind === 'api' &&
      /bad is not a valid date/.test(err.message),
  );
  assert.throws(() => parseMarketPrices([]), FrankEnergieError);
  assert.throws(() => parseMarketPrices(null), FrankEnergieError);
  assert.throws(() => parseMarketPrices({ data: null }), FrankEnergieError);
});

test('an unreadable entry is skipped, the others are kept and sorted', () => {
  const entry = (from, till, allInPrice, extra = {}) => ({
    from,
    till,
    marketPrice: 0.01,
    marketPriceTax: 0.0021,
    sourcingMarkupPrice: 0.01815,
    energyTaxPrice: 0.11085,
    allInPrice,
    ...extra,
  });
  const { electricity, gas } = parseMarketPrices({
    data: {
      marketPrices: {
        electricityPrices: [
          entry('2026-10-24T01:00:00Z', '2026-10-24T02:00:00Z', 0.2),
          entry('not a date', '2026-10-24T02:00:00Z', 0.2),
          entry('2026-10-24T02:00:00Z', '2026-10-24T03:00:00Z', 'n/a'),
          entry('2026-10-24T03:00:00Z', '2026-10-24T04:00:00Z', null),
          entry('2026-10-24T04:00:00Z', '2026-10-24T04:00:00Z', 0.2),
          entry('2026-10-24T05:00:00Z', '2026-10-24T06:00:00Z', 0.2, { marketPrice: null }),
          entry('2026-10-24T00:00:00Z', '2026-10-24T01:00:00Z', -0.01),
        ],
        gasPrices: null,
      },
    },
  });
  assert.deepEqual(
    electricity.all_in_with_vat.map((s) => s.price),
    [-0.01, 0.2],
  );
  assert.deepEqual(gas.all_in_with_vat, []);
});

test('the request is a GraphQL POST of one day, and says who it is', async () => {
  const api = createFakeApi();
  const { electricity } = await fetchMarketPrices({ day: TOMORROW, fetch: api.fetch });
  assert.equal(electricity.all_in_with_vat.length, 25);
  const [request] = api.requests;
  assert.equal(request.url, API_URL);
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers['Content-Type'], 'application/json');
  assert.match(request.init.headers['User-Agent'], /^gladys-frank-energie/);
  assert.deepEqual(request.body.variables, { date: TOMORROW });
  assert.match(request.body.query, /marketPrices\(date: \$date\)/);
  assert.match(request.body.query, /electricityPrices \{[^}]*allInPrice/);
  assert.match(request.body.query, /gasPrices \{[^}]*allInPrice/);
});

test('network, HTTP and format failures are told apart', async () => {
  const api = createFakeApi({ [TODAY]: { status: 503, body: {} } });
  await assert.rejects(
    fetchMarketPrices({ day: TODAY, fetch: api.fetch }),
    (err) => err.kind === 'http' && err.status === 503 && /HTTP 503/.test(err.message),
  );
  api.down = true;
  await assert.rejects(
    fetchMarketPrices({ day: TODAY, fetch: api.fetch }),
    (err) => err.kind === 'network' && /unreachable \(ENOTFOUND\)/.test(err.message),
  );
  const garbage = async () => new Response('<html>', { status: 200 });
  await assert.rejects(
    fetchMarketPrices({ day: TODAY, fetch: garbage }),
    (err) => err.kind === 'format',
  );
  // A server that never answers. The AbortSignal.timeout timer does not keep
  // the event loop alive on Node 22: a long timer of its own does.
  const slow = async (url, init) =>
    new Promise((resolve, reject) => {
      const pending = setTimeout(resolve, 60000);
      init.signal.addEventListener('abort', () => {
        clearTimeout(pending);
        reject(init.signal.reason);
      });
    });
  await assert.rejects(
    fetchMarketPrices({ day: TODAY, fetch: slow, timeoutMs: 10 }),
    (err) => err.kind === 'network' && /timeout/.test(err.message),
  );
});
