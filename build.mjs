// Makes dist/ from src/feeds.js: a CommonJS copy for Node and a
// script for pasting into (or loading from) a plugin's config.html, which
// sets window.NcFeeds. No dependencies.
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
if (process.argv.includes('--check')) {
  const stale = Object.keys(out).filter((f) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== out[f]);
  if (stale.length) { console.error(`out of date: ${stale.join(', ')} (npm run build)`); process.exit(1); }
} else {
  for (const [f, text] of Object.entries(out)) fs.writeFileSync(f, text);
  console.log(`built ${Object.keys(out).join(', ')}: ${names.join(', ')}`);
}
