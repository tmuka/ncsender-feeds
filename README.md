# ncsender-feeds

Starting speeds and feeds for ncSender plugins. Give it the bit, its flutes
and the material; it gives back an RPM, feed, plunge, depth per pass and
stepover that start safe on a hobby machine, within the machine's own limits.

From QuickCut's `lib/starting-feeds.cjs` (which followed ncCAM's
`src/core/tools.js`), so QuickCut, ncCAM, ncCut2D, Gears, Spoilboard Toolbox
and CNC Tutor start from the same numbers instead of each keeping a copy
that drifts.

## How it works

- **Chip per tooth** grows with the bit (`chip` × diameter) up to the
  material's `maxChip`. Feed = RPM × flutes × chip.
- **Feed** starts at most 4000 mm/min, or the machine's max if lower. A bit
  whose chip needs more turns the spindle slower instead (down to 12000 RPM
  or the spindle's minimum), so the chip doesn't thin and rub; one that
  still needs more there, a surfacing bit, say, gets the machine's max feed.
- **Plunge** is 30 % of the feed (at least 60), within the Z axis's max rate.
- **Depth per pass** and **stepover** are shares of the bit's diameter, and
  no pass goes deeper than the flutes when their length is known.
- **Style:** Conservative slows the feed × 0.75 and cuts × 0.75; Aggressive
  pushes the chip × 1.25 (up to the material's cap) and cuts × 1.2. Plastics
  and aluminum keep their chip on Conservative, since a thinner one melts or
  rubs.
- **Deep passes:** a pass deeper than the bit is wide eases the chip a
  little, to 87.5 % at 2× and 75 % at 3×, never under the material's least
  chip. In wood a compression bit cuts in the fewest passes its flutes and
  diameter allow.

| Material | RPM | Chip per mm of bit | Max chip | Pass depth | Stepover |
|---|---|---|---|---|---|
| Softwood | 18000 | 0.012 | 0.25 | 0.5 × D | 45 % |
| Hardwood | 18000 | 0.009 | 0.2 | 0.35 × D | 40 % |
| MDF / Plywood | 18000 | 0.012 | 0.25 | 0.5 × D | 45 % |
| HDPE | 15000 | 0.02 | 0.25 | 0.3 × D | 40 % |
| Acrylic | 16000 | 0.015 | 0.2 | 0.3 × D | 40 % |
| Polycarbonate | 16000 | 0.018 | 0.22 | 0.3 × D | 40 % |
| Aluminum | 18000 | 0.0045 | 0.06 | 0.1 × D | 25 % |
| Foam | 12000 | 0.02 | 0.4 | 1 × D | 60 % |

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

## Develop

Edit `src/feeds.js`, then `npm run build` (writes `dist/`) and `npm test`
(the tests also fail when `dist/` is out of date). Change a material here,
not in a plugin's copy.

GPL-3.0, like the plugins it came from.
