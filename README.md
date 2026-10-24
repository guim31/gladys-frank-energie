# Frank Energie for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) integration for the **dynamic
electricity and gas prices** of [Frank Energie](https://www.frankenergie.nl), the
Dutch supplier: the price of the current hour, the cheapest hours of the day, a
chart of today and tomorrow, and scene triggers to run appliances when electricity
is cheapest. Public prices: no account, no API key.

Tested against the live Frank Energie API, but developed without a Frank Energie
contract: feedback welcome.

## Features

- **One device, read-only**: current price, next hour price, average, lowest and
  highest price of the day with the hour of the lowest and of the highest, rank of
  the current hour (1 = cheapest), gas price of the gas day. €/kWh and €/m³.
- **Price kind**: the all-in price per unit (market price + purchasing markup +
  energy tax, what a Frank Energie customer pays per kWh) or the EPEX day-ahead
  market price of the NL zone, with or without VAT.
- **Dashboard widget** "Electricity prices": tiles for now, next hour and today's
  average, a step chart of today and tomorrow with the minimum and maximum marked,
  the cheapest hours and the gas price.
- **Scene triggers**: "Cheapest hours of the day begin" (the cheapest run of 1 to 8
  consecutive hours — to start a dishwasher once) and "One of the cheapest hours
  begins" (each of the N cheapest hours — for a boiler, a charger).
- Feature names and widget in English, French, German and Spanish.

It mirrors the [EnergyZero integration](https://github.com/guim31/gladys-energyzero)
(same device, widget and triggers): pick the one of your supplier.

## Requirements

- Gladys Assistant **5.1.0** or later.
- Internet access from Gladys to `graphql.frankenergie.nl`.

## Installation

In Gladys: **Integrations → Install from GitHub**, enter
`https://github.com/guim31/gladys-frank-energie`. Then add the Frank Energie device
from the **Discovery** tab, and the "Electricity prices" widget on a dashboard.

The user documentation, in four languages, is in [`docs/`](docs/en.md).

## How it works

The container sends the public GraphQL query `marketPrices(date:)` to
`https://graphql.frankenergie.nl` (the query the `python-frank-energie` library
uses without logging in): one request per market day, answering the hourly
electricity prices and the gas prices of that day. It asks for today and tomorrow
once an hour, every 15 minutes from 13:00 until tomorrow's prices are out, and backs
off after a failure; the last known prices stay in use meanwhile. A timer in the
container refreshes the states every minute (the core's `onPoll` is only a
fallback, Gladys#3198), publishes only what changed (plus a 6-hour heartbeat) and
fires the scene triggers when an hour begins. A day is a market day of
Europe/Amsterdam, whatever the timezone of Gladys.

## Limitations

- Hourly prices (the market trades quarter hours since October 2025; the API can
  give them, this version shows the hourly averages).
- Public prices only: the Frank Energie login (personal prices, consumption, costs,
  smart charging) is out of scope.
- The all-in price without VAT is derived with the Dutch VAT rate (21 %): the API
  publishes the all-in price VAT included only.
- The triggers consider the current day only: a cheapest run never spans midnight.
- Read-only: the integration controls nothing.

## Development

Node.js 22+, ESM, no build step. The only runtime dependency is
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

```bash
npm install
npm test              # node --test, against the SDK's fake Gladys and a fake API
npm run lint
npm run format:check
npx github:GladysAssistant/integration-store .   # store validator
node scripts/probe.mjs                            # the real prices of today (network)
```

```
index.js              SDK wiring (src/app.js registers the handlers)
src/app.js            refresh cycle, states, scene events, action, widget, lifecycle
src/frankenergie.js   client of the public GraphQL price API
src/market.js         known prices and refresh policy
src/prices.js         pure computations (current, rank, cheapest window...)
src/device.js         the device and its states
src/triggers.js       scene events of an hour that begins
src/widget.js         the "Electricity prices" widget
src/ledger.js         hours whose scene events are out, kept in /data
src/time.js           the Amsterdam market clock
src/i18n.js           every user-facing text, four languages
test/fixtures/        real API answers (24 and 25 October 2026), Gladys feature table
```

To run it outside Gladys:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="frank-energie" \
FRANK_ENERGIE_DATA_DIR=./data \
npm start
```

Releases are made by the **Release** workflow (Actions → Release); never edit
the versions by hand. A hand-pushed `vX.Y.Z` tag also builds the image and the
GitHub Release, but then `version` in `package.json` and in the manifest (with
the `docker_image` tag) must be bumped and committed before tagging. See
[`CLAUDE.md`](CLAUDE.md) for the project rules.

## Credits

- [python-frank-energie](https://github.com/DCSBL/python-frank-energie) by DCSBL
  (Apache-2.0, continued by [HiDiHo01](https://github.com/HiDiHo01/python-frank-energie))
  and the Home Assistant
  [`frank_energie`](https://github.com/bajansen/home-assistant-frank_energie)
  custom integration by bajansen (continued by
  [HiDiHo01](https://github.com/HiDiHo01/home-assistant-frank_energie), MIT): the
  public GraphQL query and its fields. No code is copied from them.
- [gladys-energyzero](https://github.com/guim31/gladys-energyzero): the device,
  widget, triggers and refresh policy this integration takes up.

- Cover: the official Frank Energie logo, from the header of
  [frankenergie.nl](https://www.frankenergie.nl), on the brand color.

## Disclaimer

This project is not affiliated with, endorsed or sponsored by Frank Energie.
"Frank Energie" is a trademark of its owner. The prices are informational: check
your contract.

## License

[Apache-2.0](LICENSE)
