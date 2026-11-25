# ncsender-feeds

Starting speeds and feeds for ncSender plugins. Give it the bit, its flutes
and the material; it gives back an RPM, feed, plunge, depth per pass and
stepover that start safe on a hobby machine, within the machine's own limits.

From QuickCut's `lib/starting-feeds.cjs` (which followed ncCAM's
`src/core/tools.js`), so QuickCut, ncCAM, ncCut2D, Gears, Spoilboard Toolbox
and CNC Tutor start from the same numbers instead of each keeping a copy
that drifts.

## How it works

Chip per tooth grows with the bit up to the material's cap; feed = RPM ×
flutes × chip, starting at most 4000 mm/min, with the spindle slowed for big
bits rather than thinning the chip; plunge 30 % of the feed within `$112`;
depth per pass and stepover a share of the bit, no deeper than its flutes.

**[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)** walks through every step,
the assumptions behind it, every constant and why, the materials table,
worked examples and the known gaps. Its tables are generated from the code
and the tests fail if it falls behind, so it's the place to check the math.

## Use

Bundled plugins (esbuild), pinned to a release tag in `package.json`:

```json
"ncsender-feeds": "github:tmuka/ncsender-feeds#v0.1.0"
```

```js
import { startingFeeds, MATERIALS } from 'ncsender-feeds';

const f = startingFeeds(6.35, 2, 'mdf', { maxFeed: 5000, maxPlunge: 1000, maxRpm: 24000, minRpm: 8000 });
// f.rpm 18000, f.feedMm 2743, f.plungeMm 823, f.stepMm 3.175, f.stepoverPct 45
```

Plugins without a build: paste `dist/feeds.global.js` into `config.html`; it
sets `window.NcFeeds` with the same functions. Node tests:
`require('ncsender-feeds')`.

A plugin takes a new version only when it releases: pin a tag, never fetch
this at run time.

## API

- `startingFeeds(bitMm, flutes, material, limits, style, deep)`:
  - `material`: a key of `MATERIALS`; anything else is read as `mdf`.
  - `limits` (optional): `{ maxFeed, maxPlunge, maxRpm, minRpm }` in mm/min
    and RPM, from `$110`/`$111`, `$112`, `$30`, `$31`.
  - `style` (optional): `'conservative'`, `'average'` (the default) or
    `'aggressive'`.
  - `deep` (optional): `{ depthMm, stepMm, compression, fluteMm }`: the
    Total Depth, a Depth of Cut typed by hand, whether it's a compression
    bit, and its flute length.
  - Returns `{ rpm, feedMm, plungeMm, stepMm, stepoverPct, chipMm, capped,
    maxFeedMm, rpmLowered, deepChip, passes }`. `capped`: the machine's max
    feed held it back. `rpmLowered`: the spindle was slowed to keep the chip.
    `deepChip`: how much a deep pass took off the feed (1 = nothing).
    `passes`: the compression bit's pass count, else 0.
- `MATERIALS`: per material `{ name, note, rpm, chip, maxChip, minChip,
  stepdown, stepover, ramp, wood, keepChip }`, in menu order. `ramp` is a
  ramp-in angle in degrees.

## Contributing

A number that looks wrong for your machine or material is worth an issue.
See [CONTRIBUTING.md](CONTRIBUTING.md) for what to include, how to change
the code and docs together (`npm run build`, `npm test`), and how releases
reach the plugins.

GPL-3.0, like the plugins it came from.
