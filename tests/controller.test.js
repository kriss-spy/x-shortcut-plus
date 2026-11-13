import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startController } from '../src/controller.js';
import { startIdentityBridge, LIST_ID_ATTRIBUTE, REFRESH_IDENTITIES_EVENT, reactListId } from '../src/list-identities.js';
import { bindingFromEvent, nativeConflict, validBinding, DEFAULTS } from '../src/keys.js';
import { newPostsBanner, discoverFeeds } from '../src/dom.js';

function fakeStorage(initial = {}) {
  let data = structuredClone(initial);
  const listeners = new Set();
  return {
    local: {
      async get() { return structuredClone(data); },
      async set(values) {
        const changes = {};
        for (const [key, newValue] of Object.entries(values)) { changes[key] = { oldValue: data[key], newValue }; data[key] = structuredClone(newValue); }
        for (const listener of listeners) listener(changes, 'local');
      },
    },
    onChanged: { addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); } },
  };
}
const tabs = (order = ['11', '22']) => `<div role="tablist"><a role="tab" href="/home" aria-selected="true" data-id="forYou">For you</a><a role="tab" href="/home" aria-selected="false" data-id="following">Following</a>${order.map(id => `<a role="tab" href="/i/lists/${id}" aria-selected="false" data-id="${id}">List ${id}</a>`).join('')}<button>+</button></div>`;
async function setup(t, initial = {}, feedMarkup = tabs()) {
  const dom = new JSDOM(`<a data-testid="AppTabBar_Profile_Link" href="/alice">Profile</a><a data-testid="AppTabBar_Home_Link" href="/home">Home</a><main data-testid="primaryColumn">${feedMarkup}<button id="banner">Show 28 posts</button><article><button>Show 123 posts</button></article></main>`, { url: 'https://x.com/home', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;
  window.HTMLElement.prototype.getClientRects = function () { return [{ width: 100, height: 30 }]; };
  let clicks = [];
  let scrolls = 0;
  window.scrollTo = () => { scrolls++; };
  document.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) {
      event.preventDefault(); clicks.push(tab.dataset.id);
      document.querySelectorAll('[role="tab"]').forEach(node => node.setAttribute('aria-selected', String(node === tab)));
      if (tab.hasAttribute('href')) window.history.pushState({}, '', tab.getAttribute('href'));
    }
    if (event.target.id === 'banner') { clicks.push('banner'); event.target.remove(); }
  });
  const storage = fakeStorage(initial);
  const controller = await startController(window, storage);
  const cleanup = [];
  t.after(() => { cleanup.forEach(fn => fn()); controller.stop(); window.close(); });
  function key(key, extra = {}, target = document.body) {
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
    target.dispatchEvent(event); return event.defaultPrevented;
  }
  function shortcut(name, target) {
    const binding = DEFAULTS[name].split('+');
    const value = binding.at(-1);
    return key(binding.includes('Shift') && /^[a-z]$/.test(value) ? value.toUpperCase() : value, { ctrlKey: binding.includes('Ctrl'), altKey: binding.includes('Alt'), shiftKey: binding.includes('Shift'), metaKey: binding.includes('Meta'), code: /^[12]$/.test(value) ? `Digit${value}` : /^[a-z]$/.test(value) ? `Key${value.toUpperCase()}` : value }, target);
  }
  return { onCleanup: fn => cleanup.push(fn), window, document, storage, controller, key, shortcut, clicks, scrolls: () => scrolls };
}
const tick = (ms = 130) => new Promise(resolve => setTimeout(resolve, ms));

test('canonical bindings preserve modifiers, digit defaults, and native inventory', () => {
  assert.equal(bindingFromEvent({ key: '!', code: 'Digit1', altKey: true, shiftKey: true }), 'Alt+Shift+1');
  assert.equal(bindingFromEvent({ key: 'A', shiftKey: true }), 'Shift+a');
  assert.equal(bindingFromEvent({ key: 'Dead' }), null);
  assert.equal(bindingFromEvent({ key: 'a', getModifierState: () => true }), null);
  assert.equal(validBinding('Alt+Shift+ArrowRight'), true);
  assert.equal(validBinding('Shift+Alt+a'), false);
  for (const value of Object.values(DEFAULTS)) assert.equal(nativeConflict(value), null);
  for (const value of ['g', 'a', 'j', '.', '?', 'Shift+/', 'Ctrl+Enter', 'Meta+Enter']) assert.ok(nativeConflict(value));
});
test('direct home feeds and each pinned list follow identity after reorder and rename', async t => {
  const env = await setup(t, { 'binding:list:alice:11': 'Alt+Shift+3', 'binding:list:alice:22': 'Alt+Shift+4' });
  env.shortcut('following'); env.shortcut('forYou');
  env.key('3', { code: 'Digit3', altKey: true, shiftKey: true });
  assert.deepEqual(env.clicks, ['following', 'forYou', '11']);
  env.document.querySelector('[role="tablist"]').outerHTML = tabs(['22', '11']);
  env.document.querySelector('[data-id="11"]').textContent = 'Renamed';
  env.key('3', { code: 'Digit3', altKey: true, shiftKey: true });
  env.key('4', { code: 'Digit4', altKey: true, shiftKey: true });
  assert.deepEqual(env.clicks.slice(-2), ['11', '22']);
  assert.deepEqual((await env.storage.local.get())['account:alice'].lists, [{ id: '22', label: 'List 22' }, { id: '11', label: 'Renamed' }]);
});
test('next and previous use displayed order and wrap both ends', async t => {
  const env = await setup(t);
  env.shortcut('previous');
  env.shortcut('next');
  env.shortcut('next');
  env.shortcut('next');
  env.shortcut('next');
  assert.deepEqual(env.clicks, ['22', 'forYou', 'following', '11', '22']);
  env.document.querySelector('[role="tablist"]').outerHTML = tabs(['22', '11']);
  env.window.history.pushState({}, '', '/i/lists/22');
  env.shortcut('next');
  assert.equal(env.clicks.at(-1), '11');
});
test('top activates only banner, never post buttons; no banner only scrolls', async t => {
  const env = await setup(t);
  assert.equal(env.shortcut('top'), true);
  assert.deepEqual(env.clicks, ['banner']);
  assert.equal(env.scrolls(), 1);
  env.shortcut('top');
  assert.deepEqual(env.clicks, ['banner']);
  assert.equal(env.scrolls(), 2);
  assert.equal(env.window.location.pathname, '/home');
});
test('top catches a banner mounted after scrolling and cancels after route change', async t => {
  const env = await setup(t);
  env.document.querySelector('#banner').remove();
  env.shortcut('top');
  env.document.querySelector('article').insertAdjacentHTML('beforebegin', '<button id="banner">Show new posts</button>');
  await tick();
  assert.deepEqual(env.clicks, ['banner']);
  env.shortcut('top');
  env.window.history.pushState({}, '', '/explore');
  env.document.querySelector('article').insertAdjacentHTML('beforebegin', '<button id="banner">Show new posts</button>');
  await tick();
  assert.deepEqual(env.clicks, ['banner']);
});
test('typing, shadow editors, dialogs, menus, media, composition and repeats pass through', async t => {
  const env = await setup(t);
  for (const markup of ['<input>', '<textarea></textarea>', '<select><option>A</option></select>', '<div contenteditable="true"><span>edit</span></div>', '<div role="textbox"></div>', '<video tabindex="0"></video>', '<div data-testid="videoPlayer"><button>Pause</button></div>']) {
    const holder = env.document.createElement('div'); holder.innerHTML = markup; env.document.body.append(holder);
    const target = holder.querySelector('span, button') ?? holder.firstElementChild;
    assert.equal(env.shortcut('following', target), false, markup); holder.remove();
  }
  const host = env.document.createElement('div'); env.document.body.append(host);
  const input = env.document.createElement('input'); host.attachShadow({ mode: 'open' }).append(input);
  const event = new env.window.KeyboardEvent('keydown', { key: '2', code: 'Digit2', ctrlKey: true, altKey: true, bubbles: true, cancelable: true, composed: true });
  input.dispatchEvent(event); assert.equal(event.defaultPrevented, false); host.remove();
  for (const markup of ['<div role="dialog"></div>', '<dialog open></dialog>', '<div role="menu"></div>', '<div role="listbox"></div>']) {
    env.document.body.insertAdjacentHTML('beforeend', markup);
    assert.equal(env.shortcut('following'), false); env.document.body.lastChild.remove();
  }
  assert.equal(env.key('2', { code: 'Digit2', ctrlKey: true, altKey: true, repeat: true }), false);
  assert.equal(env.key('2', { code: 'Digit2', ctrlKey: true, altKey: true, isComposing: true }), false);
  assert.equal(env.key('2', { code: 'Digit2', ctrlKey: true, altKey: true, keyCode: 229 }), false);
  env.window.dispatchEvent(new env.window.CompositionEvent('compositionstart'));
  assert.equal(env.shortcut('following'), false);
  env.window.dispatchEvent(new env.window.CompositionEvent('compositionend'));
  assert.equal(env.shortcut('following'), false);
  await tick();
  assert.equal(env.shortcut('following'), true);
  assert.deepEqual(env.clicks, ['following']);
});
test('live changes, cleared bindings, duplicate safety, and persistence across reload', async t => {
  const env = await setup(t);
  await env.storage.local.set({ 'binding:following': 'Alt+q' });
  assert.equal(env.shortcut('following'), false);
  assert.equal(env.key('q', { altKey: true }), true);
  await env.storage.local.set({ 'binding:forYou': 'Alt+q' });
  assert.equal(env.key('q', { altKey: true }), false);
  await env.storage.local.set({ 'binding:forYou': null });
  assert.equal(env.shortcut('forYou'), false);
  assert.equal(env.key('q', { altKey: true }), true);
  env.controller.stop();
  const second = await startController(env.window, env.storage);
  t.after(() => second.stop());
  assert.equal(env.shortcut('forYou'), false);
  assert.equal(env.key('q', { altKey: true }), true);
});
test('native single keys and g/a sequences remain available by default', async t => {
  const env = await setup(t, { 'binding:following': 'h' });
  for (const key of ['j', 'k', '.', '?', '/', 'Enter', ' ']) assert.equal(env.key(key), false);
  env.key('g'); assert.equal(env.key('h'), false);
  env.key('a'); assert.equal(env.key('h'), false);
  assert.equal(env.key('h'), true);
});
test('account switches reject old DOM and do not copy another account lists', async t => {
  const env = await setup(t, { 'binding:list:alice:11': 'Alt+q', 'binding:list:bob:99': 'Alt+q' });
  env.document.querySelector('[data-testid="AppTabBar_Profile_Link"]').href = '/bob';
  env.controller.refresh();
  assert.equal((await env.storage.local.get())['account:bob'], undefined);
  assert.equal(env.key('q', { altKey: true }), false);
  env.document.querySelector('[role="tablist"]').outerHTML = tabs(['99']);
  env.controller.refresh();
  assert.deepEqual((await env.storage.local.get())['account:bob'].lists, [{ id: '99', label: 'List 99' }]);
  env.key('q', { altKey: true });
  assert.equal(env.clicks.at(-1), '99');
  env.document.querySelector('[data-testid="AppTabBar_Profile_Link"]').remove();
  assert.equal(env.shortcut('forYou'), false);
});
test('route changes requery targets; home navigation waits for SPA tabs', async t => {
  const env = await setup(t);
  env.window.history.pushState({}, '', '/notifications');
  env.document.querySelector('[role="tablist"]').remove();
  env.document.querySelector('[data-testid="AppTabBar_Home_Link"]').addEventListener('click', event => {
    event.preventDefault(); env.window.history.pushState({}, '', '/home');
    env.window.setTimeout(() => env.document.querySelector('main').insertAdjacentHTML('afterbegin', tabs()), 10);
  });
  assert.equal(env.shortcut('top'), false);
  assert.equal(env.shortcut('next'), false);
  assert.equal(env.shortcut('following'), true);
  await tick(250);
  assert.deepEqual(env.clicks, ['following']);
});
test('unrelated and hidden tabs/banners are excluded', async t => {
  const env = await setup(t);
  env.document.querySelector('#banner').hidden = true;
  assert.equal(newPostsBanner(env.document), null);
  env.document.querySelector('[role="tablist"]').remove();
  env.document.querySelector('main').insertAdjacentHTML('afterbegin', '<div role="tablist"><a role="tab" href="/explore">Top</a><a role="tab" href="/explore">Latest</a></div>');
  assert.equal(discoverFeeds(env.document), null);
  assert.equal(env.shortcut('following'), false);
});

test('cached account discovery supports direct list shortcuts from other routes after startup', async t => {
  const env = await setup(t, { 'binding:list:alice:11': 'Alt+q' });
  env.window.history.pushState({}, '', '/notifications');
  env.document.querySelector('[role="tablist"]').remove();
  env.controller.stop();
  const second = await startController(env.window, env.storage);
  t.after(() => second.stop());
  env.document.querySelector('[data-testid="AppTabBar_Home_Link"]').addEventListener('click', event => {
    event.preventDefault(); env.window.history.pushState({}, '', '/home');
    env.document.querySelector('main').insertAdjacentHTML('afterbegin', tabs());
  });
  assert.equal(env.key('q', { altKey: true }), true);
  await tick(250);
  assert.equal(env.clicks.at(-1), '11');
});
test('a temporarily missing account does not discard or transfer identity', async t => {
  const env = await setup(t);
  const profile = env.document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
  profile.remove(); env.controller.refresh();
  env.document.body.prepend(profile); env.controller.refresh();
  assert.equal(env.shortcut('following'), true);
  profile.remove(); env.controller.refresh();
  profile.href = '/bob'; env.document.body.prepend(profile); env.controller.refresh();
  assert.equal((await env.storage.local.get())['account:bob'], undefined);
});
test('delayed banner action cancels on window blur and composition', async t => {
  const env = await setup(t);
  env.document.querySelector('#banner').remove();
  env.shortcut('top');
  env.window.dispatchEvent(new env.window.Event('blur'));
  env.document.querySelector('article').insertAdjacentHTML('beforebegin', '<button id="banner">Show 1 posts</button>');
  await tick();
  assert.deepEqual(env.clicks, []);
  env.document.querySelector('#banner').remove();
  env.shortcut('top');
  env.window.dispatchEvent(new env.window.CompositionEvent('compositionstart'));
  env.document.querySelector('article').insertAdjacentHTML('beforebegin', '<button id="banner">Show 2 posts</button>');
  await tick();
  assert.deepEqual(env.clicks, []);
});
test('storage read failure leaves native keyboard events untouched', async t => {
  const env = await setup(t);
  env.controller.stop();
  const warn = console.warn; console.warn = () => {};
  try {
    const controller = await startController(env.window, { local: { get: async () => { throw new Error('unavailable'); } } });
    assert.equal(controller, null);
    assert.equal(env.shortcut('following'), false);
  } finally { console.warn = warn; }
});

test('next from a list without Home tabs rechecks the displayed order after returning Home', async t => {
  const env = await setup(t);
  env.window.history.pushState({}, '', '/i/lists/11');
  env.document.querySelector('[role="tablist"]').remove();
  env.document.querySelector('[data-testid="AppTabBar_Home_Link"]').addEventListener('click', event => {
    event.preventDefault(); env.window.history.pushState({}, '', '/home');
    env.document.querySelector('main').insertAdjacentHTML('afterbegin', tabs(['22', '11']));
  });
  assert.equal(env.shortcut('next'), true);
  await tick(250);
  assert.equal(env.clicks.at(-1), 'forYou');
});

test('disabled feed targets do not consume a shortcut', async t => {
  const env = await setup(t);
  env.document.querySelector('[data-id="following"]').setAttribute('aria-disabled', 'true');
  assert.equal(env.shortcut('following'), false);
  assert.deepEqual(env.clicks, []);
});

// Minimized from the user's captured live X markup on 2026-11-12.
const divTabs = () => `<div role="tablist"><div role="tab" aria-selected="true" tabindex="0" data-id="forYou"><div><span>For you</span></div></div><div role="tab" aria-selected="false" tabindex="-1" data-id="following"><div><span>Following</span></div></div><div role="tab" aria-selected="false" tabindex="-1" data-id="official"><div><span>BA official</span></div></div><div role="tab" aria-selected="false" tabindex="-1" data-id="art"><div><span>BA art</span></div></div></div>`;

test('captured X div tabs: default direct feed shortcuts work without hrefs', async t => {
  const env = await setup(t, {}, divTabs());
  assert.equal(env.shortcut('following'), true);
  assert.equal(env.shortcut('forYou'), true);
  assert.deepEqual(env.clicks, ['following', 'forYou']);
});
test('captured X div tabs: Ctrl+Alt+1 switches from Following to For you', async t => {
  const env = await setup(t, { 'binding:forYou': 'Ctrl+Alt+1' }, divTabs());
  env.document.querySelector('[data-id="forYou"]').setAttribute('aria-selected', 'false');
  env.document.querySelector('[data-id="following"]').setAttribute('aria-selected', 'true');
  assert.equal(env.key('1', { code: 'Digit1', ctrlKey: true, altKey: true }), true);
  assert.deepEqual(env.clicks, ['forYou']);
});
test('captured X div tabs: next/previous include unidentified pinned tabs and wrap', async t => {
  const env = await setup(t, {}, divTabs());
  env.shortcut('previous');
  env.shortcut('next');
  env.shortcut('next');
  env.shortcut('next');
  env.shortcut('next');
  assert.deepEqual(env.clicks, ['art', 'forYou', 'following', 'official', 'art']);
  env.document.querySelector('[data-id="official"]').before(env.document.querySelector('[data-id="art"]'));
  env.shortcut('next');
  assert.equal(env.clicks.at(-1), 'official');
});
test('unknown list identities never become position/name bindings or erase saved identities', async t => {
  const initial = { 'account:alice': { lists: [{ id: '11', label: 'Saved list' }] }, 'binding:list:alice:11': 'Alt+q' };
  const env = await setup(t, initial, divTabs());
  assert.deepEqual((await env.storage.local.get())['account:alice'], initial['account:alice']);
  assert.equal(env.key('q', { altKey: true }), false);
  const found = discoverFeeds(env.document);
  assert.equal(found.feeds.length, 4);
  assert.deepEqual(found.feeds.slice(2).map(feed => feed.id), [null, null]);
});
test('div tab support does not capture unrelated tablists outside Home', async t => {
  const env = await setup(t, {}, divTabs());
  env.window.history.pushState({}, '', '/explore');
  assert.equal(discoverFeeds(env.document), null);
});

function setReactKey(element, key, index = '2') {
  // Shape captured from the user's live tab: semantic List:<id>, then index.
  element.__reactFiber$fixture = { key: null, return: { key, return: { key: index, return: null } } };
}
const officialId = '2118342840380260745';
const artId = '2118342982319710215';
async function setupIdentityTabs(t) {
  const env = await setup(t, { [`binding:list:alice:${officialId}`]: 'Alt+q', [`binding:list:alice:${artId}`]: 'Alt+w' }, divTabs());
  setReactKey(env.document.querySelector('[data-id="forYou"]'), 'home', '0');
  setReactKey(env.document.querySelector('[data-id="following"]'), 'home_latest', '1');
  setReactKey(env.document.querySelector('[data-id="official"]'), `List:${officialId}`);
  setReactKey(env.document.querySelector('[data-id="art"]'), `List:${artId}`, '3');
  const bridge = startIdentityBridge(env.window);
  env.onCleanup(() => bridge.stop());
  env.controller.refresh();
  return env;
}
test('captured React List keys enable separate persistent list bindings', async t => {
  const env = await setupIdentityTabs(t);
  assert.equal(env.key('q', { altKey: true }), true);
  assert.equal(env.key('w', { altKey: true }), true);
  assert.deepEqual(env.clicks, ['official', 'art']);
  assert.deepEqual((await env.storage.local.get())['account:alice'].lists.map(list => list.id), [officialId, artId]);
});
test('React list identities survive reorder and label changes', async t => {
  const env = await setupIdentityTabs(t);
  const official = env.document.querySelector('[data-id="official"]');
  const art = env.document.querySelector('[data-id="art"]');
  official.before(art); official.textContent = 'Renamed';
  env.key('q', { altKey: true }); env.key('w', { altKey: true });
  assert.deepEqual(env.clicks, ['official', 'art']);
  assert.deepEqual((await env.storage.local.get())['account:alice'].lists.map(list => list.id), [artId, officialId]);
});
test('a recycled React tab cannot keep its old list identity between mutations', async t => {
  const env = await setupIdentityTabs(t);
  const official = env.document.querySelector('[data-id="official"]');
  // React object changes without any DOM mutation. Action-time refresh must
  // clear the previous ID before deciding whether to consume the shortcut.
  setReactKey(official, 'List:9999999999999999999');
  assert.equal(env.key('q', { altKey: true }), false);
  assert.equal(official.getAttribute(LIST_ID_ATTRIBUTE), '9999999999999999999');
  assert.deepEqual(env.clicks, []);
});

test('React identity reader rejects index/name keys, malformed IDs, and ambiguous ancestry', () => {
  const tab = {};
  for (const key of ['2', 'BA official', 'List:0', 'List:-1', 'List:1e8', 'List:123<script>', `List:${'1'.repeat(31)}`]) {
    setReactKey(tab, key);
    assert.equal(reactListId(tab), null, key);
  }
  setReactKey(tab, `List:${officialId}`);
  assert.equal(reactListId(tab), officialId);
  tab.__reactFiber$fixture.return.return = { key: `List:${artId}` };
  assert.equal(reactListId(tab), null);
});
test('React bridge clears unknown keys and stale identity when leaving Home', async t => {
  const env = await setupIdentityTabs(t);
  const tab = env.document.querySelector('[data-id="official"]');
  assert.equal(tab.getAttribute(LIST_ID_ATTRIBUTE), officialId);
  setReactKey(tab, '2');
  env.document.dispatchEvent(new env.window.Event(REFRESH_IDENTITIES_EVENT));
  assert.equal(tab.hasAttribute(LIST_ID_ATTRIBUTE), false);
  env.window.history.pushState({}, '', '/explore');
  env.document.dispatchEvent(new env.window.Event(REFRESH_IDENTITIES_EVENT));
  assert.equal(env.document.querySelector(`[${LIST_ID_ATTRIBUTE}]`), null);
});
test('React list bridge keeps account discoveries separate during in-place switches', async t => {
  const env = await setupIdentityTabs(t);
  env.document.querySelector('[data-testid="AppTabBar_Profile_Link"]').href = '/bob';
  env.controller.refresh();
  assert.equal((await env.storage.local.get())['account:bob'], undefined);
  setReactKey(env.document.querySelector('[data-id="official"]'), 'List:3333333333333333333');
  setReactKey(env.document.querySelector('[data-id="art"]'), 'List:4444444444444444444');
  env.controller.refresh();
  assert.deepEqual((await env.storage.local.get())['account:bob'].lists.map(list => list.id), ['3333333333333333333', '4444444444444444444']);
  assert.equal(env.key('q', { altKey: true }), false);
});
