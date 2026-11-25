// docs/HOW-IT-WORKS.md must keep up with src/feeds.js. Its tables are
// generated (build.mjs --check covers them); these check the prose parts.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startingFeeds, MATERIALS } = require('../dist/feeds.cjs');

const root = path.join(__dirname, '..');
const doc = fs.readFileSync(path.join(root, 'docs', 'HOW-IT-WORKS.md'), 'utf8');
const src = fs.readFileSync(path.join(root, 'src', 'feeds.js'), 'utf8');
const section = (title) => {
  const a = doc.indexOf(`## ${title}\n`);
  assert.ok(a >= 0, `docs/HOW-IT-WORKS.md has no "## ${title}" section`);
  const b = doc.indexOf('\n## ', a + 1);
  return doc.slice(a, b < 0 ? undefined : b);
};
// The code of startingFeeds without its comments.
const code = src.slice(src.indexOf('export function startingFeeds'))
  .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('every constant in startingFeeds is in the docs', () => {
  const constants = section('Constants');
  const found = new Set([...code.matchAll(/(?<![\w.])(\d+(?:\.\d+)?(?:e-?\d+)?)(?![\w.])/g)].map((m) => m[1]));
  const missing = [...found].filter((v) => !constants.includes(`| \`${v}\` |`));
  assert.deepEqual(missing, [], `add these to the Constants table in docs/HOW-IT-WORKS.md: ${missing.join(', ')}`);
});

test('every input, material field and result field is in the docs', () => {
  const names = new Set();
  for (const m of Object.values(MATERIALS)) Object.keys(m).forEach((k) => names.add(k));
  Object.keys(startingFeeds(6.35, 2, 'mdf')).forEach((k) => names.add(k));
  for (const m of code.matchAll(/\b(?:L|D)\.(\w+)/g)) names.add(m[1]);
  const missing = [...names].filter((n) => !doc.includes(`\`${n}\``) && !doc.includes(`.${n}\``));
  assert.deepEqual(missing, [], `explain these in docs/HOW-IT-WORKS.md: ${missing.join(', ')}`);
});

test('the step-by-step numbers match the code', () => {
  const f = startingFeeds(6.35, 2, 'mdf');
  const steps = section('Step by step');
  for (const v of [`${f.rpm}`, '0.0762 mm', `${f.feedMm} mm/min`, `${f.plungeMm} mm/min`, `${f.stepMm} mm`, `${f.stepoverPct} %`]) {
    assert.ok(steps.includes(v), `"Step by step" should show ${v}`);
  }
  const big = startingFeeds(12.7, 2, 'mdf');
  assert.ok(steps.includes(`**${big.rpm}**`) && steps.includes(`${big.feedMm}`), 'the 1/2" example in step 3');
});

test('the Changes list names this version', () => {
  assert.ok(section('Changes').includes(require('../package.json').version), 'add the version to "## Changes"');
});

test("the README's example shows what the code returns", () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const f = startingFeeds(6.35, 2, 'mdf', { maxFeed: 5000, maxPlunge: 1000, maxRpm: 24000, minRpm: 8000 });
  assert.ok(readme.includes("startingFeeds(6.35, 2, 'mdf', { maxFeed: 5000, maxPlunge: 1000, maxRpm: 24000, minRpm: 8000 })"), 'README example call changed: update this test');
  const shown = `f.rpm ${f.rpm}, f.feedMm ${f.feedMm}, f.plungeMm ${f.plungeMm}, f.stepMm ${f.stepMm}, f.stepoverPct ${f.stepoverPct}`;
  assert.ok(readme.includes(shown), `README example should read: ${shown}`);
});
