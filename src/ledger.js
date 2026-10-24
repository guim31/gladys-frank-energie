// -----------------------------------------------------------------------------
// Which hours already fired their scene events.
//
// Kept in /data (the one writable volume) so a container restarted a minute
// after 03:00 does not start the dishwasher a second time. Losing the file is
// harmless (at worst one hour fires again); failing to write it is logged in
// debug only, the ledger in memory carries on.
// -----------------------------------------------------------------------------

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'frank-energie:ledger' });
const FILE = 'scene-events.json';

/** @param {string} dataDir */
export function createSceneLedger(dataDir) {
  const path = join(dataDir, FILE);
  // The start (ms) of the last hour whose events are all out.
  let doneUntil = null;
  // The events already out for the hour in progress, when one failed.
  let partial = { slot: null, ids: new Set() };

  return {
    async load() {
      try {
        const saved = JSON.parse(await readFile(path, 'utf8'));
        if (Number.isFinite(saved.done_until)) {
          doneUntil = Math.max(doneUntil ?? saved.done_until, saved.done_until);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.debug(`Scene ledger unreadable, starting afresh (${err.message})`);
        }
      }
    },

    /** @param {Date} start */
    done(start) {
      return doneUntil !== null && start.getTime() <= doneUntil;
    },

    /** @param {Date} start @param {string} id */
    sent(start, id) {
      return partial.slot === start.getTime() && partial.ids.has(id);
    },

    /** @param {Date} start @param {string} id */
    markSent(start, id) {
      if (partial.slot !== start.getTime()) {
        partial = { slot: start.getTime(), ids: new Set() };
      }
      partial.ids.add(id);
    },

    /** @param {Date} start */
    async markDone(start) {
      doneUntil = start.getTime();
      partial = { slot: null, ids: new Set() };
      try {
        await mkdir(dataDir, { recursive: true });
        await writeFile(`${path}.tmp`, JSON.stringify({ done_until: doneUntil }));
        await rename(`${path}.tmp`, path);
      } catch (err) {
        logger.debug(`Scene ledger not saved (${err.message})`);
      }
    },
  };
}
