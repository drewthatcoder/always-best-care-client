/**
 * Rasterize the official Always Best Care logo from assets/brand/abc-logo.svg.
 *
 * The vector is used as-is: same paths, same fills, no recoloring or redrawing.
 * Crops are taken from that artwork.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Outputs:
 *   assets/icon.png            1024 iOS icon — heart-in-A mark, white, padded
 *   assets/adaptive-icon.png   1024 Android adaptive foreground — mark inside
 *                              the 66/108 safe circle, transparent padding
 *   assets/favicon.png         48 web icon — same mark treatment as the iOS icon
 *   assets/splash-icon.png     full lockup, centered, white (iOS splash)
 *   assets/splash-mark.png     heart-in-A only, transparent (Android 12 splash)
 *   assets/logo-full.png       full lockup, transparent, for in-app headers
 *
 * Android 12 masks the splash icon with a circle. expo-splash-screen draws
 * `android.imageWidth` (dp) centered on a 288dp canvas, and the visible circle
 * is the inner 192dp. splash-mark.png is the tight mark; imageWidth 120 keeps
 * that rectangle inside the circle with padding. iOS keeps the full lockup.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'assets/brand/abc-logo.svg');
const assetsDir = path.join(root, 'assets');

const ICON_SIZE = 1024;
const FAVICON_SIZE = 48;
/** iOS rounded-rect mask. Mark's longer side occupies this fraction of the canvas. */
const IOS_MARK_LONG_SIDE = 0.62;
/**
 * Android adaptive safe zone is a circle whose diameter is 66/108 of the
 * foreground. The mark's bounding-box corners stay inside 90% of that circle
 * so launcher masks do not clip it.
 */
const ANDROID_SAFE_DIAMETER = 66 / 108;
const ANDROID_SAFE_FILL = 0.9;
/** Splash logo width in pixels, before the white margin. */
const SPLASH_LOGO_WIDTH = 1600;
/** White margin around the splash lockup, as a fraction of the logo width. */
const SPLASH_MARGIN = 0.1;
/** In-app lockup width. Screens scale this down with contain. */
const IN_APP_LOGO_WIDTH = 1200;
/** Probe render used only to measure ink bounds. */
const PROBE_WIDTH = 2400;

const sourceSvg = readFileSync(svgPath, 'utf8');

function parseViewBox(svg) {
  const m = svg.match(/viewBox="([^"]+)"/);
  if (!m) throw new Error('SVG is missing a viewBox');
  const [x, y, w, h] = m[1].trim().split(/[\s,]+/).map(Number);
  return { x, y, w, h };
}

function parseRgb(fill) {
  const m = fill.match(/rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
  if (!m) return null;
  return [1, 2, 3].map((i) => Number(m[i]) / 100);
}

function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function pathBBox(d) {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!nums || nums.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, area: (maxX - minX) * (maxY - minY) };
}

function extractPaths(svg) {
  const tags = svg.match(/<path\b[^>]*\/>/g) || [];
  return tags.map((tag) => {
    const fill = tag.match(/\bfill="([^"]+)"/)?.[1] || '';
    const d = tag.match(/\bd="([^"]+)"/)?.[1] || '';
    return { tag, fill, color: parseRgb(fill), bbox: pathBBox(d) };
  });
}

/** Largest path drawn in the lighter brand blue: the heart-in-A mark. */
function findMarkPath(paths) {
  const colored = paths.filter((p) => p.color && p.bbox);
  if (!colored.length) throw new Error('No filled paths in the logo SVG');
  const lightest = Math.max(...colored.map((p) => luminance(p.color)));
  const light = colored.filter((p) => Math.abs(luminance(p.color) - lightest) < 0.02);
  light.sort((a, b) => b.bbox.area - a.bbox.area);
  return light[0];
}

function renderSvg(svg, widthPx) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: widthPx },
    background: 'rgba(0, 0, 0, 0)',
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 0,
  });
  const png = PNG.sync.read(Buffer.from(resvg.render().asPng()));
  if (png.width !== widthPx) {
    throw new Error(`Expected render width ${widthPx}, got ${png.width}`);
  }
  return png;
}

function withViewBox(svg, box) {
  if (!/viewBox="[^"]*"/.test(svg)) throw new Error('SVG is missing a viewBox');
  return svg
    .replace(/viewBox="[^"]*"/, `viewBox="${box.x} ${box.y} ${box.w} ${box.h}"`)
    .replace(/\bwidth="[^"]*"/, `width="${box.w}"`)
    .replace(/\bheight="[^"]*"/, `height="${box.h}"`);
}

function inkBounds(png, alphaMin = 8) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const a = png.data[(y * png.width + x) * 4 + 3];
      if (a < alphaMin) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('Rendered logo has no visible pixels');
  return { minX, minY, maxX, maxY };
}

function svgBoxFromPixels(pixelBox, viewBox, pngWidth, padPx) {
  const scale = pngWidth / viewBox.w;
  const x = viewBox.x + (pixelBox.minX - padPx) / scale;
  const y = viewBox.y + (pixelBox.minY - padPx) / scale;
  const w = (pixelBox.maxX - pixelBox.minX + 1 + padPx * 2) / scale;
  const h = (pixelBox.maxY - pixelBox.minY + 1 + padPx * 2) / scale;
  return { x, y, w, h };
}

function blank(width, height, color) {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = color[0];
    png.data[i + 1] = color[1];
    png.data[i + 2] = color[2];
    png.data[i + 3] = color[3];
  }
  return png;
}

function blit(dest, src, dx, dy) {
  for (let y = 0; y < src.height; y += 1) {
    const ty = dy + y;
    if (ty < 0 || ty >= dest.height) continue;
    for (let x = 0; x < src.width; x += 1) {
      const tx = dx + x;
      if (tx < 0 || tx >= dest.width) continue;
      const si = (y * src.width + x) * 4;
      const di = (ty * dest.width + tx) * 4;
      const sa = src.data[si + 3] / 255;
      const da = dest.data[di + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      for (let c = 0; c < 3; c += 1) {
        dest.data[di + c] = Math.round(
          (src.data[si + c] * sa + dest.data[di + c] * da * (1 - sa)) / outA,
        );
      }
      dest.data[di + 3] = Math.round(outA * 255);
    }
  }
}

function placeCentered(mark, size, background) {
  const canvas = blank(size, size, background);
  const dx = Math.round((size - mark.width) / 2);
  const dy = Math.round((size - mark.height) / 2);
  blit(canvas, mark, dx, dy);
  return canvas;
}

function markTargetSize(box, longSidePx) {
  const long = Math.max(box.w, box.h);
  const scale = longSidePx / long;
  return {
    width: Math.max(1, Math.round(box.w * scale)),
    height: Math.max(1, Math.round(box.h * scale)),
  };
}

function androidMarkSize(box, canvasSize) {
  const safeRadius = (canvasSize * ANDROID_SAFE_DIAMETER) / 2;
  const maxHalfDiag = safeRadius * ANDROID_SAFE_FILL;
  const halfDiagUnits = 0.5 * Math.hypot(box.w, box.h);
  const scale = maxHalfDiag / halfDiagUnits;
  return {
    width: Math.max(1, Math.round(box.w * scale)),
    height: Math.max(1, Math.round(box.h * scale)),
  };
}

function renderBox(svg, box, widthPx) {
  const png = renderSvg(withViewBox(svg, box), widthPx);
  const expectedH = Math.round(widthPx * (box.h / box.w));
  if (Math.abs(png.height - expectedH) > 1) {
    throw new Error(
      `Render aspect drifted (got ${png.width}x${png.height}, expected height ${expectedH}). The artwork would be stretched.`,
    );
  }
  return png;
}

function assertAdaptiveSafe(png) {
  const radius = (png.width * ANDROID_SAFE_DIAMETER) / 2;
  const cx = (png.width - 1) / 2;
  const cy = (png.height - 1) / 2;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const a = png.data[(y * png.width + x) * 4 + 3];
      if (a < 20) continue;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > radius + 1) {
        throw new Error(
          `Adaptive mark leaves the safe zone at ${x},${y} (alpha ${a}, dist ${dist.toFixed(1)}, radius ${radius.toFixed(1)})`,
        );
      }
    }
  }
}

function assertOpaque(png, label) {
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] !== 255) {
      throw new Error(`${label} has a transparent pixel`);
    }
  }
}

function writePng(file, png, { opaque = false } = {}) {
  if (opaque) {
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
  }
  writeFileSync(file, PNG.sync.write(png, { colorType: opaque ? 2 : 6 }));
}

function main() {
  const viewBox = parseViewBox(sourceSvg);
  const paths = extractPaths(sourceSvg);
  const mark = findMarkPath(paths);
  const markOnly = sourceSvg.replace(/<path\b[^>]*\/>/g, mark.tag);

  const probe = renderSvg(sourceSvg, PROBE_WIDTH);
  const markProbe = renderSvg(markOnly, PROBE_WIDTH);
  const fullBox = svgBoxFromPixels(inkBounds(probe), viewBox, probe.width, 2);
  const markBox = svgBoxFromPixels(inkBounds(markProbe), viewBox, markProbe.width, 2);

  const iosMarkPx = markTargetSize(markBox, Math.round(ICON_SIZE * IOS_MARK_LONG_SIDE));
  const iconMark = renderBox(markOnly, markBox, iosMarkPx.width);
  const icon = placeCentered(iconMark, ICON_SIZE, [255, 255, 255, 255]);
  assertOpaque(icon, 'iOS icon');

  const androidPx = androidMarkSize(markBox, ICON_SIZE);
  const adaptiveMark = renderBox(markOnly, markBox, androidPx.width);
  const adaptive = placeCentered(adaptiveMark, ICON_SIZE, [0, 0, 0, 0]);
  assertAdaptiveSafe(adaptive);

  const faviconPx = markTargetSize(markBox, Math.round(FAVICON_SIZE * IOS_MARK_LONG_SIDE));
  const faviconMark = renderBox(markOnly, markBox, faviconPx.width);
  const favicon = placeCentered(faviconMark, FAVICON_SIZE, [255, 255, 255, 255]);
  assertOpaque(favicon, 'favicon');

  // Tight mark for the Android 12 splash. Padding is applied by imageWidth
  // on the plugin's 288dp canvas, not by extra pixels in this file.
  const splashMark = renderBox(markOnly, markBox, 512);

  const logo = renderBox(sourceSvg, fullBox, IN_APP_LOGO_WIDTH);
  const splashLogo = renderBox(sourceSvg, fullBox, SPLASH_LOGO_WIDTH);
  const margin = Math.round(SPLASH_LOGO_WIDTH * SPLASH_MARGIN);
  const splash = blank(
    splashLogo.width + margin * 2,
    splashLogo.height + margin * 2,
    [255, 255, 255, 255],
  );
  blit(splash, splashLogo, margin, margin);
  assertOpaque(splash, 'splash');

  writePng(path.join(assetsDir, 'icon.png'), icon, { opaque: true });
  writePng(path.join(assetsDir, 'adaptive-icon.png'), adaptive);
  writePng(path.join(assetsDir, 'favicon.png'), favicon, { opaque: true });
  writePng(path.join(assetsDir, 'splash-icon.png'), splash, { opaque: true });
  writePng(path.join(assetsDir, 'splash-mark.png'), splashMark);
  writePng(path.join(assetsDir, 'logo-full.png'), logo);

  const aspect = (logo.width / logo.height).toFixed(6);
  console.log(JSON.stringify({
    fullViewBox: fullBox,
    markViewBox: markBox,
    icon: { size: ICON_SIZE, mark: `${iconMark.width}x${iconMark.height}` },
    adaptive: { size: ICON_SIZE, mark: `${adaptiveMark.width}x${adaptiveMark.height}` },
    favicon: { size: FAVICON_SIZE, mark: `${faviconMark.width}x${faviconMark.height}` },
    splash: { width: splash.width, height: splash.height },
    splashMark: { width: splashMark.width, height: splashMark.height },
    logoFull: { width: logo.width, height: logo.height, aspect },
  }, null, 2));
}

main();
