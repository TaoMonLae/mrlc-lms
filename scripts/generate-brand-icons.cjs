const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'mrlcged logo.png');
const output = (relativePath) => path.join(root, relativePath);

async function icon(size, { opaque = false, inset = 0 } = {}) {
  const markSize = size - inset * 2;
  const mark = await sharp(source).resize(markSize, markSize).png().toBuffer();
  if (!opaque && inset === 0) return mark;
  return sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
    .composite([{ input: mark, gravity: 'centre' }])
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function write(relativePath, data) {
  const target = output(relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

function ico(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = header.length;
  entries.forEach(({ size, data }, index) => {
    const position = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, position);
    header.writeUInt8(size === 256 ? 0 : size, position + 1);
    header.writeUInt16LE(1, position + 4);
    header.writeUInt16LE(32, position + 6);
    header.writeUInt32LE(data.length, position + 8);
    header.writeUInt32LE(offset, position + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...entries.map(({ data }) => data)]);
}

function icns(entries) {
  const chunks = entries.map(({ type, data }) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 'ascii');
    header.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([header, data]);
  });
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
  return Buffer.concat([header, ...chunks]);
}

async function main() {
  await write('ios/MRLCFocus/Assets.xcassets/AppIcon.appiconset/AppIcon.png', await icon(1024, { opaque: true }));
  await write('kiosk/assets/icon.png', await icon(1024));

  for (const size of [16, 32]) await write(`public/favicon-${size}.png`, await icon(size));
  await write('public/apple-touch-icon.png', await icon(180, { opaque: true }));
  await write('public/icon-192.png', await icon(192, { opaque: true }));
  await write('public/icon-512.png', await icon(512, { opaque: true }));
  await write('public/icon-maskable-512.png', await icon(512, { opaque: true, inset: 64 }));

  const faviconSizes = [16, 32, 48, 256];
  await write('public/favicon.ico', ico(await Promise.all(faviconSizes.map(async (size) => ({ size, data: await icon(size) })))));
  const desktopSizes = [16, 24, 32, 48, 64, 128, 256];
  await write('kiosk/assets/icon.ico', ico(await Promise.all(desktopSizes.map(async (size) => ({ size, data: await icon(size) })))));

  const macSizes = [
    ['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128],
    ['ic08', 256], ['ic09', 512], ['ic10', 1024],
  ];
  await write('kiosk/assets/icon.icns', icns(await Promise.all(macSizes.map(async ([type, size]) => ({ type, data: await icon(size) })))));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
