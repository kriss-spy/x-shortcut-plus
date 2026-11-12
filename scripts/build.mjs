import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await build({ entryPoints: ['src/content.js', 'src/options.js', 'src/background.js', 'src/identity-main.js'], outdir: 'dist', bundle: true, format: 'iife', target: 'chrome111', sourcemap: !process.argv.includes('--release') });
for (const file of ['manifest.json', 'options.html', 'options.css']) {
  await copyFile(`extension/${file}`, `dist/${file}`);
}
console.log('Built unpacked extension in dist/');
