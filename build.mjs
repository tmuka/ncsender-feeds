// Makes dist/ from src/feeds.js (a CommonJS copy for Node and a script for
// pasting into a plugin's config.html, which sets window.NcFeeds), and fills
// the generated parts of docs/HOW-IT-WORKS.md (materials table, worked
// examples) from the code, so the doc can't fall behind it.
// node build.mjs           write them
// node build.mjs --check   fail if any is out of date (npm test runs this)
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./src/feeds.js', import.meta.url), 'utf8');
const names = [...src.matchAll(/^export (?:function|var) (\w+)/gm)].map((m) => m[1]);
const body = src.replace(/^export /gm, '');
const head = '// Generated from src/feeds.js by build.mjs: edit that, then npm run build.\n';
const list = names.map((n) => `${n}: ${n}`).join(', ');
const out = {
  'dist/feeds.cjs': `${head}'use strict';\n${body}\nmodule.exports = { ${list} };\n`,
  'dist/feeds.global.js': `${head}var NcFeeds = (function () {\n${body}\nreturn { ${list} };\n})();\nif (typeof window !== 'undefined') window.NcFeeds = NcFeeds;\n`,
};

// The doc's generated blocks, computed from src/feeds.js as it is now.
const { MATERIALS, startingFeeds } = await import(`./src/feeds.js?${Date.now()}`);
const r = (v, d = 4) => String(Math.round(v * 10 ** d) / 10 ** d);
const materials = [
  '| Key | Name | RPM | Chip per mm of bit | Max chip (mm) | Least chip, deep pass (mm) | Pass depth | Stepover | Ramp | Wood | Keeps chip |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...Object.entries(MATERIALS).map(([k, m]) => `| \`${k}\` | ${m.name} | ${m.rpm} | ${m.chip} | ${m.maxChip} | ${m.minChip ?? '–'} | ${m.stepdown} × D | ${Math.round(m.stepover * 100)} % | ${m.ramp}° | ${m.wood ? 'yes' : ''} | ${m.keepChip ? 'yes' : ''} |`),
];
const EXAMPLES = [
  ['1/8" 2-flute, MDF', [3.175, 2, 'mdf']],
  ['1/4" 2-flute, MDF', [6.35, 2, 'mdf']],
  ['1/4" 2-flute, MDF, Conservative', [6.35, 2, 'mdf', {}, 'conservative']],
  ['1/4" 2-flute, MDF, Aggressive', [6.35, 2, 'mdf', {}, 'aggressive']],
  ['1/4" 3-flute, hardwood', [6.35, 3, 'hardwood']],
  ['1/2" 2-flute, MDF (spindle slows)', [12.7, 2, 'mdf']],
  ['1" 4-flute surfacing, MDF, max feed 5000', [25.4, 4, 'mdf', { maxFeed: 5000 }]],
  ['1/4" 2-flute, MDF, Z max 500', [6.35, 2, 'mdf', { maxPlunge: 500 }]],
  ['1/4" 1-flute, acrylic', [6.35, 1, 'acrylic']],
  ['1/4" 1-flute, acrylic, Conservative', [6.35, 1, 'acrylic', {}, 'conservative']],
  ['1/8" 2-flute, aluminum', [3.175, 2, 'aluminum']],
  ['1/4" compression, MDF, 18 mm deep', [6.35, 2, 'mdf', {}, 'average', { compression: true, depthMm: 18, fluteMm: 22 }]],
  ['1/8" compression, MDF, 18 mm deep', [3.175, 2, 'mdf', {}, 'average', { compression: true, depthMm: 18, fluteMm: 12 }]],
  ['1/4" 2-flute, MDF, 12.7 mm pass typed', [6.35, 2, 'mdf', {}, 'average', { stepMm: 12.7 }]],
];
const examples = [
  '| Case | RPM | Chip (mm) | Feed | Plunge | Pass depth | Stepover | Notes |',
  '|---|---|---|---|---|---|---|---|',
  ...EXAMPLES.map(([label, args]) => {
    const f = startingFeeds(...args);
    const notes = [f.rpmLowered && 'spindle slowed', f.capped && 'feed capped', f.passes && `${f.passes} pass${f.passes > 1 ? 'es' : ''}`, f.deepChip < 1 && `deep pass: chip × ${r(f.deepChip, 3)}`].filter(Boolean).join(', ');
    return `| ${label} | ${f.rpm} | ${r(f.chipMm)} | ${f.feedMm} | ${f.plungeMm} | ${r(f.stepMm, 3)} | ${f.stepoverPct} % | ${notes} |`;
  }),
];
const DOC = 'docs/HOW-IT-WORKS.md';
let doc = fs.readFileSync(DOC, 'utf8');
for (const [name, lines] of Object.entries({ materials, examples })) {
  const re = new RegExp(`(<!-- BEGIN generated: ${name} -->\\n)[\\s\\S]*?(<!-- END generated: ${name} -->)`);
  if (!re.test(doc)) { console.error(`${DOC}: no generated block "${name}"`); process.exit(1); }
  doc = doc.replace(re, (_, a, b) => `${a}${lines.join('\n')}\n${b}`);
}
out[DOC] = doc;

if (process.argv.includes('--check')) {
  const stale = Object.keys(out).filter((f) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== out[f]);
  if (stale.length) { console.error(`out of date: ${stale.join(', ')} (npm run build)`); process.exit(1); }
} else {
  for (const [f, text] of Object.entries(out)) fs.writeFileSync(f, text);
  console.log(`built ${Object.keys(out).join(', ')}: ${names.join(', ')}`);
}
