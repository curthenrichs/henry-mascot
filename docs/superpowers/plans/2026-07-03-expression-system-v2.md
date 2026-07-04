# Henry Expression System v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all 13 new illustrated Henry expressions (7 emotional core + 6 robot set) from `docs/superpowers/specs/2026-07-03-henry-expressions-design.md` as SVG masters, generated into both colorways in `dist/`, with the generator made data-driven and the README updated.

**Architecture:** Each expression is one hand-authored SVG master in `artwork/`, drawn in the canonical portfolio-blue palette; `scripts/generate.js` recolors by exact hex substitution and rasterizes per variant. Task 1 refactors the generator so illustrations are a data-driven mood list (add a name, drop in a master, regenerate) and adds master validation that hard-fails on palette mistakes. Tasks 2–16 add one expression each with a render-review-iterate loop; two family-level consistency reviews and a final release review gate the result.

**Tech Stack:** Hand-authored SVG, Node.js (`sharp`, `png-to-ico`). No test framework exists or is added — the generator's hard-fail verification plus visual review of rendered PNGs is the test harness.

**Execution model (user requirement):** Review-heavy, with **Opus subagents**. Every implementer and reviewer subagent dispatched for this plan uses `model: "opus"`. Visual review agents must actually Read the rendered PNGs (the Read tool displays images), not just the SVG source.

## Global Constraints

Every task's requirements implicitly include all of these.

- Masters are authored ONLY in the canonical palette. Exact hexes, verbatim: accent `#1890ff`, secondary accent `#40a9ff`, outline/stem `#555555`, head `#ffffff`. Any other hex in a master is a bug (Task 1 makes the generator enforce this).
- Henry never has a mouth. The antenna is always present. The head is always the white rounded rect: `width="104" height="73" rx="17.5"` with `stroke="#555555" stroke-width="5"` (illustration form).
- The antenna must agree with the eyes (spec consistency rule). The antenna tip stays a glowing ball in all emotional moods; only robot moods may swap the tip for hardware (plug, dish, spark).
- Emanata are stroke-drawn paths — never `<text>` elements — with round line caps/joins, primary symbol in `#1890ff`, companions in `#40a9ff`, per the confused-pose precedent.
- viewBox must be `0 0 <integer> <integer>` (the generator's regex requires integers). Coordinates inside may be decimal.
- Illustration PNG export width is always 4× the master's viewBox width (automatic after Task 1).
- Never hand-edit anything in `dist/`. Change masters, run `npm run generate`.
- The repo path contains spaces: use `npm run generate` / `node scripts/generate.js`, never `npx`.
- All SVG geometry in this plan is a **starting point**. Each expression task ends in a visual review loop; expect to nudge coordinates. Cap at 3 review rounds per mood, then stop and ask the user.
- Commit after every task. Each expression commit includes its master, the generator line, and the regenerated `dist/`.

## Canonical Robot Geometry (reference for every drawing task)

From `artwork/henry-illustration-friendly.svg` (viewBox `0 0 160 128`, robot centered at x=80):

| Part | Element |
|---|---|
| Glow halo | `<circle cx="80" cy="13.5" r="13" fill="#1890ff" opacity="0.22"/>` |
| Antenna ball | `<circle cx="80" cy="13.5" r="8.5" fill="#1890ff"/>` |
| Stem | `<rect x="76.5" y="20" width="7" height="24" rx="3" fill="#555555"/>` |
| Head | `<rect x="28" y="46.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>` |
| Eyes (dots) | `<circle cx="61.5" cy="83" r="8.5" fill="#1890ff"/>` + same at `cx="98.5"` |

To shift the robot down by Δy or right by Δx (for emanata headroom), add Δ to every y/x above. The stem bottom must always end 2.5 units above the head top (stroke overlap), i.e. stem `y + 24 = headY - 2.5`. The confused master (`0 0 200 180`, robot at x=100, shifted down 52) is the precedent for a shifted layout.

## Review Protocol (used by every expression task)

**Per-mood visual review.** Dispatch a fresh subagent via the Agent tool, `subagent_type: "general-purpose"`, `model: "opus"`, with this prompt (fill `{MOOD}` and the task's **Review focus** bullets in place of `{FOCUS}`):

```
You are art-reviewing a new expression pose for Henry, a minimal kawaii robot mascot
(white rounded-rect head, two accent-colored eyes, glowing antenna, no mouth, no limbs).

Read, in this order:
1. docs/superpowers/specs/2026-07-03-henry-expressions-design.md — the grammar and the
   roster row for "{MOOD}"
2. artwork/henry-illustration-{MOOD}.svg — the master you are judging
3. dist/portfolio-blue/henry-illustration-{MOOD}.png and
   dist/half-built-robots-amber/henry-illustration-{MOOD}.png — VIEW these renders
4. dist/portfolio-blue/henry-illustration-friendly.png and
   dist/portfolio-blue/henry-illustration-confused.png — the established look to match

Judge against this checklist:
A. Character integrity: head is the canonical 104x73 rx17.5 white rect with 5px #555555
   stroke; no mouth; antenna present; silhouette still reads "robot".
B. Grammar fidelity: eyes, antenna, and emanata match the spec's roster row for {MOOD};
   the antenna state agrees with the eyes (a mismatch reads as "broken", fail it).
C. Construction: only #ffffff/#555555/#1890ff/#40a9ff appear; no <text> elements;
   emanata are stroke-drawn with round caps; nothing is clipped by the viewBox edge;
   margins are comparable to the friendly/confused masters.
D. Readability: the mood is identifiable at a glance when the image is ~150px wide.
   Squint-test the renders.
E. Colorway parity: the amber render reads as well as the blue one (companion symbols
   in the lighter secondary accent must stay visible on white).
F. Kawaii register: it should read as manga/anime visual shorthand — the same family
   as the confused pose's tilted question marks. Charming, not clinical.
{FOCUS}

Your final message: "PASS" or "FAIL" on the first line, then (if FAIL) a numbered list of
concrete geometry fixes — exact attribute/coordinate edits where possible, not vibes.
```

Iterate: apply the fixes to the master, run `npm run generate`, dispatch a **fresh** reviewer. Max 3 rounds; if still FAIL, stop and show the user the current render and the disagreement.

**Family consistency review** (Tasks 9 and 16) uses its own prompt, given in those tasks.

---

### Task 1: Data-driven illustration moods + master validation in the generator

**Files:**
- Modify: `scripts/generate.js` (full rewrite below)

**Interfaces:**
- Consumes: existing masters `artwork/henry-illustration-friendly.svg`, `artwork/henry-illustration-confused.svg`
- Produces: `ILLUSTRATION_MOODS` string array in `scripts/generate.js` — every later task adds one mood name to it. File conventions: master `artwork/henry-illustration-<mood>.svg`, outputs `dist/<variant>/henry-illustration-<mood>.svg` and `.png` at 4× viewBox width. Validation: generator hard-fails on masters containing foreign variant hexes, `<text>` elements, or (for illustrations) missing `#1890ff`/`#555555`.

- [ ] **Step 1: Replace `scripts/generate.js` with the data-driven version**

```js
/**
 * Regenerates every Henry asset in dist/ from the SVG masters in artwork/.
 * Run via: npm run generate
 *
 * The masters are authored in the canonical (portfolio) palette; each
 * variant recolors ground + accents by exact hex substitution, so the hex
 * values in CANON must appear verbatim in the artwork files.
 *
 * Icon masters come in three sizes, not one: 32px and 16px are separate
 * pixel-fitted drawings (the 512 master's antenna and glow turn to mush
 * below ~64px). Illustration masters (outlined, transparent ground) are
 * the character's portrait form for light backgrounds; their #555555
 * outline is palette-invariant. Each illustration mood is one master,
 * artwork/henry-illustration-<mood>.svg, exported per variant as a
 * recolored SVG and a transparent PNG at 4x its viewBox width.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const ROOT = path.join(__dirname, "..");
const ART = path.join(ROOT, "artwork");
const DIST = path.join(ROOT, "dist");

const CANON = { ground: "#112244", accent: "#1890ff", accentSoft: "#40a9ff" };
const OUTLINE = "#555555";

const VARIANTS = [
  // curthenrichs.github.io — navy ground, Ant Design primary blue accent
  { name: "portfolio-blue", ground: "#112244", accent: "#1890ff", accentSoft: "#40a9ff" },
  // half-built-robots.com — terminal near-black ground, theme amber accent
  { name: "half-built-robots-amber", ground: "#111111", accent: "#ffaa3c", accentSoft: "#ffc46e" },
];

const ICON_MASTERS = {
  master: "henry-master.svg",
  px32: "henry-32.svg",
  px16: "henry-16.svg",
};

// One master per illustration mood: artwork/henry-illustration-<mood>.svg.
// Adding a mood = author the master, append its name here, regenerate.
// Order is display order (README gallery follows it).
const ILLUSTRATION_MOODS = [
  "friendly",
  "confused",
];

// Illustration PNGs always export at 4x the master's viewBox width.
const ILLUSTRATION_SCALE = 4;

const ICON_PNG_OUTPUTS = [
  { file: "favicon-16x16.png", source: "px16", width: 16 },
  { file: "favicon-32x32.png", source: "px32", width: 32 },
  { file: "apple-touch-icon.png", source: "master", width: 180 },
  { file: "android-chrome-192x192.png", source: "master", width: 192 },
  { file: "android-chrome-512x512.png", source: "master", width: 512 },
];

const ICO_LAYERS = [
  { source: "px16", width: 16 },
  { source: "px32", width: 32 },
  { source: "px32", width: 48 },
];

const illoKey = (mood) => `illo:${mood}`;
const illoSvgFile = (mood) => `henry-illustration-${mood}.svg`;
const illoPngFile = (mood) => `henry-illustration-${mood}.png`;

function allMasters() {
  const masters = { ...ICON_MASTERS };
  for (const mood of ILLUSTRATION_MOODS) masters[illoKey(mood)] = illoSvgFile(mood);
  return masters;
}

function parseViewBox(file, text) {
  const match = text.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!match) throw new Error(`${file}: could not parse viewBox (must be "0 0 <int> <int>")`);
  return { vbWidth: Number(match[1]), vbHeight: Number(match[2]) };
}

// Hexes belonging to non-canonical variants. A master containing one was
// authored in the wrong palette and would survive recoloring untouched.
const FOREIGN_HEXES = VARIANTS.flatMap((v) => [v.ground, v.accent, v.accentSoft]).filter(
  (hex) => !Object.values(CANON).includes(hex)
);

function validateMasters() {
  for (const [key, file] of Object.entries(allMasters())) {
    const text = fs.readFileSync(path.join(ART, file), "utf8");
    parseViewBox(file, text);
    for (const hex of FOREIGN_HEXES) {
      if (text.includes(hex)) {
        throw new Error(`${file}: contains variant hex ${hex}; masters use the canonical palette only`);
      }
    }
    if (/<text[\s>]/.test(text)) {
      throw new Error(`${file}: contains a <text> element; draw glyphs as stroke paths`);
    }
    if (key.startsWith("illo:")) {
      if (!text.includes(CANON.accent)) {
        throw new Error(`${file}: canonical accent ${CANON.accent} not found; recoloring would no-op`);
      }
      if (!text.includes(OUTLINE)) {
        throw new Error(`${file}: outline ${OUTLINE} not found; illustration form requires it`);
      }
    }
  }
}

function recolor(svgText, variant) {
  return svgText
    .split(CANON.ground).join(variant.ground)
    .split(CANON.accent).join(variant.accent)
    .split(CANON.accentSoft).join(variant.accentSoft);
}

function loadVariantSvgs(variant) {
  const svgs = {};
  for (const [key, file] of Object.entries(allMasters())) {
    const text = fs.readFileSync(path.join(ART, file), "utf8");
    const { vbWidth, vbHeight } = parseViewBox(file, text);
    svgs[key] = { file, text: recolor(text, variant), vbWidth, vbHeight };
  }
  return svgs;
}

function pngOutputs(svgs) {
  return [
    ...ICON_PNG_OUTPUTS,
    ...ILLUSTRATION_MOODS.map((mood) => ({
      file: illoPngFile(mood),
      source: illoKey(mood),
      width: svgs[illoKey(mood)].vbWidth * ILLUSTRATION_SCALE,
    })),
  ];
}

function outputHeight(svg, width) {
  return Math.round((width * svg.vbHeight) / svg.vbWidth);
}

async function renderPng(svg, width) {
  // Raster density scaled so the SVG rasterizes AT the target size --
  // resize() then never upsamples a smaller bitmap.
  const density = (72 * width) / svg.vbWidth;
  return sharp(Buffer.from(svg.text), { density })
    .resize(width, outputHeight(svg, width))
    .png()
    .toBuffer();
}

async function buildVariant(variant) {
  const dir = path.join(DIST, variant.name);
  fs.mkdirSync(dir, { recursive: true });
  const svgs = loadVariantSvgs(variant);
  const outputs = pngOutputs(svgs);

  for (const svg of Object.values(svgs)) {
    fs.writeFileSync(path.join(dir, svg.file), svg.text);
  }
  for (const { file, source, width } of outputs) {
    fs.writeFileSync(path.join(dir, file), await renderPng(svgs[source], width));
  }
  const layers = await Promise.all(
    ICO_LAYERS.map(({ source, width }) => renderPng(svgs[source], width))
  );
  fs.writeFileSync(path.join(dir, "favicon.ico"), await pngToIco(layers));

  // ---- verification: wrong output is a hard failure ----
  for (const { file, source, width } of outputs) {
    const expectedHeight = outputHeight(svgs[source], width);
    const meta = await sharp(path.join(dir, file)).metadata();
    if (meta.width !== width || meta.height !== expectedHeight) {
      throw new Error(
        `${variant.name}/${file}: expected ${width}x${expectedHeight}, got ${meta.width}x${meta.height}`
      );
    }
  }
  const ico = fs.readFileSync(path.join(dir, "favicon.ico"));
  const count = ico.readUInt16LE(4); // ICONDIR idCount
  if (count !== ICO_LAYERS.length) {
    throw new Error(`${variant.name}/favicon.ico: expected ${ICO_LAYERS.length} layers, got ${count}`);
  }

  console.log(
    `${variant.name}: ${outputs.length} PNGs + favicon.ico (${ICO_LAYERS.map((l) => l.width).join("/")}) + ${Object.keys(svgs).length} SVGs`
  );
}

async function main() {
  validateMasters();
  for (const variant of VARIANTS) {
    await buildVariant(variant);
  }
  console.log("All variants generated and verified.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the generator — output must be byte-identical to before**

Run: `npm run generate`
Expected: exit 0, `portfolio-blue: 7 PNGs + favicon.ico (16/32/48) + 5 SVGs`, same for amber, `All variants generated and verified.`

Run: `git status --porcelain dist`
Expected: empty output (the refactor changed no bytes; friendly 160×4=640 and confused 200×4=800 match the old hardcoded widths).

- [ ] **Step 3: Prove the foreign-hex validation fires (red test)**

Temporarily append `<rect x="0" y="0" width="1" height="1" fill="#ffaa3c"/>` before `</svg>` in `artwork/henry-illustration-friendly.svg`.

Run: `npm run generate`
Expected: exit 1 with `henry-illustration-friendly.svg: contains variant hex #ffaa3c; masters use the canonical palette only`

Revert: `git checkout -- artwork/henry-illustration-friendly.svg`, then `npm run generate` → exit 0 again.

- [ ] **Step 4: Prove the missing-master validation fires (red test)**

Temporarily append `"happy",` to `ILLUSTRATION_MOODS`.

Run: `npm run generate`
Expected: exit 1, `ENOENT`-style error naming `henry-illustration-happy.svg`.

Revert the array to `["friendly", "confused"]`, rerun → exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate.js
git commit -m "refactor: data-driven illustration moods + master palette validation"
```

---

### Task 2: Happy expression

**Files:**
- Create: `artwork/henry-illustration-happy.svg`
- Modify: `scripts/generate.js` (append `"happy"` to `ILLUSTRATION_MOODS`)

**Interfaces:**
- Consumes: `ILLUSTRATION_MOODS` mechanism from Task 1
- Produces: mood name `happy` (README Task 17 lists it)

Spec row: eyes closed happy arcs `⌒⌒`; antenna ball brighter with quick pulse (static reading: enlarged halo); emanata 2–3 sparkles in accent + accentSoft.

- [ ] **Step 1: Register the mood (red)** — append `"happy"` after `"confused"` in `ILLUSTRATION_MOODS`. Run `npm run generate`; expected: exit 1, ENOENT for `henry-illustration-happy.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 136">
  <!-- Happy: closed arc eyes, brighter antenna glow (bigger halo), sparkles.
       Robot at friendly geometry shifted +20x/+4y for sparkle headroom. -->
  <circle cx="100" cy="17.5" r="15" fill="#1890ff" opacity="0.22"/>
  <circle cx="100" cy="17.5" r="8.5" fill="#1890ff"/>
  <rect x="96.5" y="24" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="48" y="50.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- closed happy arc eyes (upward semicircles) -->
  <path d="M 71 90 A 10.5 10.5 0 0 1 92 90" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 108 90 A 10.5 10.5 0 0 1 129 90" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
  <!-- sparkles: four-point twinkles -->
  <path d="M 0 -9 Q 2 -2 9 0 Q 2 2 0 9 Q -2 2 -9 0 Q -2 -2 0 -9 Z" transform="translate(162 30)" fill="#1890ff"/>
  <path d="M 0 -9 Q 2 -2 9 0 Q 2 2 0 9 Q -2 2 -9 0 Q -2 -2 0 -9 Z" transform="translate(180 58) scale(0.65)" fill="#40a9ff"/>
  <path d="M 0 -9 Q 2 -2 9 0 Q 2 2 0 9 Q -2 2 -9 0 Q -2 -2 0 -9 Z" transform="translate(30 34) scale(0.55)" fill="#40a9ff"/>
</svg>
```

- [ ] **Step 3: Generate (green)** — run `npm run generate`; expected: exit 0, `portfolio-blue: 8 PNGs + favicon.ico (16/32/48) + 6 SVGs`.

- [ ] **Step 4: Self-check the renders** — Read `dist/portfolio-blue/henry-illustration-happy.png` and `dist/half-built-robots-amber/henry-illustration-happy.png`. Verify: arcs curve upward (smile-eyes, not frowns), sparkles clear of the head, halo visibly larger than friendly's, nothing clipped.

- [ ] **Step 5: Opus visual review loop** — per the Review Protocol, `{MOOD}` = `happy`. Review focus:
```
G. The arc eyes must read as joyful squint (⌒⌒), not as sleepy lids or frowns — compare
   against the friendly render's open dots.
H. Sparkle placement should feel scattered/organic, not gridded; the big accent sparkle
   leads, accentSoft companions support.
```
Iterate per protocol until PASS.

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-happy.svg scripts/generate.js dist
git commit -m "feat: happy expression — closed-arc eyes, bright glow, sparkles"
```

---

### Task 3: Sad / apologetic expression

**Files:**
- Create: `artwork/henry-illustration-sad.svg`
- Modify: `scripts/generate.js` (append `"sad"`)

**Interfaces:**
- Consumes: Task 1 mechanism
- Produces: mood name `sad`

Spec row: lowered dot eyes; stem droops with dim ball; one large manga tear-style drop beside the head.

- [ ] **Step 1: Register the mood (red)** — append `"sad"`. Run `npm run generate`; expected: ENOENT for `henry-illustration-sad.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 132">
  <!-- Sad: lowered dot eyes, antenna drooping left with dimmed ball, one big
       manga teardrop beside the head. Robot shifted +4y; antenna group
       pivots at the stem base (80,48). -->
  <g transform="rotate(-24 80 48)">
    <circle cx="80" cy="17.5" r="10" fill="#1890ff" opacity="0.12"/>
    <circle cx="80" cy="17.5" r="8.5" fill="#1890ff" opacity="0.55"/>
    <rect x="76.5" y="24" width="7" height="24" rx="3" fill="#555555"/>
  </g>
  <rect x="28" y="50.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- eyes lowered 4 units below the neutral line -->
  <circle cx="61.5" cy="91" r="8.5" fill="#1890ff"/>
  <circle cx="98.5" cy="91" r="8.5" fill="#1890ff"/>
  <!-- giant manga teardrop, beside the head (the archetype of the register) -->
  <path d="M 0 -16 C 5 -8 11 -1 11 7 A 11 11 0 0 1 -11 7 C -11 -1 -5 -8 0 -16 Z"
        transform="translate(156 86)" fill="#40a9ff"/>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; expected exit 0, 9 PNGs / 7 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both sad PNGs. Verify: antenna visibly wilts left without detaching from the head, ball clearly dimmer than friendly's, teardrop reads as a drop (point up, bulb down) and clears both head and viewBox edge.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `sad`. Review focus:
```
G. The droop must read as dejected, not damaged: stem still anchored at the head, no gap
   at the base. If rotation opens a visible gap, lengthen the stem 1-2 units.
H. The teardrop is the hero: it should be unmistakably the giant manga sweat/tear drop,
   roughly a third of the head's height. accentSoft fill must stay visible in amber.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-sad.svg scripts/generate.js dist
git commit -m "feat: sad expression — drooping antenna, dim ball, manga teardrop"
```

---

### Task 4: Surprised / alert expression

**Files:**
- Create: `artwork/henry-illustration-surprised.svg`
- Modify: `scripts/generate.js` (append `"surprised"`)

**Interfaces:**
- Consumes: Task 1 mechanism
- Produces: mood name `surprised`

Spec row: oversized dot eyes; antenna ramrod straight with a flash; single big `!` popping with the boing. Layout mirrors the confused master (`0 0 200 180`, robot at x=100 shifted down 52) so the two alert poses feel like siblings.

- [ ] **Step 1: Register the mood (red)** — append `"surprised"`. `npm run generate` → ENOENT for `henry-illustration-surprised.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180">
  <!-- Surprised: oversized eyes, antenna flash (halo + outer ring), one big
       stroke-drawn exclamation mark. Layout mirrors the confused master. -->
  <circle cx="100" cy="65.5" r="16" fill="#1890ff" opacity="0.22"/>
  <circle cx="100" cy="65.5" r="21" fill="none" stroke="#1890ff" stroke-width="2.5" opacity="0.45"/>
  <circle cx="100" cy="65.5" r="8.5" fill="#1890ff"/>
  <rect x="96.5" y="72" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="48" y="98.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- oversized eyes -->
  <circle cx="81.5" cy="135" r="11" fill="#1890ff"/>
  <circle cx="118.5" cy="135" r="11" fill="#1890ff"/>
  <!-- big exclamation mark, stroke-drawn, tilted like the confused ? -->
  <g transform="translate(148 30) rotate(12)">
    <path d="M 0 -20 L 0 4" fill="none" stroke="#1890ff" stroke-width="6.5" stroke-linecap="round"/>
    <circle cx="0" cy="15" r="4" fill="#1890ff"/>
  </g>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 10 PNGs / 8 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both surprised PNGs next to the confused PNG. Verify: eyes clearly bigger than friendly's, flash ring visible but subtle, `!` scale and tilt feel like the confused `?`'s sibling.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `surprised`. Review focus:
```
G. Side-by-side with confused: same composition language (symbol top-right, tilted,
   accent-colored). The ! should have the visual weight of the main ? there.
H. The flash ring must not read as a second halo/target; if it competes with the ball,
   drop its opacity toward 0.3 or pull its radius in.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-surprised.svg scripts/generate.js dist
git commit -m "feat: surprised expression — oversized eyes, antenna flash, big !"
```

---

### Task 5: Sleepy expression

**Files:**
- Create: `artwork/henry-illustration-sleepy.svg`
- Modify: `scripts/generate.js` (append `"sleepy"`)

**Interfaces:**
- Consumes: Task 1 mechanism
- Produces: mood name `sleepy`; the half-lid eye path shape (lower semicircle) reused verbatim by Task 15 (low-battery)

Spec row: half-lidded eyes; stem tilted, ball faded; Zzz stair-stepping up.

- [ ] **Step 1: Register the mood (red)** — append `"sleepy"`. `npm run generate` → ENOENT for `henry-illustration-sleepy.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 148">
  <!-- Sleepy: half-lidded eyes (lower semicircles), antenna tilted with faded
       ball, Zzz stair-stepping toward the top-right. Robot shifted +16y;
       antenna group pivots at the stem base (80,60). -->
  <g transform="rotate(-16 80 60)">
    <circle cx="80" cy="29.5" r="10" fill="#1890ff" opacity="0.1"/>
    <circle cx="80" cy="29.5" r="8.5" fill="#1890ff" opacity="0.5"/>
    <rect x="76.5" y="36" width="7" height="24" rx="3" fill="#555555"/>
  </g>
  <rect x="28" y="62.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- half-lidded eyes: lower semicircles, flat lid on top -->
  <path d="M 53 99 A 8.5 8.5 0 0 0 70 99 Z" fill="#1890ff"/>
  <path d="M 90 99 A 8.5 8.5 0 0 0 107 99 Z" fill="#1890ff"/>
  <!-- Zzz, small to large, stair-stepping up-right -->
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M -7 -7 H 7 L -7 7 H 7" transform="translate(142 80) scale(0.55)" stroke="#40a9ff" stroke-width="4.5"/>
    <path d="M -7 -7 H 7 L -7 7 H 7" transform="translate(160 54) scale(0.8)" stroke="#40a9ff" stroke-width="4.5"/>
    <path d="M -7 -7 H 7 L -7 7 H 7" transform="translate(180 26) scale(1.05)" stroke="#1890ff" stroke-width="4.5"/>
  </g>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 11 PNGs / 9 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both sleepy PNGs. Verify: eyes read as heavy lids (flat top, round bottom), Z's ascend in a clean diagonal and stay inside the frame, faded ball still visible in amber.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `sleepy`. Review focus:
```
G. Half-lids must not read as the happy arcs upside down or as generic semicircle bugs —
   heavy, drowsy, flat-topped.
H. The Zzz diagonal is the classic manga sleep mark: sizes must clearly step up, and the
   largest Z (accent) anchors the far end.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-sleepy.svg scripts/generate.js dist
git commit -m "feat: sleepy expression — half-lidded eyes, tilted antenna, Zzz"
```

---

### Task 6: Love / delighted expression

**Files:**
- Create: `artwork/henry-illustration-love.svg`
- Modify: `scripts/generate.js` (append `"love"`)

**Interfaces:**
- Consumes: Task 1 mechanism
- Produces: mood name `love`

Spec row: dot eyes (arcs reserved for happy, keeping the two distinct); normal ball; floating hearts. Composition mirrors confused: main symbol + smaller accentSoft companion, top-right.

- [ ] **Step 1: Register the mood (red)** — append `"love"`. `npm run generate` → ENOENT for `henry-illustration-love.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170">
  <!-- Love: neutral dot eyes, normal antenna, floating hearts top-right in
       the confused-pose composition (main accent heart + smaller accentSoft
       companion). Robot at x=100, shifted down 42. -->
  <circle cx="100" cy="55.5" r="13" fill="#1890ff" opacity="0.22"/>
  <circle cx="100" cy="55.5" r="8.5" fill="#1890ff"/>
  <rect x="96.5" y="62" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="48" y="88.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <circle cx="81.5" cy="125" r="8.5" fill="#1890ff"/>
  <circle cx="118.5" cy="125" r="8.5" fill="#1890ff"/>
  <!-- main heart -->
  <path d="M 0 -3 C -1.5 -6 -6 -6 -7.5 -3 C -9 0 -6 3 0 7.5 C 6 3 9 0 7.5 -3 C 6 -6 1.5 -6 0 -3 Z"
        transform="translate(146 24) rotate(10) scale(1.9)" fill="#1890ff"/>
  <!-- companion heart -->
  <path d="M 0 -3 C -1.5 -6 -6 -6 -7.5 -3 C -9 0 -6 3 0 7.5 C 6 3 9 0 7.5 -3 C 6 -6 1.5 -6 0 -3 Z"
        transform="translate(180 12) rotate(22) scale(1.15)" fill="#40a9ff"/>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 12 PNGs / 10 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both love PNGs. Verify: hearts read as hearts at a glance (two lobes, point down before rotation), companion not clipped at the top-right corner.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `love`. Review focus:
```
G. Heart silhouette check at small size: lobes must be distinct, the notch visible. If
   mushy, deepen the notch (pull the C control points at y=-6 further apart).
H. Composition twin of confused: same top-right placement, tilt, and main/companion
   size relationship as the question marks.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-love.svg scripts/generate.js dist
git commit -m "feat: love expression — floating hearts in the confused composition"
```

---

### Task 7: Dizzy expression

**Files:**
- Create: `artwork/henry-illustration-dizzy.svg`
- Modify: `scripts/generate.js` (append `"dizzy"`)

**Interfaces:**
- Consumes: Task 1 mechanism; sparkle/star path from Task 2 (same four-point shape)
- Produces: mood name `dizzy`

Spec row: X-eyes; stem wobbles (slight rotation); stars orbiting the head.

- [ ] **Step 1: Register the mood (red)** — append `"dizzy"`. `npm run generate` → ENOENT for `henry-illustration-dizzy.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 146">
  <!-- Dizzy: X-eyes, antenna mid-wobble (slight tilt), stars orbiting the
       head. Robot shifted +18y; antenna group pivots at stem base (80,62). -->
  <g transform="rotate(6 80 62)">
    <circle cx="80" cy="31.5" r="13" fill="#1890ff" opacity="0.22"/>
    <circle cx="80" cy="31.5" r="8.5" fill="#1890ff"/>
    <rect x="76.5" y="38" width="7" height="24" rx="3" fill="#555555"/>
  </g>
  <rect x="28" y="64.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- X-eyes -->
  <g stroke="#1890ff" stroke-width="5" stroke-linecap="round">
    <path d="M 54.5 94 L 68.5 108"/>
    <path d="M 68.5 94 L 54.5 108"/>
    <path d="M 91.5 94 L 105.5 108"/>
    <path d="M 105.5 94 L 91.5 108"/>
  </g>
  <!-- orbiting stars -->
  <path d="M 0 -9 Q 2 -2 9 0 Q 2 2 0 9 Q -2 2 -9 0 Q -2 -2 0 -9 Z" transform="translate(34 44) scale(0.6)" fill="#40a9ff"/>
  <path d="M 0 -9 Q 2 -2 9 0 Q 2 2 0 9 Q -2 2 -9 0 Q -2 -2 0 -9 Z" transform="translate(126 30) scale(0.8)" fill="#1890ff"/>
  <path d="M 0 -9 Q 2 -2 9 0 Q 2 2 0 9 Q -2 2 -9 0 Q -2 -2 0 -9 Z" transform="translate(152 64) scale(0.55)" fill="#40a9ff"/>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 13 PNGs / 11 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both dizzy PNGs. Verify: X strokes are the same visual weight as the dot eyes, stars trace a believable arc over the head, wobble tilt is noticeable but not "broken antenna".

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `dizzy`. Review focus:
```
G. The three stars should imply an orbit path around the crown of the head — if they
   read as random confetti, move them onto a rough ellipse.
H. Distinctness from the future glitched pose: dizzy is organic/loopy (stars, wobble),
   nothing angular or electrical belongs here.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-dizzy.svg scripts/generate.js dist
git commit -m "feat: dizzy expression — X-eyes, wobbling antenna, orbiting stars"
```

---

### Task 8: Pouty / grumpy expression

**Files:**
- Create: `artwork/henry-illustration-pouty.svg`
- Modify: `scripts/generate.js` (append `"pouty"`)

**Interfaces:**
- Consumes: Task 1 mechanism
- Produces: mood name `pouty`

Spec row: squeezed `> <` eyes; stem stiff, ball flickers irritably (static reading: reduced, tighter halo); manga anger vein (cruciform popped-vein mark) beside the head.

- [ ] **Step 1: Register the mood (red)** — append `"pouty"`. `npm run generate` → ENOENT for `henry-illustration-pouty.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 128">
  <!-- Pouty: > < squeezed eyes, stiff antenna with an irritable (tight, dim)
       halo, manga anger vein beside the head. Robot at friendly geometry. -->
  <circle cx="80" cy="13.5" r="10" fill="#1890ff" opacity="0.15"/>
  <circle cx="80" cy="13.5" r="8.5" fill="#1890ff"/>
  <rect x="76.5" y="20" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="28" y="46.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- > < eyes -->
  <g fill="none" stroke="#1890ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 52 76 L 69 83 L 52 90"/>
    <path d="M 108 76 L 91 83 L 108 90"/>
  </g>
  <!-- manga anger vein: four corner bumps forming the cruciform mark -->
  <g transform="translate(154 58) rotate(8)" fill="none" stroke="#1890ff" stroke-width="4" stroke-linecap="round">
    <path d="M 3 10 A 8 8 0 0 1 10 3"/>
    <path d="M 10 -3 A 8 8 0 0 1 3 -10"/>
    <path d="M -3 -10 A 8 8 0 0 1 -10 -3"/>
    <path d="M -10 3 A 8 8 0 0 1 -3 10"/>
  </g>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 14 PNGs / 12 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both pouty PNGs. Verify: the `> <` reads as squeezed-shut irritation, the anger vein reads as the classic cruciform mark (four bumps, hollow center), placed off the head's top-right corner like a temple vein.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `pouty`. Review focus:
```
G. The anger vein is the make-or-break: it must read as the canonical manga popped-vein
   mark. If the four arcs read as a broken circle, increase the gap between arc ends.
H. Tone check: grumpy-cute, not hostile — if it reads mean, soften by shrinking the vein
   or relaxing the eye angle.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-pouty.svg scripts/generate.js dist
git commit -m "feat: pouty expression — squeezed eyes and manga anger vein"
```

---

### Task 9: Emotional-family consistency review (checkpoint)

**Files:**
- Modify (only if fixes emerge): any of the 7 emotional masters + `dist/`

**Interfaces:**
- Consumes: renders of friendly, confused, happy, sad, surprised, sleepy, love, dizzy, pouty
- Produces: a consistent emotional-core family; sign-off recorded in the commit message

- [ ] **Step 1: Dispatch the family review (Opus)** — Agent tool, `subagent_type: "general-purpose"`, `model: "opus"`:

```
You are reviewing a FAMILY of expression poses for Henry the robot mascot for internal
consistency. View all of these renders (Read displays images):
dist/portfolio-blue/henry-illustration-{friendly,confused,happy,sad,surprised,sleepy,love,dizzy,pouty}.png
and the same nine files under dist/half-built-robots-amber/.
Also read docs/superpowers/specs/2026-07-03-henry-expressions-design.md.

Judge ONLY cross-pose consistency (each pose already passed individual review):
1. Stroke weights: emanata and eye strokes should sit in the same 4-6.5 range and feel
   like one pen.
2. Eye scale: dot eyes r8.5 everywhere except surprised (r11 deliberate); arcs/lids/X/><
   should occupy roughly the same footprint as the dots they replace.
3. Emanata scale: each pose's hero symbol should have similar visual weight (the
   confused main ?, the !, the teardrop, the main heart, the big Z, the big sparkle,
   the anger vein).
4. Margins and robot size: Henry should look the same physical size in every frame;
   flag any pose where viewBox padding makes him noticeably larger/smaller when
   rendered at the same width.
5. Antenna-agrees-with-eyes rule holds in every pose.

Final message: "PASS" or a numbered fix list grouped by pose, with exact attribute edits.
```

- [ ] **Step 2: Apply fixes and re-verify** — apply any fixes to masters, `npm run generate`, re-dispatch a fresh reviewer. Max 3 rounds, then escalate to the user.

- [ ] **Step 3: Commit (even if no fixes — record the checkpoint)**

```bash
git add artwork dist
git commit -m "review: emotional-core family consistency pass" --allow-empty
```

---

### Task 10: Glitched / does-not-compute expression

**Files:**
- Create: `artwork/henry-illustration-glitched.svg`
- Modify: `scripts/generate.js` (append `"glitched"`)

**Interfaces:**
- Consumes: Task 1 mechanism
- Produces: mood name `glitched`; first tip-morph (spark), establishing the robot-set precedent that the ball may be replaced by hardware

Spec row: mismatched eye sizes (X-eyes belong to dizzy; mismatch keeps them distinct); antenna tip is a jagged spark; pixel-square artifacts drifting off the head.

- [ ] **Step 1: Register the mood (red)** — append `"glitched"`. `npm run generate` → ENOENT for `henry-illustration-glitched.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 136">
  <!-- Glitched: mismatched eye sizes, antenna tip morphed into a jagged
       spark (first robot-set tip morph), pixel artifacts drifting off the
       head. Robot shifted +8y. -->
  <circle cx="80" cy="20" r="13" fill="#1890ff" opacity="0.22"/>
  <!-- spark bolt replaces the ball -->
  <polygon points="84,6 73,22 79,22 76,34 87,17 81,17" fill="#1890ff"/>
  <rect x="76.5" y="28" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="28" y="54.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- mismatched eyes -->
  <circle cx="61.5" cy="91" r="5.5" fill="#1890ff"/>
  <circle cx="98.5" cy="91" r="11" fill="#1890ff"/>
  <!-- pixel artifacts -->
  <rect x="142" y="62" width="6" height="6" fill="#1890ff"/>
  <rect x="154" y="76" width="4" height="4" fill="#40a9ff"/>
  <rect x="146" y="90" width="5" height="5" fill="#1890ff" opacity="0.6"/>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 15 PNGs / 13 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both glitched PNGs. Verify: the bolt reads as electricity at the stem tip (not a detached shard), the bolt overlaps/touches the stem top, artifacts sit off the head's right edge like escaping pixels.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `glitched`. Review focus:
```
G. Tip-morph legibility: the spark must clearly be where the ball used to be — attached
   to the stem tip, similar footprint to the r8.5 ball. Extend the bolt's lowest vertex
   to touch the stem if there's a gap.
H. Distinctness from dizzy: everything here is angular and electrical; nothing loopy.
I. The mismatched eyes should read as a malfunction, not a rendering mistake — if
   ambiguous, exaggerate the size gap.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-glitched.svg scripts/generate.js dist
git commit -m "feat: glitched expression — spark tip morph, mismatched eyes, pixel artifacts"
```

---

### Task 11: Signal-lost expression

**Files:**
- Create: `artwork/henry-illustration-signal-lost.svg`
- Modify: `scripts/generate.js` (append `"signal-lost"`)

**Interfaces:**
- Consumes: Task 1 mechanism; tip-morph precedent from Task 10
- Produces: mood name `signal-lost`; the dish tip shape (Task 13 deliberately does NOT reuse it — broadcasting keeps the ball)

Spec row: small worried dot eyes; tip is a dish, tilted, searching; broken/dashed `)))` arcs.

- [ ] **Step 1: Register the mood (red)** — append `"signal-lost"`. `npm run generate` → ENOENT for `henry-illustration-signal-lost.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 156">
  <!-- Signal lost: small worried eyes, antenna tip morphed into a tilted
       searching dish, broken (dashed) signal arcs. Robot shifted +24y. -->
  <rect x="76.5" y="44" width="7" height="24" rx="3" fill="#555555"/>
  <!-- dish: upward-opening bowl, tilted as if searching -->
  <g transform="translate(80 40) rotate(-18)">
    <path d="M -11 -1 A 11 9 0 0 0 11 -1 Z" fill="#ffffff" stroke="#555555" stroke-width="3.5"/>
    <circle cx="0" cy="-6" r="2.8" fill="#1890ff"/>
  </g>
  <rect x="28" y="70.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- small worried eyes -->
  <circle cx="61.5" cy="107" r="6.5" fill="#1890ff"/>
  <circle cx="98.5" cy="107" r="6.5" fill="#1890ff"/>
  <!-- broken signal arcs, dashed, sweeping up-right from the dish -->
  <g fill="none" stroke-linecap="round" stroke-dasharray="7 8">
    <path d="M 88 22 A 16 16 0 0 1 96 44" stroke="#1890ff" stroke-width="4"/>
    <path d="M 94 14 A 25 25 0 0 1 105 47" stroke="#1890ff" stroke-width="4"/>
    <path d="M 100 6 A 34 34 0 0 1 114 50" stroke="#40a9ff" stroke-width="4"/>
  </g>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 16 PNGs / 14 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both signal-lost PNGs. Verify: dish reads as a bowl on the stem (opening up-right), dashed arcs read as weak/broken signal radiating from the dish, worried eyes clearly smaller than neutral.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `signal-lost`. Review focus:
```
G. The dish is the second tip-morph: it must sit ON the stem tip (no float gap) and read
   as hardware Henry is wearing, in the same footprint class as the ball.
H. The dashes must read as broken transmission, not a dotted decorative border — if
   ambiguous, delete a middle dash segment from one arc to show dropout.
I. The arcs should visibly emanate from the dish's opening direction (up-right after
   the -18 deg tilt); recentre them if they look detached.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-signal-lost.svg scripts/generate.js dist
git commit -m "feat: signal-lost expression — dish tip morph and broken signal arcs"
```

---

### Task 12: Charging expression

**Files:**
- Create: `artwork/henry-illustration-charging.svg`
- Modify: `scripts/generate.js` (append `"charging"`)

**Interfaces:**
- Consumes: Task 1 mechanism; happy-arc eye paths from Task 2 (same shape, shifted)
- Produces: mood name `charging`

Spec row: content arc eyes; tip is a plug with a cord trailing off-frame; slow contented glow (static: normal halo behind the plug). The spec frames this as Henry's version of a Chao eating a fruit.

- [ ] **Step 1: Register the mood (red)** — append `"charging"`. `npm run generate` → ENOENT for `henry-illustration-charging.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 148">
  <!-- Charging: content arc eyes, antenna tip morphed into a plug whose cord
       trails off the top-right of the frame, contented glow. Robot +20y. -->
  <circle cx="80" cy="33" r="13" fill="#1890ff" opacity="0.22"/>
  <!-- cord trailing off-frame -->
  <path d="M 80 26 C 82 12 106 8 130 11 C 152 14 166 8 176 10"
        fill="none" stroke="#555555" stroke-width="4.5" stroke-linecap="round"/>
  <!-- plug body seated on the stem tip, with an accent charge LED -->
  <rect x="72" y="26" width="16" height="14" rx="3.5" fill="#555555"/>
  <circle cx="80" cy="33" r="2.8" fill="#1890ff"/>
  <rect x="76.5" y="40" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="28" y="66.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- content arc eyes -->
  <path d="M 51 106 A 10.5 10.5 0 0 1 72 106" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 88 106 A 10.5 10.5 0 0 1 109 106" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 17 PNGs / 15 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both charging PNGs. Verify: plug reads as plugged onto the antenna (body seated on stem, cord exiting the top), cord curve is relaxed and exits the frame edge cleanly, arc eyes read as contentment.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `charging`. Review focus:
```
G. Story legibility: "robot happily charging via its antenna" must land without caption.
   If the plug reads as a hat or box, add two small prong nubs where it meets the stem.
H. The cord must read as a cable (smooth, slack), not a stray outline; it should exit
   the viewBox edge, implying the wall socket beyond the frame.
I. Mood: this is the contented Chao-eating-a-fruit beat — cozy, not busy.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-charging.svg scripts/generate.js dist
git commit -m "feat: charging expression — plug tip morph with trailing cord"
```

---

### Task 13: Broadcasting expression

**Files:**
- Create: `artwork/henry-illustration-broadcasting.svg`
- Modify: `scripts/generate.js` (append `"broadcasting"`)

**Interfaces:**
- Consumes: Task 1 mechanism; arc eyes from Task 2
- Produces: mood name `broadcasting`

Spec row: happy arc eyes; ball radiating clean `)))` waves (spec allows dish or ball — the ball keeps it visually distinct from signal-lost and keeps the emotional-register tip intact).

- [ ] **Step 1: Register the mood (red)** — append `"broadcasting"`. `npm run generate` → ENOENT for `henry-illustration-broadcasting.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 150">
  <!-- Broadcasting: happy arc eyes, ball radiating three clean signal waves
       upward. Solid arcs = strong signal (signal-lost uses dashed). +22y. -->
  <circle cx="80" cy="35.5" r="13" fill="#1890ff" opacity="0.22"/>
  <circle cx="80" cy="35.5" r="8.5" fill="#1890ff"/>
  <rect x="76.5" y="42" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="28" y="68.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- happy arc eyes -->
  <path d="M 51 108 A 10.5 10.5 0 0 1 72 108" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 88 108 A 10.5 10.5 0 0 1 109 108" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
  <!-- clean broadcast waves, concentric on the ball -->
  <g fill="none" stroke-linecap="round">
    <path d="M 68.3 23.8 A 16.5 16.5 0 0 1 91.7 23.8" stroke="#1890ff" stroke-width="4"/>
    <path d="M 62.7 18.2 A 24.5 24.5 0 0 1 97.3 18.2" stroke="#1890ff" stroke-width="4" opacity="0.75"/>
    <path d="M 57 12.5 A 32.5 32.5 0 0 1 103 12.5" stroke="#40a9ff" stroke-width="4"/>
  </g>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 18 PNGs / 16 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both broadcasting PNGs. Verify: three waves are concentric on the ball and evenly spaced, the pose reads as "cheerfully transmitting", top wave clears the frame edge.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `broadcasting`. Review focus:
```
G. Side-by-side with signal-lost: broadcasting = solid, symmetric, confident; signal-lost
   = dashed, tilted, searching. The contrast must be obvious at a glance.
H. Wave spacing: gaps between arcs should be even; adjust radii rather than stroke width
   if they band together.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-broadcasting.svg scripts/generate.js dist
git commit -m "feat: broadcasting expression — radiating signal waves"
```

---

### Task 14: Rebooting expression

**Files:**
- Create: `artwork/henry-illustration-rebooting.svg`
- Modify: `scripts/generate.js` (append `"rebooting"`)

**Interfaces:**
- Consumes: Task 1 mechanism
- Produces: mood name `rebooting`

Spec row: closed eyes; ball blinking at 1 Hz (animation-only — static master keeps the ball normal); `· · ·` cycling dots. The fading dot opacities imply the cycle in the still image.

- [ ] **Step 1: Register the mood (red)** — append `"rebooting"`. `npm run generate` → ENOENT for `henry-illustration-rebooting.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 128">
  <!-- Rebooting: closed-line eyes, normal ball (the 1Hz blink is animation-
       only), cycling status dots fading out beside the head. -->
  <circle cx="80" cy="13.5" r="13" fill="#1890ff" opacity="0.22"/>
  <circle cx="80" cy="13.5" r="8.5" fill="#1890ff"/>
  <rect x="76.5" y="20" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="28" y="46.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- closed eyes: flat lines -->
  <path d="M 53 83 L 70 83" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 90 83 L 107 83" fill="none" stroke="#1890ff" stroke-width="5.5" stroke-linecap="round"/>
  <!-- cycling dots, fading -->
  <circle cx="146" cy="70" r="4.5" fill="#1890ff"/>
  <circle cx="160" cy="70" r="4.5" fill="#1890ff" opacity="0.55"/>
  <circle cx="174" cy="70" r="4.5" fill="#40a9ff" opacity="0.5"/>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 19 PNGs / 17 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both rebooting PNGs. Verify: closed-line eyes read as "powered down mid-cycle" (not asleep — no droop, no Zzz), dots visibly fade left-to-right.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `rebooting`. Review focus:
```
G. Distinctness from sleepy: rebooting is neutral/technical (level lines, upright
   antenna, status dots); nothing drowsy. If it reads sleepy, the eye lines may need
   to sit exactly on the neutral eye line (y=83).
H. The three dots must read as a progress/loading indicator, not confetti — evenly
   spaced, same size, fading opacity.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-rebooting.svg scripts/generate.js dist
git commit -m "feat: rebooting expression — closed eyes and cycling status dots"
```

---

### Task 15: Low-battery expression

**Files:**
- Create: `artwork/henry-illustration-low-battery.svg`
- Modify: `scripts/generate.js` (append `"low-battery"`)

**Interfaces:**
- Consumes: Task 1 mechanism; half-lid eye paths from Task 5 (same shape, shifted +8y here vs +16y there)
- Produces: mood name `low-battery`

Spec row: droopy half-lids; ball dims to a hollow outline, glow gone; tiny battery-sliver icon beside the head.

- [ ] **Step 1: Register the mood (red)** — append `"low-battery"`. `npm run generate` → ENOENT for `henry-illustration-low-battery.svg`.

- [ ] **Step 2: Author the master**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 136">
  <!-- Low battery: droopy half-lid eyes, ball reduced to a hollow outline
       with no glow halo, battery-sliver icon beside the head. Robot +8y. -->
  <circle cx="80" cy="21.5" r="7" fill="none" stroke="#1890ff" stroke-width="3.5"/>
  <rect x="76.5" y="28" width="7" height="24" rx="3" fill="#555555"/>
  <rect x="28" y="54.5" width="104" height="73" rx="17.5" fill="#ffffff" stroke="#555555" stroke-width="5"/>
  <!-- droopy half-lid eyes (same lower-semicircle shape as sleepy) -->
  <path d="M 53 91 A 8.5 8.5 0 0 0 70 91 Z" fill="#1890ff"/>
  <path d="M 90 91 A 8.5 8.5 0 0 0 107 91 Z" fill="#1890ff"/>
  <!-- battery icon: outline shell, terminal nub, one sliver of charge left -->
  <g transform="translate(154 62) rotate(8)">
    <rect x="-13" y="-8" width="24" height="16" rx="3" fill="none" stroke="#1890ff" stroke-width="3.5"/>
    <rect x="11" y="-4" width="4.5" height="8" rx="1.5" fill="#1890ff"/>
    <rect x="-9.5" y="-4.5" width="5" height="9" fill="#40a9ff"/>
  </g>
</svg>
```

- [ ] **Step 3: Generate (green)** — `npm run generate`; exit 0, 20 PNGs / 18 SVGs per variant.

- [ ] **Step 4: Self-check renders** — Read both low-battery PNGs. Verify: hollow ball reads as "light off" (compare against friendly's lit ball), battery icon reads at a glance with the lone accentSoft sliver at the low end, no halo present.

- [ ] **Step 5: Opus visual review loop** — `{MOOD}` = `low-battery`. Review focus:
```
G. The hollow ball is the tell: unlit, not missing. If it reads as a drawing error,
   thicken its stroke toward 4 or nudge the radius to match the r8.5 silhouette.
H. Distinctness from sleepy (its merge-pair): low-battery is technical — upright
   antenna, battery icon, no Zzz, no tilt. Only the eyes overlap.
I. Battery legibility at 150px: shell, nub, and sliver must all survive squinting.
```

- [ ] **Step 6: Commit**

```bash
git add artwork/henry-illustration-low-battery.svg scripts/generate.js dist
git commit -m "feat: low-battery expression — hollow ball and battery-sliver icon"
```

---

### Task 16: Robot-family consistency review (checkpoint)

**Files:**
- Modify (only if fixes emerge): any robot-set master + `dist/`

**Interfaces:**
- Consumes: renders of all 15 moods
- Produces: consistent robot-set family; whole-roster coherence sign-off

- [ ] **Step 1: Dispatch the family review (Opus)** — Agent tool, `subagent_type: "general-purpose"`, `model: "opus"`:

```
You are reviewing the ROBOT-SET expression poses for Henry the robot mascot, plus their
coherence with the full roster. View these renders (Read displays images):
dist/portfolio-blue/henry-illustration-{glitched,signal-lost,charging,broadcasting,rebooting,low-battery}.png,
the same six under dist/half-built-robots-amber/, and for cross-family calibration
dist/portfolio-blue/henry-illustration-{friendly,confused,happy,sad,sleepy}.png.
Also read docs/superpowers/specs/2026-07-03-henry-expressions-design.md.

Judge ONLY cross-pose consistency:
1. Tip-morph rule: exactly three poses morph the tip (glitched=spark, signal-lost=dish,
   charging=plug); broadcasting/rebooting/low-battery keep the ball. Verify each morph
   sits on the stem in the ball's footprint and reads as hardware.
2. The merge-pairs must be distinguishable at a glance: sleepy vs low-battery,
   dizzy vs glitched, and broadcasting vs signal-lost. Name the differentiator you see
   for each pair; fail any pair where you can't.
3. Stroke weights, eye footprints, emanata visual weight, margins, and robot size
   consistent across all six and with the emotional core.
4. Robot-set tone: technical but still kawaii — these are moods, not warning icons.

Final message: "PASS" or a numbered fix list grouped by pose, with exact attribute edits.
```

- [ ] **Step 2: Apply fixes and re-verify** — apply, `npm run generate`, fresh reviewer. Max 3 rounds, then escalate.

- [ ] **Step 3: Commit**

```bash
git add artwork dist
git commit -m "review: robot-set family consistency pass" --allow-empty
```

---

### Task 17: README update

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: all 15 mood names and their dist file paths; the spec doc path
- Produces: user-facing documentation of the expression system

Note: the working tree may already contain unrelated user edits to `README.md`. Do not revert them; apply these edits on top, and stage only hunks belonging to this task if the user's edits are still uncommitted.

- [ ] **Step 1: Update the character section** — replace the sentence fragment `Two poses ship in `dist/`: *friendly* and *confused*\n  (question marks included).` (end of the Illustration-form bullet) with:

```markdown
Fifteen moods ship in `dist/`; the expression gallery below has the full roster.
```

- [ ] **Step 2: Replace the `- **Moods:**` block** — the bullet and its two sub-bullets (*Friendly*, *Confused*) become:

```markdown
- **Moods:** every expression is a combination of three channels — eye shape, antenna
  state, and stroke-drawn manga symbols (emanata). The grammar and the per-mood specs
  live in the [expression design doc](docs/superpowers/specs/2026-07-03-henry-expressions-design.md).
  The two load-bearing rules: the antenna must agree with the eyes (it's the mood
  barometer), and the antenna tip stays a glowing ball except in robot moods, where it
  may swap to hardware (a plug, a dish, a spark). *Friendly* (blinking, pulsing) and
  *confused* (question marks, boing) remain the two moods with living animated
  implementations in the portfolio's `CuteRobot` component.
```

- [ ] **Step 3: Replace the two illustration rows of the Gallery table** with an Expressions table after the icon table:

```markdown
### Expressions

| Mood | portfolio-blue | half-built-robots-amber |
|---|---|---|
| Friendly | <img src="dist/portfolio-blue/henry-illustration-friendly.svg" width="140" alt="Friendly Henry, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-friendly.svg" width="140" alt="Friendly Henry, amber"> |
| Confused | <img src="dist/portfolio-blue/henry-illustration-confused.svg" width="140" alt="Confused Henry with question marks, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-confused.svg" width="140" alt="Confused Henry with question marks, amber"> |
| Happy | <img src="dist/portfolio-blue/henry-illustration-happy.svg" width="140" alt="Happy Henry with closed arc eyes and sparkles, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-happy.svg" width="140" alt="Happy Henry with closed arc eyes and sparkles, amber"> |
| Sad | <img src="dist/portfolio-blue/henry-illustration-sad.svg" width="140" alt="Sad Henry with drooping antenna and a big teardrop, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-sad.svg" width="140" alt="Sad Henry with drooping antenna and a big teardrop, amber"> |
| Surprised | <img src="dist/portfolio-blue/henry-illustration-surprised.svg" width="140" alt="Surprised Henry with wide eyes and an exclamation mark, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-surprised.svg" width="140" alt="Surprised Henry with wide eyes and an exclamation mark, amber"> |
| Sleepy | <img src="dist/portfolio-blue/henry-illustration-sleepy.svg" width="140" alt="Sleepy Henry with half-lidded eyes and Zzz, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-sleepy.svg" width="140" alt="Sleepy Henry with half-lidded eyes and Zzz, amber"> |
| Love | <img src="dist/portfolio-blue/henry-illustration-love.svg" width="140" alt="Henry with floating hearts, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-love.svg" width="140" alt="Henry with floating hearts, amber"> |
| Dizzy | <img src="dist/portfolio-blue/henry-illustration-dizzy.svg" width="140" alt="Dizzy Henry with X eyes and orbiting stars, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-dizzy.svg" width="140" alt="Dizzy Henry with X eyes and orbiting stars, amber"> |
| Pouty | <img src="dist/portfolio-blue/henry-illustration-pouty.svg" width="140" alt="Pouty Henry with squeezed eyes and an anger vein, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-pouty.svg" width="140" alt="Pouty Henry with squeezed eyes and an anger vein, amber"> |
| Glitched | <img src="dist/portfolio-blue/henry-illustration-glitched.svg" width="140" alt="Glitched Henry with a spark antenna and pixel artifacts, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-glitched.svg" width="140" alt="Glitched Henry with a spark antenna and pixel artifacts, amber"> |
| Signal lost | <img src="dist/portfolio-blue/henry-illustration-signal-lost.svg" width="140" alt="Henry with a searching dish antenna and broken signal arcs, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-signal-lost.svg" width="140" alt="Henry with a searching dish antenna and broken signal arcs, amber"> |
| Charging | <img src="dist/portfolio-blue/henry-illustration-charging.svg" width="140" alt="Content Henry charging through a plug on his antenna, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-charging.svg" width="140" alt="Content Henry charging through a plug on his antenna, amber"> |
| Broadcasting | <img src="dist/portfolio-blue/henry-illustration-broadcasting.svg" width="140" alt="Henry broadcasting signal waves from his antenna, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-broadcasting.svg" width="140" alt="Henry broadcasting signal waves from his antenna, amber"> |
| Rebooting | <img src="dist/portfolio-blue/henry-illustration-rebooting.svg" width="140" alt="Rebooting Henry with closed eyes and cycling dots, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-rebooting.svg" width="140" alt="Rebooting Henry with closed eyes and cycling dots, amber"> |
| Low battery | <img src="dist/portfolio-blue/henry-illustration-low-battery.svg" width="140" alt="Low-battery Henry with an unlit antenna and a battery icon, portfolio-blue"> | <img src="dist/half-built-robots-amber/henry-illustration-low-battery.svg" width="140" alt="Low-battery Henry with an unlit antenna and a battery icon, amber"> |
```

- [ ] **Step 4: Add design rule 6** after rule 5:

```markdown
6. **Expressions follow the grammar.** A new mood is a combination of eye shape, antenna
   state, and stroke-drawn emanata per the
   [expression design doc](docs/superpowers/specs/2026-07-03-henry-expressions-design.md);
   the antenna tip morphs into hardware only in robot moods.
```

- [ ] **Step 5: Update the repo-layout block** — replace the two `henry-illustration-*.svg` lines with:

```
  henry-illustration-<mood>.svg     outlined portraits, one per mood (15 moods; the list
                                    lives in ILLUSTRATION_MOODS in scripts/generate.js)
```

- [ ] **Step 6: Update the dist-contents paragraph** — replace the sentence starting `illustration PNGs (` through `no font dependency.` with:

```markdown
one transparent illustration PNG per mood (4× the master's viewBox width), plus recolored
copies of all eighteen SVGs. Illustration emanata (question marks, sparkles, hearts, and
the rest) are stroke-drawn paths, not text, so they render identically everywhere with no
font dependency.
```

- [ ] **Step 7: Verify** — render-check the README (view it in the IDE or on GitHub after push); confirm every image path in the Expressions table exists on disk:

Run (PowerShell): `Get-ChildItem dist/portfolio-blue/henry-illustration-*.svg | Measure-Object` → Count 15; same for amber.

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "docs: expression gallery, mood grammar, and updated repo docs"
```

---

### Task 18: Final verification and release review

**Files:**
- None expected (fixes only if the review finds gaps)

**Interfaces:**
- Consumes: everything above
- Produces: verified, user-reviewable release state

- [ ] **Step 1: Clean regenerate** — run `npm run generate`; expected: exit 0, `portfolio-blue: 20 PNGs + favicon.ico (16/32/48) + 18 SVGs` (same for amber), `All variants generated and verified.` Then `git status --porcelain` → empty (dist committed and stable; rerunning produces no diff).

- [ ] **Step 2: Dispatch the final release review (Opus)** — Agent tool, `subagent_type: "general-purpose"`, `model: "opus"`:

```
Final release review for Henry expression system v2.
Read docs/superpowers/specs/2026-07-03-henry-expressions-design.md and README.md, then
view all 15 renders under dist/portfolio-blue/henry-illustration-*.png.

Check for anything the per-pose and family reviews could have missed:
1. Spec coverage: every roster row in the spec has a shipped pose whose channels match
   its eyes/antenna/emanata columns. List any row that shipped different from spec.
2. README accuracy: every claim (counts, filenames, grammar description, design rule 6)
   matches the repo's actual state.
3. Naming: dist files are henry-illustration-<mood>.{svg,png} for exactly these moods:
   friendly, confused, happy, sad, surprised, sleepy, love, dizzy, pouty, glitched,
   signal-lost, charging, broadcasting, rebooting, low-battery.
4. One last squint pass: any pose that stopped reading correctly after later
   consistency fixes.

Final message: "PASS" or a numbered list of gaps.
```

- [ ] **Step 3: Fix any gaps and re-verify** — apply, regenerate, commit fixes as `fix:` commits, re-dispatch if the gaps were substantive.

- [ ] **Step 4: Hand to the user** — present the Expressions gallery (point them at README.md and dist/) for final human sign-off. Remind them the portfolio repo's `CuteRobot` component is the eventual consumer for animated versions — a separate project, out of scope here.
