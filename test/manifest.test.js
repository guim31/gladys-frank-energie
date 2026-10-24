// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CONFIG, LANGUAGES } from '../src/config.js';
import { CHEAP_HOURS, TRIGGER, WINDOW_HOURS } from '../src/triggers.js';
import { WIDGET } from '../src/widget.js';
import { createWorld } from './helpers/world.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const manifest = JSON.parse(await read('../gladys-assistant-integration.json'));
const pkg = JSON.parse(await read('../package.json'));

const keysOf = (list) => (list ?? []).map((entry) => entry.key);

// Minimum version of the manifest `gladys_version` range, e.g. [5, 1, 0].
function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) {
      return version[i] > required[i];
    }
  }
  return true;
}

test('the identity of the integration', () => {
  assert.equal(manifest.type, 'device');
  assert.equal(manifest.name, 'Frank Energie');
  assert.deepEqual(manifest.categories, ['energy']);
  // A public cloud API, nothing on the LAN.
  assert.deepEqual(manifest.transports, ['cloud']);
  assert.equal(manifest.docker_image, `ghcr.io/guim31/gladys-frank-energie:${manifest.version}`);
  assert.equal(
    manifest.cover_image,
    'https://raw.githubusercontent.com/guim31/gladys-frank-energie/main/cover.png',
  );
});

test('categories and capability fields require the right Gladys', () => {
  // Older cores reject any unknown manifest field: categories need 4.86,
  // widgets and scene triggers 5.1. No widget button opens a form (5.2).
  assert.ok(isAtLeast(minGladysVersion(), [5, 1, 0]), manifest.gladys_version);
  assert.match(pkg.dependencies['@gladysassistant/integration-sdk'], /^\^0\.15\./);
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version, 'manifest version must match package.json');
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('config_schema defaults are DEFAULT_CONFIG, and every config key is declared', () => {
  const fields = manifest.config_schema.filter((f) => f.type !== 'section');
  assert.deepEqual(keysOf(fields).sort(), Object.keys(DEFAULT_CONFIG).sort());
  for (const field of fields) {
    assert.equal(field.default, DEFAULT_CONFIG[field.key], `default of ${field.key}`);
    // A public API: nothing to keep secret.
    assert.notEqual(field.type, 'secret');
  }
  const language = fields.find((f) => f.key === 'language');
  assert.deepEqual(
    language.options.map((o) => o.value),
    LANGUAGES,
  );
  assert.equal(language.default, 'fr');
});

test('section fields are purely presentational', () => {
  const sections = manifest.config_schema.filter((f) => f.type === 'section');
  assert.ok(sections.length > 0);
  for (const section of sections) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    assert.equal(section.placeholder, undefined);
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
  // The brand notice the store asks for.
  assert.match(sections[0].description.en, /Not affiliated with Frank Energie/);
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});

test('every manifest action has a handler that answers', async () => {
  const { gladys } = await createWorld();
  assert.deepEqual(keysOf(manifest.actions), ['refresh']);
  for (const key of keysOf(manifest.actions)) {
    const ack = await gladys.fake.action(key);
    assert.equal(ack.success, true, `action ${key}: ${ack.error}`);
  }
});

test('the declared widget is the one the code serves', async () => {
  assert.deepEqual(keysOf(manifest.widgets), Object.values(WIDGET));
  const { gladys } = await createWorld();
  const ack = await gladys.fake.widgetGet(WIDGET.PRICES);
  assert.equal(ack.success, true);
});

test('the scene triggers are the ones the code fires, with the same choices', () => {
  assert.deepEqual(keysOf(manifest.scene_triggers).sort(), Object.values(TRIGGER).sort());
  const options = (key) =>
    manifest.scene_triggers
      .find((t) => t.key === key)
      .fields.find((f) => f.key === 'hours')
      .options.map((o) => o.value);
  assert.deepEqual(options(TRIGGER.CHEAPEST_WINDOW), WINDOW_HOURS.map(String));
  assert.deepEqual(options(TRIGGER.CHEAP_HOUR), CHEAP_HOURS.map(String));
  for (const trigger of manifest.scene_triggers) {
    const hours = trigger.fields.find((f) => f.key === 'hours');
    // One event goes out per matching N: a wildcard would run a scene
    // several times an hour.
    assert.equal(hours.required, true, `${trigger.key}: hours must be required`);
    assert.equal(hours.type, 'select');
    for (const field of trigger.fields) {
      assert.notEqual(field.type, 'boolean', 'a boolean trigger filter cannot say "any"');
    }
  }
});

test('the event data carries exactly the declared variables and filters', async () => {
  // 13:00 in Amsterdam: the cheapest hour of the day begins.
  const { gladys } = await createWorld({ at: '2026-10-24T11:00:30Z' });
  const events = gladys.fake.sceneEvents;
  assert.ok(events.length > 0);
  for (const event of events) {
    const trigger = manifest.scene_triggers.find((t) => t.key === event.key);
    assert.ok(trigger, `undeclared trigger ${event.key}`);
    const declared = [...keysOf(trigger.fields), ...keysOf(trigger.variables)];
    assert.deepEqual(Object.keys(event.data).sort(), [...new Set(declared)].sort());
    for (const variable of trigger.variables) {
      assert.equal(typeof event.data[variable.key], variable.type, variable.key);
    }
  }
});

test('the documentation exists in the four languages', async () => {
  for (const lang of ['en', 'fr', 'de', 'es']) {
    const doc = await read(`../docs/${lang}.md`);
    assert.ok(doc.length >= 300, `docs/${lang}.md`);
    assert.match(doc, /Frank Energie/);
  }
});
