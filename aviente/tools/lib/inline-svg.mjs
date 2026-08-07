/**
 * Shared by the blueprint and icon generators.
 *
 * Both sets have to end up INLINE in the page rather than referenced as images:
 * they are stroked with `currentColor`, and an SVG loaded as an <img> or a
 * background-image is rendered in isolation, where currentColor resolves to black
 * instead of the host's ink. The header's utensil field lost a day to exactly that,
 * so the rule is written down in one place now.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read a directory of SVGs and return `{ key: { viewBox, inner } }`.
 *
 * Only the inner markup is kept. The wrapper <svg> is re-emitted by the component so
 * size and stroke weight stay the component's business — the icons want a lighter
 * stroke at 20px than the plates want at 92px, and that cannot be decided inside the
 * file.
 */
export function readSvgDir(dir, keys) {
  const found = new Map(
    readdirSync(dir).filter((f) => f.endsWith('.svg'))
      .map((f) => [f.replace(/\.svg$/, ''), f]),
  );

  const missing = keys.filter((k) => !found.has(k));
  if (missing.length) throw new Error(`missing an SVG for: ${missing.join(', ')}`);

  const extra = [...found.keys()].filter((k) => !keys.includes(k));
  if (extra.length) console.warn(`ignored (not in the key list): ${extra.join(', ')}`);

  return keys.map((key) => {
    const raw = readFileSync(join(dir, found.get(key)), 'utf8');
    return {
      key,
      viewBox: raw.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 64 64',
      inner: raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
        .trim().replace(/\n+/g, ''),
    };
  });
}
