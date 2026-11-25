# How the starting feeds work

This is the whole formula behind `startingFeeds`, step by step, with the
assumptions behind each step. It is meant to be checked: if a number here
looks wrong for your machine or material, that is worth an issue or a PR
(see [CONTRIBUTING.md](../CONTRIBUTING.md)).

The tables marked *generated* are written by `npm run build` from
`src/feeds.js`, and `npm test` fails if they're out of date. The prose and
the constants table are checked too: every number in the formula and every
field name must appear here. So if this page and the code disagree, the
test suite says so.

## What "starting" means

These are numbers to **start** a cut with on a hobby or prosumer router
(a 1.5–2.2 kW spindle on a belt or screw machine, cutting wood, sheet goods,
plastics and some aluminum). They aim to be safe and clean on the first try,
not the fastest a rigid machine can go. An operator is expected to listen,
look at the chips, and adjust with the feed override.

Everything is in **mm** and **mm/min**. Plugins convert for inch machines.

## Inputs

```js
startingFeeds(bitMm, flutes, material, limits, style, deep)
```

| Input | Meaning | If missing |
|---|---|---|
| `bitMm` | Cutting diameter (D), mm | required |
| `flutes` | Number of cutting edges (n) | `2` |
| `material` | A key of `MATERIALS` (below) | read as `mdf` |
| `limits.maxFeed` | Machine's max XY rate (`$110`/`$111`), mm/min | no cap beyond the 4000 start |
| `limits.maxPlunge` | Machine's max Z rate (`$112`), mm/min | no cap |
| `limits.maxRpm` | Spindle max (`$30`) | `24000` |
| `limits.minRpm` | Spindle min (`$31`) | `0` |
| `style` | `'conservative'`, `'average'` or `'aggressive'` | `'average'` |
| `deep.depthMm` | Total depth of the cut, mm | no compression passes |
| `deep.stepMm` | A depth per pass the operator typed, mm | the formula's |
| `deep.compression` | The bit is a compression (up/down-cut) bit | `false` |
| `deep.fluteMm` | Flute (cutting) length, mm | no flute cap |

## The materials

<!-- BEGIN generated: materials -->
| Key | Name | RPM | Chip per mm of bit | Max chip (mm) | Least chip, deep pass (mm) | Pass depth | Stepover | Ramp | Wood | Keeps chip |
|---|---|---|---|---|---|---|---|---|---|---|
| `softwood` | Softwood | 18000 | 0.012 | 0.25 | 0.05 | 0.5 × D | 45 % | 5° | yes |  |
| `hardwood` | Hardwood | 18000 | 0.009 | 0.2 | 0.05 | 0.35 × D | 40 % | 4° | yes |  |
| `mdf` | MDF / Plywood | 18000 | 0.012 | 0.25 | 0.05 | 0.5 × D | 45 % | 5° | yes |  |
| `hdpe` | HDPE | 15000 | 0.02 | 0.25 | – | 0.3 × D | 40 % | 3° |  | yes |
| `acrylic` | Acrylic | 16000 | 0.015 | 0.2 | – | 0.3 × D | 40 % | 3° |  | yes |
| `polycarbonate` | Polycarbonate | 16000 | 0.018 | 0.22 | – | 0.3 × D | 40 % | 3° |  | yes |
| `aluminum` | Aluminum | 18000 | 0.0045 | 0.06 | – | 0.1 × D | 25 % | 2° |  | yes |
| `foam` | Foam | 12000 | 0.02 | 0.4 | 0.05 | 1 × D | 60 % | 10° |  |  |
<!-- END generated: materials -->

What the columns mean, as fields of `MATERIALS[key]`:

- `rpm`: the spindle speed to start at.
- `chip`: chip load per tooth, **per mm of bit diameter**. A 6.35 mm bit in
  MDF takes 0.012 × 6.35 = 0.0762 mm per tooth.
- `maxChip`: the most chip per tooth, however big the bit.
- `minChip`: the least chip a deep pass may ease down to (below it the edge
  rubs and burns). Only wood and foam have one.
- `stepdown`: depth per pass as a share of D. `stepover`: width of cut as a
  share of D.
- `ramp`: a ramp-in angle in degrees, for plugins that ramp.
- `wood`: compression bits get their special passes (step 6).
- `keepChip`: a thinner chip melts (plastics) or rubs (aluminum), so
  Conservative and deep passes don't thin it.
- `name`, `note`: for a plugin's material menu.

**Where the numbers came from.** The first table came from ncCAM's
`src/core/tools.js`. QuickCut then split plastics into three and raised
aluminum's chip. The source of each original value wasn't recorded. When
you change one, say in the commit and in [Changes](#changes) what it's based
on (a bit maker's chart, a test cut on a named machine), so the next person
can judge it.

## Step by step

Worked through for a 1/4" (6.35 mm) 2-flute bit in MDF, no limits, Average
style. The test "a 1/4" 2-flute bit in MDF" checks these exact numbers.

### 1. Spindle speed

`rpm = clamp(material rpm, minRpm, maxRpm)` → 18000.

### 2. Chip per tooth

`chip = min(maxChip, chip × D)` → min(0.25, 0.012 × 6.35) = **0.0762 mm**.

*Assumption:* a bigger bit is stiffer and clears chips better, so it can
take a thicker chip, in proportion to its diameter, up to a cap where
the machine and spindle become the limit rather than the bit.

### 3. Feed, and slowing the spindle for big bits

`feed = rpm × flutes × chip` → 18000 × 2 × 0.0762 = **2743 mm/min**.

The feed starts at most **4000 mm/min**, or the machine's max feed if
lower. When a bit's chip would need more than that (a big bit), the spindle
**slows down** instead of thinning the chip:
`rpm = startFeed / (flutes × chip)`, rounded to 100, but not below
**12000 RPM** or the spindle's minimum. A thin chip rubs and burns. Below
about 12000 RPM a hobby spindle's torque falls off.

If the bit still needs more feed at that slowest RPM (a surfacing bit,
say), it gets the machine's max feed instead of 4000.

*Example:* a 1/2" 2-flute bit in MDF: chip 0.1524 mm, 18000 × 2 × 0.1524 =
5486 > 4000, so rpm = 4000 / (2 × 0.1524) = 13123 → **13100**, and the
feed comes out at 3993.

### 4. Style

| Style | Chip | Pass depth and stepover |
|---|---|---|
| Conservative | feed × 0.75, except `keepChip` materials | × 0.75 |
| Average | as is | as is |
| Aggressive | chip × 1.25, still up to `maxChip` | × 1.2 |

RPM doesn't change with the style. Conservative slows the feed even when
the machine's max is what held it back. Aggressive may ask for more than
the machine's max feed; the next step caps it, and `capped` says so.

### 5. Feed limits

`feed = clamp(feed, 150, maxFeed)`, rounded to whole mm/min. Below 150 mm/min
a tiny bit (say 0.5 mm in aluminum) would barely move; at that size the
operator should set the feed by hand anyway.

### 6. Depth per pass

`pass = max(0.05, D × stepdown × style)` → 6.35 × 0.5 = **3.175 mm**.

- **Flute length:** no pass goes deeper than `deep.fluteMm`, when known.
- **Compression bits in wood** (`deep.compression`, `wood` materials, a known
  `depthMm`): they cut in the fewest **equal** passes, each no deeper than the
  flutes and a multiple of D. The multiple is 3 × D from 6 mm, 2 × D from
  3 mm, and 1 × D under 3 mm (a long pass snaps a thin bit). From **9.5 mm**
  (3/8") it's 1 × D unless Aggressive, because a full-depth pass with a big
  bit asks more of the spindle than most hobby machines have. The bit's
  down-cut top only cleans the face once a pass is past its up-cut tip,
  which is why fewer, deeper passes matter. `passes` returns the count.

### 7. Deep passes ease the chip

A pass deeper than the bit is wide loads and bends it. When the pass (the
operator's typed `deep.stepMm`, else step 6's) is more than 1 × D, the chip
comes down by 12.5 % for each D past the first: × 0.875 at 2 × D, and
× 0.75 from 3 × D.

It never eases below the material's `minChip` (scaled by the style),
because in wood heat from a thin chip matters more than the bend.
`keepChip` materials don't ease at all, and neither does a bit whose chip
is already under `minChip` (in wood, under about 4 mm: 0.012 × 4.2 =
0.05). `deepChip` returns how much it took off (1 = nothing).

### 8. Plunge

`plunge = min(maxPlunge, startFeed × 0.3, max(60, feed × 0.3))` →
2743 × 0.3 = **823 mm/min**.

*Assumption:* a bit cuts poorly straight down (the center of an end mill
barely cuts), so it plunges at about 30 % of the feed, at least 60 mm/min,
never faster than the Z axis allows.

### 9. Stepover

`stepover = min(90 %, stepover × style)` → **45 %**. At 90 % a bit still
overlaps its last pass enough not to leave a ridge.

## Worked examples

<!-- BEGIN generated: examples -->
| Case | RPM | Chip (mm) | Feed | Plunge | Pass depth | Stepover | Notes |
|---|---|---|---|---|---|---|---|
| 1/8" 2-flute, MDF | 18000 | 0.0381 | 1372 | 412 | 1.588 | 45 % |  |
| 1/4" 2-flute, MDF | 18000 | 0.0762 | 2743 | 823 | 3.175 | 45 % |  |
| 1/4" 2-flute, MDF, Conservative | 18000 | 0.0572 | 2057 | 617 | 2.381 | 34 % |  |
| 1/4" 2-flute, MDF, Aggressive | 18000 | 0.0953 | 3429 | 1029 | 3.81 | 54 % |  |
| 1/4" 3-flute, hardwood | 18000 | 0.0571 | 3086 | 926 | 2.222 | 40 % |  |
| 1/2" 2-flute, MDF (spindle slows) | 13100 | 0.1524 | 3993 | 1198 | 6.35 | 45 % | spindle slowed |
| 1" 4-flute surfacing, MDF, max feed 5000 | 12000 | 0.1042 | 5000 | 1200 | 12.7 | 45 % | spindle slowed, feed capped |
| 1/4" 2-flute, MDF, Z max 500 | 18000 | 0.0762 | 2743 | 500 | 3.175 | 45 % |  |
| 1/4" 1-flute, acrylic | 16000 | 0.0952 | 1524 | 457 | 1.905 | 40 % |  |
| 1/4" 1-flute, acrylic, Conservative | 16000 | 0.0952 | 1524 | 457 | 1.429 | 30 % |  |
| 1/8" 2-flute, aluminum | 18000 | 0.0143 | 514 | 154 | 0.318 | 25 % |  |
| 1/4" compression, MDF, 18 mm deep | 18000 | 0.0587 | 2114 | 634 | 18 | 45 % | 1 pass, deep pass: chip × 0.771 |
| 1/8" compression, MDF, 18 mm deep | 18000 | 0.0381 | 1372 | 412 | 6 | 45 % | 3 passes |
| 1/4" 2-flute, MDF, 12.7 mm pass typed | 18000 | 0.0667 | 2400 | 720 | 3.175 | 45 % | deep pass: chip × 0.875 |
<!-- END generated: examples -->

## What it returns

| Field | Meaning |
|---|---|
| `rpm` | Spindle speed |
| `feedMm` | Feed, mm/min |
| `plungeMm` | Plunge, mm/min |
| `stepMm` | Depth per pass, mm |
| `stepoverPct` | Stepover, % of D |
| `chipMm` | The chip per tooth the feed works out to, mm |
| `capped` | The machine's max feed held the feed back |
| `maxFeedMm` | The highest feed this bit was allowed (4000, or the machine's max for a big bit) |
| `rpmLowered` | The spindle was slowed to keep the chip (step 3) |
| `deepChip` | How much a deep pass took off the feed, 1 = nothing (step 7) |
| `passes` | Compression bit passes, else 0 (step 6) |

## Constants

Every number in the formula, and why. The test "every constant in
startingFeeds is in the docs" fails if one is added or changed in the code
and not here.

| Value | Where | Why |
|---|---|---|
| `24000` | max RPM when the spindle's isn't known | the usual hobby spindle's top speed |
| `4000` | starting feed cap, mm/min | quick enough for wood on a hobby router without asking too much of a belt machine's rigidity |
| `12000` | slowest RPM when slowing for a big bit | below it a hobby spindle's torque falls off |
| `100` | RPM rounding when slowing | spindle speeds read as round numbers |
| `2` | flutes when not given; 2 × D compression pass from 3 mm | the most common router bit; a 3–6 mm bit can take 2 × D |
| `150` | least feed, mm/min | a tiny bit still moves; set it by hand at that size |
| `0.3` | plunge share of the feed | an end mill cuts poorly straight down |
| `60` | least plunge, mm/min | the same, for a slow feed |
| `0.05` | least depth per pass, mm | a pass that still removes something |
| `0.9` | most stepover share | enough overlap not to leave a ridge |
| `0.75` | Conservative chip and cut; least deep-pass chip share | a quarter less load |
| `1.25` | Aggressive chip | a quarter more chip, still under `maxChip` |
| `1.2` | Aggressive pass depth and stepover | a fifth more engagement |
| `0.125` | chip eased per D of pass past the first | a pass deeper than wide bends the bit |
| `9.5` | compression bit size (3/8") from which a pass is 1 × D unless Aggressive | full depth with a big bit asks more of a hobby spindle than it has |
| `6` | compression bit size from which a pass may be 3 × D | stiff enough |
| `3` | compression bit size from which a pass may be 2 × D; 3 × D pass | under 3 mm a long pass snaps it |
| `1` | 1 × D compression pass; no style change | identity |
| `0` | "not given" for limits and lengths | identity |
| `1e-9` | rounding guard when counting passes | 18 / 9 is 2 passes, not 3 |

## Known gaps

Things the formula doesn't model yet. Each is a fair place to contribute.

- **Chip thinning.** At a stepover under half the bit, the real chip is
  thinner than the feed per tooth, so the feed could rise. Not applied.
- **Slot vs side cut.** A full-width slot and a light side cut get the same
  depth. A side cut could go much deeper (ncCAM's `docs/feeds.md`).
- **Tool shape.** Ball, V and tapered bits are treated as flat end mills of
  their diameter. Their effective cutting diameter at depth is smaller.
- **Spindle power and machine rigidity.** No kW or machine model: the
  4000 mm/min start and the 12000 RPM floor stand in for "a hobby machine".
- **Bit material and coating.** Carbide is assumed. HSS would want less.
- **Flutes** default to 2 when the tool table doesn't say.
- **Single-flute O-bits in plastics** get the same chip per tooth as any
  bit; some makers suggest more.
- **Laser, pen and drag knife** aren't cutting tools here; plugins handle
  them on their own.

## Changes

Material values and assumptions, newest first. Say what a change was based on.

- **0.1.1 (2026-11-25):** documentation only (this page, CONTRIBUTING,
  CLAUDE.md, CI). No change to the numbers.
- **0.1.0 (2026-11-24):** the library starts from QuickCut's
  `lib/starting-feeds.cjs` as of 2026-11-23, with ncCAM's names, notes and
  ramp angles.
