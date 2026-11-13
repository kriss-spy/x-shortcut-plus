import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, copyFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const images = {
  'icon-128.png': [128, 128], 'icon-512.png': [512, 512],
  'screenshot-01-shortcuts.png': [1280, 800], 'screenshot-02-pinned-lists.png': [1280, 800],
  'promo-small-440x280.png': [440, 280], 'promo-marquee-1400x560.png': [1400, 560],
};
for (const [file, [width, height]] of Object.entries(images)) {
  const data = await readFile(`store-assets/${file}`);
  if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== width || data.readUInt32BE(20) !== height) throw new Error(`Invalid PNG size: ${file}`);
}
for (const size of [16, 32, 48, 128]) {
  const data = await readFile(`extension/icons/icon-${size}.png`);
  if (data.readUInt32BE(16) !== size || data.readUInt32BE(20) !== size || data[25] !== 6) throw new Error(`Invalid RGBA extension icon: ${size}`);
}
const directory = resolve('release', `store-assets-${pkg.version}`);
await rm(directory, { recursive: true, force: true });
await mkdir(directory, { recursive: true });
const files = {
  ...Object.fromEntries(Object.keys(images).map(file => [file, `store-assets/${file}`])),
  'icon.svg': 'store-assets/icon.svg',
  'README-FIRST.md': 'docs/store/README.md',
  'listing.md': 'docs/store/listing.md',
  'privacy-fields.md': 'docs/store/privacy-fields.md',
  'PRIVACY.md': 'PRIVACY.md',
};
for (const [destination, original] of Object.entries(files)) await copyFile(original, join(directory, destination));
const name = `x-shortcut-plus-store-assets-${pkg.version}.zip`;
const archive = resolve('release', name);
execFileSync('zip', ['-X', '-q', '-FS', archive, ...Object.keys(files).sort()], { cwd: directory, stdio: 'inherit' });
execFileSync('unzip', ['-tq', archive], { stdio: 'inherit' });
const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile(`${archive}.sha256`, `${digest}  ${name}\n`);
console.log(`Validated image dimensions and RGBA icons.\nPackaged ${archive}\nSHA-256 ${digest}`);
