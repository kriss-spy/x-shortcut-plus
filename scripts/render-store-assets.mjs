import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'store-assets');
const source = join(assets, 'source');
const executablePath = process.env.XSP_CHROME_PATH || chromium.executablePath();
await mkdir(source, { recursive: true });
await mkdir(join(root, 'extension/icons'), { recursive: true });
const browser = await chromium.launch({ executablePath, headless: false });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const svg = await readFile(join(assets, 'icon.svg'), 'utf8');
  for (const size of [16, 32, 48, 128, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent('<style>html,body{margin:0;background:transparent;overflow:hidden}svg{width:100vw;height:100vh;display:block}</style>' + svg);
    await page.screenshot({ path: size === 512 ? join(assets, 'icon-512.png') : join(root, `extension/icons/icon-${size}.png`), omitBackground: true });
  }
  await copyFile(join(root, 'extension/icons/icon-128.png'), join(assets, 'icon-128.png'));
} finally { await browser.close(); }

execFileSync(process.execPath, ['scripts/build.mjs', '--release'], { cwd: root, stdio: 'inherit' });
const profile = await mkdtemp(join(tmpdir(), 'xsp-store-'));
const extension = join(root, 'dist');
const context = await chromium.launchPersistentContext(profile, {
  executablePath, headless: false, colorScheme: 'dark', viewport: { width: 1100, height: 1600 }, deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
const errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = worker.url().split('/')[2];
  await worker.evaluate(() => chrome.storage.local.set({
    'account:example': { lists: [{ id: '100001', label: 'Design' }, { id: '100002', label: 'Development' }, { id: '100003', label: 'Reading' }] },
    'binding:list:example:100001': 'Ctrl+Alt+3', 'binding:list:example:100002': 'Ctrl+Alt+4', 'binding:list:example:100003': 'Ctrl+Alt+5',
  }));
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.getByText('Settings ready. Defaults are provisional.', { exact: true }).waitFor();
  await page.locator('[data-action="list:example:100003"]').waitFor();
  await page.locator('section').nth(0).screenshot({ path: join(source, 'settings-shortcuts.png') });
  await page.locator('section').nth(1).screenshot({ path: join(source, 'settings-lists.png') });

  const icon = '../icon.svg';
  const css = `*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{font-family:Arial,Helvetica,sans-serif;background:#0c1720;color:#edf5fa}p,h1,h2{margin:0}.canvas{width:100vw;height:100vh;position:relative;background:radial-gradient(ellipse at 92% 0%,#173949 0%,#0c1720 60%)}.brand{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#76bedf}.brand img{width:46px;height:46px}.beta{font-size:11px;letter-spacing:1.5px;color:#72d2f1}.caption{position:absolute;bottom:34px;left:48px;font-size:12px;color:#91a8b7}.copy{position:absolute;left:48px;top:170px;width:300px}h1{font-size:50px;letter-spacing:-2px;line-height:1.09;font-weight:700}.copy p{font-size:18px;line-height:1.6;color:#b6cbd7;margin-top:25px}.copy .note{font-size:14px;line-height:1.6;margin-top:30px;color:#83a5b9}.shot{position:absolute;left:400px;top:65px;width:832px;height:672px;display:flex;align-items:center;justify-content:center}.shot img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 16px 28px #0004)}.topbrand{position:absolute;left:48px;top:36px}`;
  const brand = `<div class="brand"><img src="${icon}" alt=""><span>X SHORTCUT PLUS <span class="beta">/ BETA</span></span></div>`;
  const scenes = [
    {
      name: 'screenshot-01-shortcuts', width: 1280, height: 800,
      html: `<div class="canvas"><div class="topbrand">${brand}</div><div class="copy"><h1>Your feeds.<br>Your shortcuts.</h1><p>Jump to For you or Following.<br>Cycle through pinned lists.</p><p class="note">Choose a key combination.<br>Changes apply to open X tabs.</p></div><div class="shot"><img src="settings-shortcuts.png" alt="Actual shortcut settings"></div><div class="caption">Captured from the extension settings.</div></div>`,
    },
    {
      name: 'screenshot-02-pinned-lists', width: 1280, height: 800,
      html: `<div class="canvas"><div class="topbrand">${brand}</div><div class="copy"><h1>Tabs move.<br>Shortcuts stay.</h1><p>Assign a shortcut to each pinned list. Keep its binding when tabs move or names change.</p><p class="note">Separate discovery for each account.<br>Settings stay in your browser.</p></div><div class="shot"><img src="settings-lists.png" alt="Actual pinned-list settings with example data"></div><div class="caption">Actual settings shown with example account and list data.</div></div>`,
    },
    {
      name: 'promo-small-440x280', width: 440, height: 280,
      html: `<div class="canvas"><div style="position:absolute;left:25px;top:24px">${brand}</div><h1 style="position:absolute;left:32px;top:103px;font-size:35px;line-height:1.12;letter-spacing:-1px">Your feeds,<br>one shortcut away.</h1><p style="position:absolute;left:32px;bottom:30px;color:#a9c4d3;font-size:14px">Keyboard navigation for X.</p></div>`,
    },
    {
      name: 'promo-marquee-1400x560', width: 1400, height: 560,
      html: `<div class="canvas"><div style="position:absolute;left:64px;top:42px">${brand}</div><h1 style="position:absolute;left:68px;top:167px;font-size:66px;letter-spacing:-3px">Your feeds.<br>One shortcut away.</h1><p style="position:absolute;left:70px;top:352px;font-size:20px;line-height:1.6;color:#adc5d4">For you, Following, and your pinned lists.<br>Choose the keys that work for you.</p><div style="position:absolute;left:835px;right:65px;top:117px;display:grid;gap:20px">${[['For you','Ctrl + Alt + 1'],['Next feed','Ctrl + Alt + N'],['Top and new posts','Ctrl + Alt + K']].map(([action,keys])=>`<div style="background:#192b37;border:1px solid #3c5667;border-radius:16px;padding:23px 28px"><p style="font-size:13px;color:#91b1c4;margin-bottom:12px">${action}</p><p style="font:22px monospace;color:#d6f5ff">${keys}</p></div>`).join('')}</div></div>`,
    },
  ];
  for (const scene of scenes) {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${scene.name}</title><style>${css}</style></head><body>${scene.html}</body></html>`;
    const file = join(source, `${scene.name}.html`);
    await writeFile(file, html);
    await page.setViewportSize({ width: scene.width, height: scene.height });
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    await page.screenshot({ path: join(assets, `${scene.name}.png`) });
    console.log(`Rendered ${scene.name}: ${scene.width}x${scene.height}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
