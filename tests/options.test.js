import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const html = await readFile('extension/options.html', 'utf8');
const bundle = await readFile('dist/options.js', 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
async function setup(t, initial = {}) {
  const dom = new JSDOM(html, { url: 'https://extension.test/options.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  let data = structuredClone(initial);
  let fail = false;
  const listeners = new Set();
  window.chrome = { storage: {
    local: {
      async get() { return structuredClone(data); },
      async set(values) {
        if (fail) throw new Error('full');
        const changes = {};
        for (const [key, value] of Object.entries(values)) { changes[key] = { newValue: value }; data[key] = value; }
        for (const listener of listeners) listener(changes, 'local');
      },
    }, onChanged: { addListener(fn) { listeners.add(fn); } },
  } };
  window.eval(bundle);
  await tick();
  t.after(() => window.close());
  const document = window.document;
  const button = action => document.querySelector(`[data-action="${action}"]`);
  function key(key, props = {}) { document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...props })); }
  function record(action, keyName, props) { button(action).click(); key(keyName, props); }
  return { window, document, button, key, record, data: () => data, fail: () => { fail = true; } };
}
test('settings assign, change, clear, and update from storage', async t => {
  const env = await setup(t);
  assert.equal(env.button('following').textContent, 'Alt+Shift+2');
  env.record('following', 'q', { altKey: true }); await tick();
  assert.equal(env.data()['binding:following'], 'Alt+q');
  assert.equal(env.button('following').textContent, 'Alt+q');
  env.record('following', 'w', { altKey: true }); await tick();
  assert.equal(env.data()['binding:following'], 'Alt+w');
  env.button('following').parentElement.querySelector('button:last-of-type').click(); await tick();
  assert.equal(env.data()['binding:following'], null);
  assert.equal(env.button('following').textContent, 'Not assigned');
  await env.window.chrome.storage.local.set({ 'binding:following': 'Alt+e' });
  assert.equal(env.button('following').textContent, 'Alt+e');
});
test('settings flag native and duplicate bindings', async t => {
  const env = await setup(t);
  env.record('following', 'j'); await tick();
  assert.match(env.button('following').parentElement.textContent, /native action/);
  env.record('forYou', 'j'); await tick();
  assert.match(env.button('following').parentElement.textContent, /Duplicate binding/);
  assert.match(env.button('forYou').parentElement.textContent, /Duplicate binding/);
});
test('lists render safely and duplicates are scoped to the account', async t => {
  const env = await setup(t, {
    'account:alice': { lists: [{ id: '11', label: '<img src=x onerror=alert(1)>' }] },
    'account:bob': { lists: [{ id: '22', label: 'News' }] },
    'binding:list:alice:11': 'Alt+q', 'binding:list:bob:22': 'Alt+q',
  });
  assert.equal(env.document.querySelector('img'), null);
  assert.equal(env.document.querySelectorAll('.warning:not([hidden])').length, 0);
  env.record('following', 'q', { altKey: true }); await tick();
  assert.match(env.button('following').parentElement.textContent, /Duplicate/);
  assert.match(env.button('list:alice:11').parentElement.textContent, /Duplicate/);
  assert.match(env.button('list:bob:22').parentElement.textContent, /Duplicate/);
});
test('recording cancels on Escape, Tab and blur; composition does not assign', async t => {
  const env = await setup(t);
  env.button('following').click(); env.key('Escape');
  assert.equal(env.button('following').textContent, 'Alt+Shift+2');
  env.button('following').click(); env.key('Tab');
  assert.equal(env.button('following').textContent, 'Alt+Shift+2');
  env.button('following').focus(); env.button('following').click(); env.button('top').focus();
  assert.equal(env.button('following').textContent, 'Alt+Shift+2');
  env.button('following').click();
  env.document.dispatchEvent(new env.window.CompositionEvent('compositionstart'));
  env.key('j');
  assert.equal(env.data()['binding:following'], undefined);
  env.document.dispatchEvent(new env.window.CompositionEvent('compositionend'));
  env.key('j');
  assert.equal(env.data()['binding:following'], undefined);
});
test('failed storage writes preserve the previous value and report failure', async t => {
  const env = await setup(t);
  env.fail(); env.record('following', 'q', { altKey: true }); await tick();
  assert.equal(env.data()['binding:following'], undefined);
  assert.equal(env.button('following').textContent, 'Alt+Shift+2');
  assert.match(env.document.querySelector('#status').textContent, /Could not save/);
});
