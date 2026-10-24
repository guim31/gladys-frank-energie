import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig, priceStream } from '../src/config.js';

test('defaults, and the values a form may send as strings', () => {
  assert.deepEqual(normalizeConfig(), DEFAULT_CONFIG);
  assert.deepEqual(
    normalizeConfig({ include_vat: 'false', gas: 'true', language: 'xx', price_kind: '?' }),
    {
      ...DEFAULT_CONFIG,
      include_vat: false,
    },
  );
});

test('the price stream of each configuration', () => {
  const stream = (price_kind, include_vat) =>
    priceStream(normalizeConfig({ price_kind, include_vat }));
  assert.equal(stream('all_in', true), 'all_in_with_vat');
  assert.equal(stream('all_in', false), 'all_in');
  assert.equal(stream('market', true), 'market_with_vat');
  assert.equal(stream('market', false), 'market');
});
