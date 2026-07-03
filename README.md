# Henry

Henry is the robot mascot of [curthenrichs.github.io](https://curthenrichs.github.io/) and
[half-built-robots.com](https://www.half-built-robots.com/) — a friendly little robot with a
glowing antenna who greets visitors, apologizes for missing pages, and generally keeps things
whimsical while the humans are busy soldering.

**Why "Henry"?** The henry is the SI unit of inductance — and the first syllable of Henrichs.
A personal monogram, expressed in physics.

Henry shares his brand universe with **Bubbles**, the robot dog project over at Half-Built Robots.

## The character

Henry is drawn as a head — that's the whole robot, and that's the joke: he's a half-built robot.

- **Head:** white rounded rectangle, 1.4:1 width-to-height ratio (canonically 109×78 in CSS, 300×214 in the 512 master)
- **Eyes:** two round accent-colored dots; they blink
- **Antenna:** a single stem with a glowing accent-colored tip — Henry's signature. The antenna is
  part of his charm and is never removed
- **Moods:**
  - *Friendly* (default) — eyes blink on a ~3.2s cycle, antenna tip pulses
  - *Confused* (404 pages) — manga-style question marks pop above his head with an overshoot
    "boing"; the body stays still, only the eyes blink

The living animated implementation is the `CuteRobot` React component in the
[portfolio repo](https://github.com/curthenrichs/curthenrichs.github.io)
(`src/components/CuteRobot.jsx`), which also documents the animation timings.

## Palettes

Henry has one official colorway per site. His head is always white; ground and accent change.

| Token | portfolio-blue | half-built-robots-amber |
|---|---|---|
| Ground | `#112244` navy (sampled from the site's original favicon) | `#111111` near-black (theme's terminal aesthetic) |
| Accent (eyes, antenna tip, glow) | `#1890ff` (Ant Design primary blue) | `#ffaa3c` (theme `--primary-color`) |
| Head + antenna stem | `#ffffff` | `#ffffff` |
| Glow halo | accent @ 22% (512) / 28% (32px) opacity | same |

Secondary blue `#40a9ff` appears only in the portfolio's animated contexts (the smaller 404
question mark); it is not part of the icon artwork.

## Design rules

1. **No outline on dark grounds.** The illustration's `#555555` outline exists only in the
   light-background CSS component; on navy/black icon grounds the white head *is* the shape.
2. **Glow only at ≥ 32px.** The antenna halo disappears at 16px — at that size it's mush.
3. **Small sizes are redrawn, not scaled.** `henry-32.svg` and `henry-16.svg` are pixel-fitted:
   geometry snaps to the pixel grid, eyes grow and spread, the antenna stem widens (32px) or
   shrinks to a 1px stem + dot (16px).
4. **Antenna always present.** It's what makes the silhouette read "robot" instead of "chat app."
5. **Don't stretch, don't rotate, don't recolor outside the official palettes.** New colorways
   get added to `scripts/generate.js` as variants, with their source documented here.

## Repo layout

```
artwork/    SVG masters, authored in the canonical (portfolio-blue) palette
  henry-master.svg   512 viewBox — source for 180/192/512 outputs
  henry-32.svg       pixel-fitted 32 — source for 32 output + 48 ICO layer
  henry-16.svg       pixel-fitted 16 — source for 16 output + 16 ICO layer
scripts/
  generate.js        recolors masters per variant, rasterizes, verifies
dist/                committed generated output — consumers vendor from here
  portfolio-blue/
  half-built-robots-amber/
```

Each `dist/<variant>/` contains: `favicon.ico` (16/32/48 layers), `favicon-16x16.png`,
`favicon-32x32.png`, `apple-touch-icon.png` (180), `android-chrome-192x192.png`,
`android-chrome-512x512.png`, plus recolored copies of the three SVGs.

## Regenerating

```
npm install
npm run generate
```

The generator hard-fails on any wrong dimension or ICO layer count. Never hand-edit files in
`dist/` — change the masters (or a variant's palette) and regenerate.

Note: this repo lives under a path with spaces on the maintainer's machine — avoid `npx`;
`npm run` and `node scripts/generate.js` are fine.

## Consumers

- **curthenrichs.github.io** — vendors `dist/portfolio-blue/` icon files into `public/`
  (filenames match one-to-one).
- **half-built-robots.com** (WordPress) — upload `dist/half-built-robots-amber/android-chrome-512x512.png`
  as the Site Icon (Appearance → Customize → Site Identity); WordPress derives the rest.

## License

Henry — the character, name, and artwork — is © Curt Henrichs, all rights reserved. He's a brand
mascot, not clip art; please don't reuse him for other projects. The generator script is trivial
plumbing — feel free to adapt that pattern for your own mascot.
