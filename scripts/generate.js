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
  "happy",
  "sad",
  "surprised",
  "sleepy",
  "love",
  "dizzy",
  "pouty",
  "glitched",
  "signal-lost",
  "charging",
  "broadcasting",
  "rebooting",
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
