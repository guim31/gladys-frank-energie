// -----------------------------------------------------------------------------
// Frank Energie public price API (no account, no key).
//
//   POST https://graphql.frankenergie.nl
//   query MarketPrices($date: String!) {
//     marketPrices(date: $date) { electricityPrices { ... } gasPrices { ... } }
//   }
//
// The query the `python-frank-energie` library uses, and so the Home Assistant
// `frank_energie` integration, without logging in. One request answers one
// market day (`YYYY-MM-DD`, Amsterdam time): 23, 24 or 25 hourly electricity
// prices, and the hourly gas prices of the same hours (one price per gas day,
// 06:00 to 06:00, repeated hour by hour). Every entry is
//
//   { from, till, marketPrice, marketPriceTax, sourcingMarkupPrice,
//     energyTaxPrice, perUnit, allInPrice }
//
// in EUR/kWh (electricity) or EUR/m³ (gas): `marketPrice` is the EPEX
// day-ahead price VAT excluded, `marketPriceTax` the VAT on it; the markup
// and the energy tax come VAT included, and `allInPrice` is their sum: what a
// Frank Energie customer pays per unit, before the fixed monthly costs.
//
// A day not published yet (tomorrow before 13:00-15:00) is no empty list but
// a GraphQL error, `No marketprices found for segment ELECTRICITY for <day>`,
// for the gas too: both segments come and go together.
// -----------------------------------------------------------------------------

export const API_URL = 'https://graphql.frankenergie.nl';

const FIELDS =
  'from till marketPrice marketPriceTax sourcingMarkupPrice energyTaxPrice perUnit allInPrice';
export const QUERY =
  'query MarketPrices($date: String!) { marketPrices(date: $date) { ' +
  `electricityPrices { ${FIELDS} } gasPrices { ${FIELDS} } } }`;

export const STREAMS = ['market', 'market_with_vat', 'all_in', 'all_in_with_vat'];

// The Dutch VAT. Frank Energie publishes the all-in price VAT included only:
// its markup and energy tax are taken back to VAT excluded with this rate.
export const VAT_RATE = 0.21;

const NOT_PUBLISHED = /no marketprices found/i;
const USER_AGENT = 'gladys-frank-energie (+https://github.com/guim31/gladys-frank-energie)';

/** A failed request, with what the user can be told about it. */
export class FrankEnergieError extends Error {
  /**
   * @param {string} message
   * @param {{ kind: 'network' | 'http' | 'api' | 'format', status?: number }} details
   */
  constructor(message, { kind, status }) {
    super(message);
    this.name = 'FrankEnergieError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Read the prices of one market day.
 * @param {object} options
 * @param {string} options.day `YYYY-MM-DD`
 * @param {typeof fetch} [options.fetch]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{ electricity: Record<string, Array>, gas: Record<string, Array> }>}
 *   one sorted list of slots `{ start, end, price }` per stream, all empty when
 *   the day is not published yet
 */
export async function fetchMarketPrices({ day, fetch = globalThis.fetch, timeoutMs = 15000 }) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        operationName: 'MarketPrices',
        query: QUERY,
        variables: { date: day },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timeout' : (err?.cause?.code ?? err?.message);
    throw new FrankEnergieError(`Frank Energie unreachable (${reason})`, { kind: 'network' });
  }

  if (!response.ok) {
    throw new FrankEnergieError(`Frank Energie answered HTTP ${response.status}`, {
      kind: 'http',
      status: response.status,
    });
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new FrankEnergieError('Frank Energie sent an unreadable answer', { kind: 'format' });
  }
  return parseMarketPrices(body);
}

/**
 * Turn a GraphQL answer into sorted slots. Unreadable entries are skipped one
 * by one: a single malformed hour must not hide the other 23.
 * @param {unknown} body
 */
export function parseMarketPrices(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new FrankEnergieError('Frank Energie sent an unexpected answer', { kind: 'format' });
  }
  const errors = Array.isArray(body.errors) ? body.errors : [];
  const prices = body.data?.marketPrices;
  if (!prices) {
    if (errors.length > 0 && errors.every((error) => NOT_PUBLISHED.test(error?.message ?? ''))) {
      return { electricity: emptyStreams(), gas: emptyStreams() };
    }
    if (errors.length > 0) {
      // A message of the API itself ("bad is not a valid date"): no secret.
      const message = String(errors[0]?.message ?? 'unknown error').slice(0, 120);
      throw new FrankEnergieError(`Frank Energie refused the request (${message})`, {
        kind: 'api',
      });
    }
    throw new FrankEnergieError('Frank Energie sent an unexpected answer', { kind: 'format' });
  }
  return {
    electricity: parseEntries(prices.electricityPrices),
    gas: parseEntries(prices.gasPrices),
  };
}

/** @param {unknown} entries */
function parseEntries(entries) {
  const streams = emptyStreams();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const start = new Date(entry?.from);
    const end = new Date(entry?.till);
    const market = toNumber(entry?.marketPrice);
    const marketTax = toNumber(entry?.marketPriceTax);
    const markup = toNumber(entry?.sourcingMarkupPrice);
    const energyTax = toNumber(entry?.energyTaxPrice);
    const allIn = toNumber(entry?.allInPrice);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start ||
      [market, marketTax, markup, energyTax, allIn].includes(null)
    ) {
      continue;
    }
    // Sums rounded to the 5 decimals the API carries: no 0.031580000000000004.
    const slot = (price) => ({ start, end, price: Math.round(price * 1e5) / 1e5 });
    streams.market.push(slot(market));
    streams.market_with_vat.push(slot(market + marketTax));
    streams.all_in.push(slot(market + (markup + energyTax) / (1 + VAT_RATE)));
    streams.all_in_with_vat.push(slot(allIn));
  }
  for (const stream of STREAMS) {
    streams[stream].sort((a, b) => a.start - b.start);
  }
  return streams;
}

/** @param {unknown} value */
function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function emptyStreams() {
  return Object.fromEntries(STREAMS.map((stream) => [stream, []]));
}
