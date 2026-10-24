// -----------------------------------------------------------------------------
// The price widget: what the card shows, within the core's vocabulary and
// budget (validateWidgetContent is the SDK's copy of the core checks).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WIDGET } from '../src/widget.js';
import { createWorld, TOMORROW } from './helpers/world.js';

async function content(world, language = 'en') {
  const ack = await world.gladys.fake.widgetGet(WIDGET.PRICES, { language });
  assert.equal(ack.success, true, ack.error);
  return ack.data.content;
}

const byType = (c, type) => c.components.filter((component) => component.type === type);

test('today and tomorrow, the current price and the cheapest hours', async () => {
  const world = await createWorld();
  const c = await content(world);
  assert.deepEqual(validateWidgetContent(c), []);
  assert.equal(byType(c, 'text')[0].text, 'All-in price, VAT included');
  assert.deepEqual(
    byType(c, 'value').map((v) => [v.label, v.value, v.unit]),
    [
      ['Now', 0.17, '€/kWh'],
      ['Next hour', 0.148, '€/kWh'],
      ['Today average', 0.17, '€/kWh'],
    ],
  );
  const [chart] = byType(c, 'chart');
  assert.equal(chart.chart_type, 'stepline');
  assert.equal(chart.now_marker, true);
  assert.deepEqual(
    chart.series.map((s) => [s.name, s.points.length]),
    [
      ['Today', 24],
      ['Tomorrow', 25],
    ],
  );
  assert.deepEqual(
    chart.annotations.map((a) => a.label),
    ['Min 13:00', 'Max 19:00', 'Min 13:00', 'Max 18:00'],
  );
  const [status] = byType(c, 'status');
  assert.deepEqual(
    status.items.map((i) => i.label),
    ['Cheapest today', 'Cheapest tomorrow', 'Tomorrow average', 'Gas today'],
  );
  assert.equal(status.items[0].value, '13:00 · 0.134 €/kWh');
  // Until the next hour, when the current price changes.
  assert.equal(c.ttl_seconds, 1805);
});

test('in the four languages, numbers in the local format', async () => {
  const world = await createWorld();
  const fr = await content(world, 'fr');
  assert.equal(byType(fr, 'status')[0].items[0].value, '13:00 · 0,134 €/kWh');
  assert.equal(byType(fr, 'value')[0].label, 'Maintenant');
  const de = await content(world, 'de');
  assert.equal(byType(de, 'text')[0].text, 'Endpreis inklusive MwSt.');
  const es = await content(world, 'es');
  assert.equal(byType(es, 'chart')[0].series[1].name, 'Mañana');
  for (const c of [fr, de, es]) {
    assert.deepEqual(validateWidgetContent(c), []);
  }
});

test("before publication, tomorrow's prices are announced, not invented", async () => {
  const world = await createWorld({
    answers: { [TOMORROW]: undefined },
    config: { gas: false, price_kind: 'market', include_vat: false },
  });
  const c = await content(world);
  assert.deepEqual(validateWidgetContent(c), []);
  assert.equal(byType(c, 'chart')[0].series.length, 1);
  assert.equal(byType(c, 'chart')[0].annotations.length, 2);
  assert.deepEqual(
    byType(c, 'status')[0].items.map((i) => [i.label, i.value]),
    [
      ['Cheapest today', '13:00 · 0.004 €/kWh'],
      ['Tomorrow', 'Not published yet'],
    ],
  );
  assert.equal(byType(c, 'text')[0].text, 'Market price (EPEX day-ahead), VAT excluded');
});

test('without any price, one sentence', async () => {
  const world = await createWorld();
  world.api.down = true;
  const empty = await createWorld({ answers: { '2026-10-24': { status: 503, body: {} } } });
  const c = await content(empty, 'es');
  assert.deepEqual(validateWidgetContent(c), []);
  assert.deepEqual(byType(c, 'text').length, 1);
  assert.match(byType(c, 'text')[0].text, /Todavía no se ha recibido ningún precio/);
});
