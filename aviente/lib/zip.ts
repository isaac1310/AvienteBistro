/**
 * A minimal zip writer — STORE only, no compression.
 *
 * Written by hand rather than adding a dependency, and the reason is the payload: the
 * only thing this zips is WebP photographs and one small JSON manifest. WebP is
 * already compressed, so deflating it buys a percent or two for a library, a build
 * step and a supply-chain surface. STORE is a header, the bytes, and a table.
 *
 * Everything is little-endian and the layout is the one in the spec: a local header
 * before each file, then a central directory describing them all, then the end
 * record pointing at the directory. No zip64, no data descriptors, no encryption —
 * a 4.5MB response cap means this will never approach the 4GB fields.
 *
 * Names are stored as UTF-8 with the language-encoding flag set, so a Hebrew filename
 * would survive. Nothing currently uses one — the objects are uuids — but the flag
 * costs a bit and its absence is the classic mojibake bug.
 */

/* Standard CRC-32 (the one zip uses), table built once. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; bytes: Uint8Array };

/**
 * Every entry is stamped with the same DOS timestamp, and that is deliberate: a zip
 * built twice from unchanged photographs should be byte-identical, so "did anything
 * change since my last backup" is answerable by comparing files. Real mtimes would
 * make every download differ.
 *
 * 1980-01-01 00:00, the earliest the DOS format can express.
 */
const DOS_TIME = 0;
const DOS_DATE = 33; // (1980-1980)<<9 | 1<<5 | 1

export function makeZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const crc = crc32(entry.bytes);
    const size = entry.bytes.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // local file header
    lv.setUint16(4, 20, true);           // version needed: 2.0
    lv.setUint16(6, 0x0800, true);       // UTF-8 names
    lv.setUint16(8, 0, true);            // method 0 = stored
    lv.setUint16(10, DOS_TIME, true);
    lv.setUint16(12, DOS_DATE, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);        // compressed == uncompressed
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);           // no extra field
    local.set(name, 30);

    const dir = new Uint8Array(46 + name.length);
    const dv = new DataView(dir.buffer);
    dv.setUint32(0, 0x02014b50, true);   // central directory header
    dv.setUint16(4, 20, true);           // version made by
    dv.setUint16(6, 20, true);           // version needed
    dv.setUint16(8, 0x0800, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, DOS_TIME, true);
    dv.setUint16(14, DOS_DATE, true);
    dv.setUint32(16, crc, true);
    dv.setUint32(20, size, true);
    dv.setUint32(24, size, true);
    dv.setUint16(28, name.length, true);
    dv.setUint32(42, offset, true);      // where the local header sits
    dir.set(name, 46);

    locals.push(local, entry.bytes);
    central.push(dir);
    offset += local.length + size;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);     // end of central directory
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);        // directory starts after the last file

  const parts = [...locals, ...central, end];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
