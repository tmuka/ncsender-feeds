# ncsender-feeds: notes for Claude Code

Starting speeds and feeds shared by ncSender plugins. Read
[CONTRIBUTING.md](CONTRIBUTING.md) and [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)
before changing anything. They are the rules; this file only adds what a
Claude session tends to miss.

- **The doc is part of every change.** Any edit to `src/feeds.js` updates
  `docs/HOW-IT-WORKS.md` in the same commit: Constants (every number in the
  formula, with why), the step it changes, and **Changes** for a material
  value (with what it's based on). Then `npm run build` and `npm test`.
  `tests/docs.test.cjs` names what's missing; fix the doc, never loosen
  the test.
- **Never hand-edit generated parts:** `dist/` and the blocks between
  `<!-- BEGIN generated: … -->` and `<!-- END generated: … -->`.
- **Work expected values out by hand** in new tests (show the arithmetic
  in a comment). Copying the function's output into the test only proves
  it returns what it returns.
- **Don't invent sources.** If a value's origin isn't known, say so in
  Changes rather than citing a chart nobody checked.
- **ES5 only** in `src/feeds.js` (it's pasted into `config.html` pages).
- **Numbers that change what a machine does** (material values, the 4000
  feed cap, the 12000 RPM floor, depth rules) need a test cut before they
  ship. Say they're untested on a machine when you report the change, and
  don't release them on the strength of unit tests alone.
- **Releases are a tag** (`vX.Y.Z`, see CONTRIBUTING). Plugins pin tags, so
  a fix on `main` reaches nobody until it is tagged and each plugin bumps
  its pin. The owner pushes this repo straight to `main`; other people's
  changes come as PRs.
- Plugins that still keep their own copy (QuickCut, ncCut2D, Gears,
  Spoilboard Toolbox, CNC Tutor) need the same fix until they switch; list
  them in your report rather than editing them unasked.
