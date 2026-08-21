/* The brand rasters, from the SVGs that define them.
 *
 *   node tools/build-brand-png.mjs
 *
 * These four PNGs were produced by hand with rsvg-convert in one session and then sat
 * in public/brand/ as artefacts with no recorded provenance — so `icon-maskable.svg`
 * looked like a file nothing used, when in fact it is the SOURCE of the 512 maskable
 * PNG. A generated file whose generator is a shell command someone once typed is a
 * file that goes stale the first time the design changes.
 *
 * PNG is not optional here: iOS ignores SVG for the home screen entirely, and Android
 * splash screens are unreliable with SVG-only manifests.
 *
 * `favicon.ico` is written too, and it is a PNG INSIDE an ICO container — legal since
 * Vista and what every modern toolchain emits. Browsers still request /favicon.ico by
 * habit even when a <link rel=icon> points elsewhere, and Next answers those from
 * app/favicon.ico.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const brand = (f) => fileURLToPath(new URL(`../public/brand/${f}`, import.meta.url));
const app = (f) => fileURLToPath(new URL(`../app/${f}`, import.meta.url));

/* rsvg-convert rather than sharp: it renders SVG properly, including the stroke and
   opacity work these icons are made of, and it is already on this machine. */
try {
  execFileSync('rsvg-convert', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('✗ rsvg-convert not found. brew install librsvg');
  process.exit(1);
}

const png = (src, out, size) => {
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', out, src]);
  console.log(`  ${out.split('/').pop().padEnd(28)} ${size}x${size}`);
};

console.log('brand rasters:');
png(brand('icon.svg'), brand('icon-192.png'), 192);
png(brand('icon.svg'), brand('icon-512.png'), 512);
png(brand('icon-maskable.svg'), brand('icon-maskable-512.png'), 512);
/* 180 is what iOS asks for; it downscales cleanly and nothing asks for larger. */
png(brand('icon.svg'), brand('apple-touch-icon.png'), 180);

/* ── favicon.ico ──────────────────────────────────────────────────────────────
   A one-image ICO wrapping a 32x32 PNG. The header is six 16-bit/8-bit fields and one
   directory entry; the payload is the PNG verbatim. Width and height are written as 0
   for 256, which does not arise here but is the one gotcha in the format. */
const tmp = brand('.favicon-32.png');
png(brand('icon-small.svg'), tmp, 32);

/* Re-encoded with an alpha channel, and that is not fussiness: rsvg-convert drops
   alpha when the artwork is fully opaque, which this icon is (cream to the edge), and
   Next's ICO decoder refuses a non-RGBA payload outright — "The PNG is not in RGBA
   format!" and the whole build fails. Found by building, not by reading a spec. */
const image = await sharp(readFileSync(tmp)).ensureAlpha().png().toBuffer();

const ico = Buffer.alloc(22 + image.length);
ico.writeUInt16LE(0, 0);            // reserved
ico.writeUInt16LE(1, 2);            // type 1 = icon
ico.writeUInt16LE(1, 4);            // one image
ico.writeUInt8(32, 6);              // width
ico.writeUInt8(32, 7);              // height
ico.writeUInt8(0, 8);               // palette colours (0 = truecolour)
ico.writeUInt8(0, 9);               // reserved
ico.writeUInt16LE(1, 10);           // colour planes
ico.writeUInt16LE(32, 12);          // bits per pixel
ico.writeUInt32LE(image.length, 14);
ico.writeUInt32LE(22, 18);          // the payload starts right after this header
Buffer.from(image).copy(ico, 22);

writeFileSync(app('favicon.ico'), ico);
console.log(`  favicon.ico                  32x32 (${ico.length} bytes, PNG in ICO)`);
if (existsSync(tmp)) execFileSync('rm', [tmp]);
