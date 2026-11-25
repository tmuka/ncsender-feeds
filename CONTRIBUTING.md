# Contributing

Thanks for looking. The most useful contributions here are often small: a
material value that's off for your machine, a case the formula gets wrong,
or a gap in [how it works](docs/HOW-IT-WORKS.md).

## Reporting a number that seems wrong

Open an issue with:

- the bit: diameter, flutes, type (up-cut, down-cut, compression, O-flute,
  ball…), carbide or HSS;
- the material, and its thickness;
- the machine and spindle (for example "4×4 belt-driven router, 2.2 kW
  water-cooled VFD spindle");
- what `startingFeeds` gave (RPM, feed, depth per pass, stepover, style);
- what happened (burning, chatter, melted chips, a broken bit) and what
  worked instead, if you found it.

Numbers from a bit maker's chart are welcome too. Link the chart.

## Changing the code

```bash
npm test          # dist/ and the docs are current, then all tests
npm run build     # rewrites dist/ and the generated parts of the docs
```

No dependencies to install; Node 18 or later.

1. Edit **`src/feeds.js`** only. `dist/` and the tables in
   `docs/HOW-IT-WORKS.md` are generated from it by `npm run build`.
2. **Update `docs/HOW-IT-WORKS.md`** in the same change:
   - a new or changed number in the formula goes in **Constants**, with why;
   - a new input, material field or result field gets explained;
   - a changed step gets its prose (and the 1/4" MDF walk-through) updated;
   - a changed material value gets a line in **Changes** saying what it's
     based on.

   `npm test` fails if any of these is missed, and says what to add.
3. **Add a test** in `tests/starting-feeds.test.cjs` for the behaviour,
   with the numbers you expect worked out by hand, not copied from the
   output.
4. If the change is a case people will ask about, add it to `EXAMPLES` in
   `build.mjs` so it shows in the doc's worked examples.
5. Run `npm run build`, then `npm test`, and commit `src/`, `dist/`, the
   docs and the tests together.

Keep `src/feeds.js` plain ES5 (`var`, no arrow functions): plugins without
a build paste `dist/feeds.global.js` into their `config.html`.

## Before a change to the numbers ships

A test passing only shows the code does what the doc says. For a change to
a material, the RPM floor, the feed cap or the depth rules, try it on a
machine first:

- air-cut the program, then cut scrap of the material;
- in any test G-code you write by hand, start with `G21 G90` (mm,
  absolute), and check the modal state again after a reset or `M30`;
- say in the PR what you cut, on what, and how it went.

## Releasing (maintainer)

1. Bump `version` in `package.json`; add the version and date in
   **Changes** in `docs/HOW-IT-WORKS.md`.
2. `npm run build && npm test`, commit, push to `main`.
3. Tag it: `git tag -a vX.Y.Z -m "ncsender-feeds X.Y.Z"` and push the tag.
4. Plugins take it when they next release: bump
   `"ncsender-feeds": "github:tmuka/ncsender-feeds#vX.Y.Z"` in their
   `package.json`, `npm install`, run their tests, and say in their release
   notes what changed in the feeds. A plugin without a build re-pastes
   `dist/feeds.global.js`.

Never change a tag that has been pushed; release a new one.

## Who uses it

- **ncCAM**, from v0.1.0 ([siganberg/ncsender-plugin-nccam#4](https://github.com/siganberg/ncsender-plugin-nccam/pull/4)).
- **QuickCut**, **ncCut2D**, **Gears**, **Spoilboard Toolbox** and **CNC
  Tutor** still have their own copies; they move to this library as they
  release. Until then, a fix here should be made there too.
