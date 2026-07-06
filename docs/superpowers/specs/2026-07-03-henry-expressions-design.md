# Henry expression system v2 — design brainstorm

**Date:** 2026-07-03
**Status:** Approved brainstorm. No build scheduled; this doc ranks and specifies
candidate expressions so future rounds can pick from it.

## Goal

Grow Henry's expressive range beyond *friendly* and *confused*, as a brand asset
library. No immediate UI consumer drives this; each expression is designed so it
could later become an animated mood in the portfolio's `CuteRobot` React
component (like the existing blink cycle and question-mark boing).

## Aesthetic direction

Manga / kawaii / chibi visual shorthand: emotion carried by floating symbols
(emanata), simplified eye shapes, and exaggerated single-symbol moments — the
giant sweat drop beside the head is the archetype of the register we want.

Character inspiration (not a rulebook): the Chao from Sonic Adventure 2's Chao
Garden — a round, minimal creature whose emotions read through the ball floating
over its head and through gentle idle motion. Henry borrows the spirit: his
antenna doubles as an emotional appendage, and mundane robot activities
(charging) can express contentment the way a Chao eating a fruit does.

## The expression grammar

Every mood is a combination of three channels. This grammar is descriptive of
the existing poses too — *friendly* is (dots, perky ball, none) and *confused*
is (dots, perky ball, double question mark) — so nothing ships today is
retconned.

### Channel 1: Eyes

Allowed shapes: round dots (neutral/default), happy closed arcs `⌒⌒`, squeezed
`> <`, X-eyes, lowered or half-lidded dots. Size and position may shift
(oversized for surprise, drooped for sadness).

**Hard rule: Henry never gains a mouth.** The mouthless face is part of his
identity; eyes, antenna, and emanata carry everything.

### Channel 2: Antenna

The antenna is Henry's only appendage, so it works like a dog's tail or a
Chao's emote ball — the mood barometer. It expresses through:

- **Angle:** perky (default), ramrod-straight alert, drooping/tilted
- **Glow:** brightness, halo size, and blink pattern (steady pulse, rapid
  strobe, slow fade, 1 Hz reboot blink)
- **Tip attachment:** for *emotional* moods the tip is always the glowing
  ball. For *robot* moods the tip may swap to a piece of hardware — a plug,
  a dish, a jagged spark. The antenna stays present in every mood (existing
  design rule 4 unchanged).

**Consistency rule: the antenna must agree with the eyes.** A drooping antenna
with happy arc eyes reads as "broken," not as an expression.

### Channel 3: Emanata (floating symbols)

Manga-style symbols floating above or beside the head — placement is a
composition choice per pose, following the confused pose's precedent (question
marks beside/above at a tilt). Vocabulary: `?` (canon), `!`, sweat drop / tear,
Zzz, sparkles, hearts, dizzy stars, the manga anger vein, `)))` signal arcs,
cycling dots, small status icons (battery sliver).

Construction rules, extending the question-mark precedent:

- Stroke-drawn paths, never text — no font dependency
- Primary symbol in the accent color; companion symbols in the secondary accent
- Animated symbols pop with the established overshoot "boing" feel

## Roster

### Emotional core (tip always the ball)

| Rank | Mood | Eyes | Antenna | Emanata | Implied animation |
|---|---|---|---|---|---|
| 1 | Happy / excited | arcs `⌒⌒` | ball brighter, quick pulse | 2–3 sparkles | sparkles twinkle, pulse quickens |
| 2 | Sad / apologetic | lowered dots | stem droops, ball dim | one large tear-style drop beside head | slow blink, drop slides down |
| 3 | Surprised / alert | oversized dots | ramrod straight, flash | single big `!` | `!` pops with overshoot boing |
| 4 | Sleepy | half-lidded dots | stem tilted, ball faded | two Z's stair-stepping up | Z's float up and fade, long slow blinks |
| 5 | Love / delighted | arcs or dots | normal ball | floating heart(s) | heart boings up like the `?` |
| 6 | Dizzy | X-eyes | stem wobbles | stars orbiting head | stars circle |
| 7 | Pouty / grumpy | squeezed `> <` or flat-lidded dots | stem stiff, ball flickers irritably | manga anger vein (cruciform popped-vein mark) beside head | vein pulses |

### Robot set (tip may morph)

| Rank | Mood | Eyes | Antenna tip | Detail | Implied animation |
|---|---|---|---|---|---|
| 1 | Glitched / does-not-compute | X-eyes or mismatched sizes | jagged spark | stars orbiting the crown (dizzy's motif) | stars flicker and orbit |
| 2 | Signal lost | small worried dots | lit ball, subdued halo | garbled static scribbles up-right (noise, where broadcasting has clean waves) | scribbles jitter |
| 3 | Charging | content arcs | plug, cord trailing off-frame | — | slow contented glow swell |
| 4 | Broadcasting | happy arcs | dish (or ball) radiating | clean `)))` waves | waves ripple outward |
| 5 | Rebooting | closed | ball blinking steady 1 Hz | `· · ·` cycling | dots cycle |
| 6 | Low battery | droopy half-lids | ball dims to hollow outline | tiny battery-sliver icon | glow flickers out |

### Natural merges

If a future round wants a smaller roster, these pairs share most of their
anatomy and can collapse into one pose with two readings:

- Sleepy ↔ low battery
- Dizzy ↔ glitched
- Surprised ↔ broadcasting (shared alert energy)

## Animation philosophy (for the eventual CuteRobot work)

Borrowed from Chao idle behavior: a content creature is never frozen. Every
animated mood should carry a sub-pixel idle bob or sway on top of its signature
motion, the way *friendly* already carries the blink cycle. Symbols enter with
overshoot; nothing snaps.

## Build priority (when a build round happens)

1. **Happy, Sad, Surprised** — with friendly and confused these complete the
   classic mascot mood wheel (neutral, happy, sad, confused, surprised)
2. **Glitched, Signal lost, Charging** — the robot personality, and the first
   tip-morph attachments
3. Everything else as demand appears

## Out of scope

- No SVG masters, generator changes, or dist output in this round
- No new colorways; all expressions use the existing per-site palettes
