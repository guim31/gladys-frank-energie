// -----------------------------------------------------------------------------
// Read the real Frank Energie prices of today and tomorrow, read-only, through
// the client the integration uses — to run from a machine that has the network:
//
//   node scripts/probe.mjs [YYYY-MM-DD]
//
// No account, no key, nothing sensitive: public market prices.
// -----------------------------------------------------------------------------

import { fetchMarketPrices, STREAMS } from '../src/frankenergie.js';
import { slotAt, slotsOfDay, summarize } from '../src/prices.js';
import { addDays, marketDay, marketTime } from '../src/time.js';

const today = process.argv[2] ?? marketDay(new Date());
let failed = false;

for (const day of [today, addDays(today)]) {
  try {
    const started = Date.now();
    const answer = await fetchMarketPrices({ day });
    console.log(`\n${day} (${Date.now() - started} ms)`);
    for (const energy of ['electricity', 'gas']) {
      for (const stream of STREAMS) {
        const slots = slotsOfDay(answer[energy][stream], day);
        const summary = summarize(slots);
        const current = slotAt(slots, new Date());
        console.log(
          `  ${energy.padEnd(11)} ${stream.padEnd(16)} ${String(slots.length).padStart(3)} slots` +
            (summary
              ? `, avg ${summary.average.toFixed(4)}, min ${summary.min.price} at ${marketTime(summary.min.start)}` +
                `, max ${summary.max.price} at ${marketTime(summary.max.start)}`
              : ', not published yet') +
            (current ? `, now ${current.price}` : ''),
        );
      }
    }
  } catch (err) {
    failed = true;
    console.error(`${day}: ${err.message}`);
  }
}

process.exitCode = failed ? 1 : 0;
