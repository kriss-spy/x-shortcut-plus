import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
execFileSync(process.execPath, ['scripts/build.mjs', '--release'], { stdio: 'inherit' });
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
if ((manifest.version_name ?? manifest.version) !== pkg.version) throw new Error('Package and extension versions differ.');
const files = (await readdir('dist')).sort();
const required = ['manifest.json', manifest.options_ui.page, manifest.background.service_worker, ...manifest.content_scripts.flatMap(entry => entry.js)];
for (const file of required) if (!files.includes(file)) throw new Error(`Missing extension file: ${file}`);
if (files.some(file => file.endsWith('.map'))) throw new Error('Release must not contain source maps.');
for (const file of files.filter(file => file.endsWith('.js'))) execFileSync(process.execPath, ['--check', resolve('dist', file)]);
await mkdir('release', { recursive: true });
const name = `x-shortcut-plus-${pkg.version}.zip`;
const archive = resolve('release', name);
// -FS removes old entries if packaging the same version again.
execFileSync('zip', ['-X', '-q', '-FS', archive, ...files], { cwd: 'dist', stdio: 'inherit' });
execFileSync('unzip', ['-tq', archive], { stdio: 'inherit' });
const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile(`${archive}.sha256`, `${digest}  ${name}\n`);
console.log(`Packaged ${archive}\nSHA-256 ${digest}`);
