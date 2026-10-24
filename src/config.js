// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user in Gladys, from the `config_schema` of
// `gladys-assistant-integration.json`. This module provides the defaults and
// normalizes the received object, so the rest of the code never deals with
// `undefined` or with booleans sent as strings.
// -----------------------------------------------------------------------------

/** The languages every text carries, in this order. */
export const LANGUAGES = ['en', 'fr', 'de', 'es'];

export const PRICE_KINDS = ['all_in', 'market'];

// Defaults: they MUST stay consistent with the `default` values declared in the
// `config_schema` of the manifest (test/manifest.test.js checks it).
export const DEFAULT_CONFIG = {
  // Language of the feature names and of the texts the container writes
  // (a device integration is not told the user's language).
  language: 'fr',
  // 'all_in': what a Frank Energie customer pays per unit (market price +
  // purchasing markup + energy tax); 'market': the EPEX day-ahead price alone.
  price_kind: 'all_in',
  include_vat: true,
  gas: true,
};

const asBoolean = (value, fallback) => {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return fallback;
};

/**
 * Merge the user config with the defaults.
 * @param {Record<string, unknown>} [raw] config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  return {
    language: LANGUAGES.includes(raw.language) ? raw.language : DEFAULT_CONFIG.language,
    price_kind: PRICE_KINDS.includes(raw.price_kind) ? raw.price_kind : DEFAULT_CONFIG.price_kind,
    include_vat: asBoolean(raw.include_vat, DEFAULT_CONFIG.include_vat),
    gas: asBoolean(raw.gas, DEFAULT_CONFIG.gas),
  };
}

/**
 * The API price stream the configuration asks for.
 * @param {ReturnType<typeof normalizeConfig>} config
 */
export function priceStream(config) {
  const base = config.price_kind === 'market' ? 'market' : 'all_in';
  return config.include_vat ? `${base}_with_vat` : base;
}
