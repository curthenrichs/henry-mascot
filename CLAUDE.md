# CLAUDE.md

Guidance for Claude Code when working in this repo. `README.md` is for
people: the character, the gallery, the palettes, and the brand design
rules. This file is the working rules.

## What this is

The source of truth for Henry, the robot mascot. Artwork masters live
in `artwork/`, the generator recolors and rasterizes them per colorway
into `dist/`, and every other repo VENDORS from `dist/` and never
re-authors him. If Henry's geometry, expressions, or animation need to
change, they change here and the consumers refresh their copies.
Redrawing Henry downstream from measurements is the failure this rule
exists to prevent.

## Working rules

- Never hand-edit anything in `dist/`. Change the masters or a
  variant's palette in `scripts/generate.js`, then `npm run generate`;
  the generator hard-fails on wrong dimensions or ICO layer counts and
  the committed output must match what it emits.
- New colorways are generator variants, added to `scripts/generate.js`
  with their source documented in the README's Palettes section. Never
  recolor by editing SVGs.
- New moods follow the expression grammar (eye shape, antenna state,
  stroke-drawn emanata):
  `docs/superpowers/specs/2026-07-03-henry-expressions-design.md`.
  The README's Design rules section carries the brand constraints
  (no outline on dark grounds, glow only at 32px and up, pixel-fitted
  small sizes, antenna always present); they bind here too.
- Emanata are stroke-drawn paths, never text, so output has no font
  dependency.
- This repo's path contains spaces on the maintainer's machine, so
  avoid `npx`; plain `npm run` and `node scripts/generate.js` work.
- Commits land on `main` directly (no dev branch here); push
  deliberately, as everywhere in the workspace.

## Licensing boundary

Henry is © Curt Henrichs, all rights reserved (see LICENSE). He is
deliberately NOT covered by the permissive licenses of the repos that
vendor him; each of those carries an explicit exception or
all-rights-reserved notice naming him. Any NEW repo that vendors Henry
needs the equivalent carve-out before the artwork lands in it. The
generator script's pattern may be adapted for other mascots; Henry's
artwork may not.

## Consumers to refresh after a regenerate

- half-built-robots-blog vendors the full
  `dist/half-built-robots-amber/` colorway: the favicon set, the mood
  poses, the stasis-unit art, and the `henry-*.css` files (the exact
  list is in that repo's README, Mascot section).
- curthenrichs.github.io vendors the `dist/portfolio-blue/` icon set.
- The BEADZ public repo vendors `henry-master.svg` into
  `site/brand/vendor/` under its brand-assets exception.
