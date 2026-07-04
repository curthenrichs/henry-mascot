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
 * outline is palette-invariant.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const ROOT = path.join(__dirname, "..");
const ART = path.join(ROOT, "artwork");
const DIST = path.join(ROOT, "dist");

const CANON = { ground: "#112244", accent: "#1890ff", accentSoft: "#40a9ff" };

const VARIANTS = [
  // curthenrichs.github.io — navy ground, Ant Design primary blue accent
  { name: "portfolio-blue", ground: "#112244", accent: "#1890ff", accentSoft: "#40a9ff" },
  // half-built-robots.com — terminal near-black ground, theme amber accent
  { name: "half-built-robots-amber", ground: "#111111", accent: "#ffaa3c", accentSoft: "#ffc46e" },
];

const MASTERS = {
  master: "henry-master.svg",
  px32: "henry-32.svg",
  px16: "henry-16.svg",
  illoFriendly: "henry-illustration-friendly.svg",
  illoConfused: "henry-illustration-confused.svg",
};

// Small sizes come from the pixel-fitted drawings, large from the master.
const PNG_OUTPUTS = [
  { file: "favicon-16x16.png", source: "px16", width: 16 },
  { file: "favicon-32x32.png", source: "px32", width: 32 },
  { file: "apple-touch-icon.png", source: "master", width: 180 },
  { file: "android-chrome-192x192.png", source: "master", width: 192 },
  { file: "android-chrome-512x512.png", source: "master", width: 512 },
  // Illustration exports keep their masters' aspect ratio (4x native size),
  // rendered on a transparent ground for use on light surfaces.
  { file: "henry-illustration-friendly.png", source: "illoFriendly", width: 640 },
  { file: "henry-illustration-confused.png", source: "illoConfused", width: 800 },
];

const ICO_LAYERS = [
  { source: "px16", width: 16 },
  { source: "px32", width: 32 },
  { source: "px32", width: 48 },
];

function recolor(svgText, variant) {
  return svgText
    .split(CANON.ground).join(variant.ground)
    .split(CANON.accent).join(variant.accent)
    .split(CANON.accentSoft).join(variant.accentSoft);
}

function loadVariantSvgs(variant) {
  const svgs = {};
  for (const [key, file] of Object.entries(MASTERS)) {
    const text = fs.readFileSync(path.join(ART, file), "utf8");
    const match = text.match(/viewBox="0 0 (\d+) (\d+)"/);
    if (!match) throw new Error(`${file}: could not parse viewBox`);
    svgs[key] = {
      file,
      text: recolor(text, variant),
      vbWidth: Number(match[1]),
      vbHeight: Number(match[2]),
    };
  }
  return svgs;
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

  for (const svg of Object.values(svgs)) {
    fs.writeFileSync(path.join(dir, svg.file), svg.text);
  }
  for (const { file, source, width } of PNG_OUTPUTS) {
    fs.writeFileSync(path.join(dir, file), await renderPng(svgs[source], width));
  }
  const layers = await Promise.all(
    ICO_LAYERS.map(({ source, width }) => renderPng(svgs[source], width))
  );
  fs.writeFileSync(path.join(dir, "favicon.ico"), await pngToIco(layers));

  // ---- verification: wrong output is a hard failure ----
  for (const { file, source, width } of PNG_OUTPUTS) {
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
    `${variant.name}: ${PNG_OUTPUTS.length} PNGs + favicon.ico (${ICO_LAYERS.map((l) => l.width).join("/")}) + ${Object.keys(svgs).length} SVGs`
  );
}

async function main() {
  for (const variant of VARIANTS) {
    await buildVariant(variant);
  }
  console.log("All variants generated and verified.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
