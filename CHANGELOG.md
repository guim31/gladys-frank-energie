# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-10-24

### Added

- The Frank Energie device: current and next hour electricity price, average,
  lowest and highest price of the day with their hour, rank of the current hour
  (1 = cheapest) and gas price of the gas day, refreshed by the integration
  itself from the public prices of Frank Energie (no account needed).
- Choice of the price: all-in price per unit or EPEX day-ahead market price,
  with or without VAT; gas price optional.
- "Electricity prices" dashboard widget: current, next and average price, chart
  of today and tomorrow with the cheapest and most expensive hours, gas price.
- Scene triggers "Cheapest hours of the day begin" and "One of the cheapest
  hours begins".
- "Refresh the prices now" button in the configuration.
- English, French, German and Spanish texts and documentation.

[Unreleased]: https://github.com/guim31/gladys-frank-energie/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-frank-energie/releases/tag/v1.0.0
