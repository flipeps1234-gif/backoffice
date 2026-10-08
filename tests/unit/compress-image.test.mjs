import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The real module, transpiled in place (same loader shape as setup.test.mjs).
// The canvas half needs a browser; the globals below stand in for exactly
// the calls compressImage makes, so its POLICY (which files skip, which
// re-encode wins, what the fallback does) runs here. The byte-level strip
// is pure and runs as is.
const load = (globals = {}) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL('../../src/lib/compress-image.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: () => { throw new Error('compress-image.ts must stay dependency-free'); }, File, Blob, ...globals },
  );
  return exports;
};

const bytes = (...parts) => Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))));
/** One JPEG header segment: FF <marker> <u16 length incl. itself> <payload>. */
const segment = (marker, payload) => {
  const body = Buffer.from(payload, 'latin1');
  return bytes([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff], body);
};
const SCAN = bytes(segment(0xda, '\x01\x01\x00\x00\x3f\x00'), [0x12, 0x34, 0xff, 0x00, 0x56], [0xff, 0xd9]);
const jpeg = () => bytes(
  [0xff, 0xd8],
  segment(0xe0, 'JFIF\x00\x01\x02'),
  segment(0xe1, 'Exif\x00\x00GPSLatitude 29.7604 N; Make Apple'),
  [0xff], // a fill byte before the next marker is legal
  segment(0xe1, 'http://ns.adobe.com/xap/1.0/\x00<x:xmpmeta>GPS</x:xmpmeta>'),
  segment(0xe2, 'ICC_PROFILE\x00\x01\x01colour'),
  segment(0xed, 'Photoshop 3.0\x008BIM IPTC city'),
  segment(0xfe, 'secret comment'),
  segment(0xee, 'Adobe\x00\x64'),
  segment(0xdb, '\x00quant-table'),
  SCAN,
);

const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
const chunk = (fourcc, payload) => {
  const body = Buffer.from(payload, 'latin1');
  return bytes(fourcc, u32(body.length), body, body.length % 2 ? [0] : []);
};
const webp = () => {
  const body = bytes(
    'WEBP',
    // VP8X: flags byte = alpha (0x10) | EXIF (0x08) | XMP (0x04), then 9 bytes.
    chunk('VP8X', '\x1c' + '\x00'.repeat(9)),
    chunk('VP8L', 'pixels'),
    chunk('ALPH', 'odd'), // odd length: padded
    chunk('EXIF', 'MM\x00*GPSLatitude 29.7604'),
    chunk('XMP ', '<x:xmpmeta>GPS</x:xmpmeta>'),
  );
  return bytes('RIFF', u32(body.length), body);
};

const latin = (u8) => Buffer.from(u8).toString('latin1');

test('stripMetadata (JPEG): EXIF, XMP, IPTC and comments go; JFIF, ICC, Adobe, tables and the scan stay', () => {
  const { stripMetadata } = load();
  const out = latin(stripMetadata(new Uint8Array(jpeg()), 'image/jpeg'));
  for (const gone of ['Exif', 'GPS', 'Apple', 'xmpmeta', 'Photoshop', 'IPTC', 'secret']) {
    assert.ok(!out.includes(gone), `${gone} survived`);
  }
  for (const kept of ['JFIF', 'ICC_PROFILE', 'Adobe', 'quant-table']) {
    assert.ok(out.includes(kept), `${kept} was dropped`);
  }
  assert.ok(out.startsWith('\xff\xd8\xff\xe0'));
  assert.ok(out.endsWith(latin(SCAN)), 'the image data changed');
});

test('stripMetadata (WebP): EXIF and XMP chunks go, their VP8X flags clear, the RIFF size is rewritten', () => {
  const { stripMetadata } = load();
  const out = Buffer.from(stripMetadata(new Uint8Array(webp()), 'image/webp'));
  const text = out.toString('latin1');
  assert.ok(!text.includes('EXIF') && !text.includes('XMP ') && !text.includes('GPS'));
  assert.ok(text.includes('VP8L\x06\x00\x00\x00pixels'));
  assert.ok(text.includes('ALPH\x03\x00\x00\x00odd\x00'), 'the odd chunk lost its padding');
  assert.equal(out.readUInt32LE(4), out.length - 8);
  assert.equal(out[12 + 8], 0x10, 'only the alpha flag should remain');
});

test('stripMetadata: anything it cannot parse is null, never a mangled file', () => {
  const { stripMetadata } = load();
  const truncated = jpeg().subarray(0, 30);
  for (const [input, type] of [
    [Buffer.from('not an image'), 'image/jpeg'],
    [truncated, 'image/jpeg'],
    [bytes([0xff, 0xd8, 0xff, 0xd9]), 'image/jpeg'],
    [Buffer.from('RIFF\x04\x00\x00\x00WAVE', 'latin1'), 'image/webp'],
    [webp().subarray(0, 40), 'image/webp'],
    [jpeg(), 'image/png'],
  ]) {
    assert.equal(stripMetadata(new Uint8Array(input), type), null);
  }
});

/** A canvas whose JPEG export is `exportBytes` long, and a decoder that works or throws. */
const browser = ({ decodes = true, exportBytes = 10 } = {}) => ({
  createImageBitmap: async () => {
    if (!decodes) throw new Error('cannot decode');
    return { width: 120, height: 80, close() {} };
  },
  document: {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, drawImage() {} }),
      toBlob: (done, type) => done(new Blob([new Uint8Array(exportBytes)], { type })),
    }),
  },
});

test('compressImage: a small JPEG is re-encoded even when the re-encode is bigger; a small PNG is left alone', async () => {
  const { compressImage } = load(browser({ exportBytes: 50_000 }));
  const photo = new File([jpeg()], 'IMG_0001.JPG', { type: 'image/jpeg' });
  const out = await compressImage(photo);
  assert.equal(out.type, 'image/jpeg');
  assert.equal(out.name, 'IMG_0001.jpg');
  assert.equal(out.size, 50_000, 'the original (with its EXIF) went out instead of the re-encode');

  const small = new File([new Uint8Array(2_000)], 'shot.webp', { type: 'image/webp' });
  assert.equal((await compressImage(small)).size, 50_000);

  const screenshot = new File([new Uint8Array(2_000)], 'Screenshot.png', { type: 'image/png' });
  assert.equal(await compressImage(screenshot), screenshot);
});

test('compressImage: when the browser cannot decode a JPEG, its metadata is still stripped before upload', async () => {
  const { compressImage } = load(browser({ decodes: false }));
  const out = await compressImage(new File([jpeg()], 'IMG_0002.jpg', { type: 'image/jpeg' }));
  const text = Buffer.from(await out.arrayBuffer()).toString('latin1');
  assert.ok(!text.includes('GPS') && !text.includes('Exif'));
  assert.ok(text.includes('JFIF'));
  // A format with no parser passes through untouched (the server may still read it).
  const heic = new File([new Uint8Array(500)], 'IMG_0003.HEIC', { type: 'image/heic' });
  assert.equal(await compressImage(heic), heic);
});
