import { createAccountSwitcher } from './account-switcher.js';
import { LIST_ID_ATTRIBUTE } from './list-identities.js';
import { ACTIONS, bindingFromEvent, effectiveBinding, duplicateActions } from './keys.js';
import { BINDING_PREFIX, accountKey, listAction, readBindings } from './storage.js';
import { accountIdentity, canClick, clickTarget, discoverFeeds, newPostsBanner, primary, protectedContext, selectedFeed, postAuthor, accountSwitchContext, OVERLAY_SELECTOR } from './dom.js';

export async function startController(window, storage) {
  const document = window.document;
  let items;
  try { items = await storage.local.get(null); }
  catch (error) { console.warn('X Shortcut Plus could not load settings.', error); return null; }
  let bindings = readBindings(items);
  let account = null;
  let lastAccount = null;
  let lastOwnedSnapshot = null;
  let quarantine = null;
  let catalog = [];
  let composing = false;
  let compositionEnded = -Infinity;
  let prefixUntil = 0;
  let pending = null;
  let timer;
  let stopped = false;
  let actionGeneration = 0;
  let stopBanner = () => {};
  let lastURL = window.location.href;
  const saved = new Map();
  const accountSwitcher = createAccountSwitcher(window);
  const cleanup = [() => stopBanner(), () => accountSwitcher.stop()];
  function listen(target, name, listener, options) {
    target.addEventListener(name, listener, options);
    cleanup.push(() => target.removeEventListener(name, listener, options));
  }
  function refresh() {
    const identity = accountIdentity(document);
    const found = discoverFeeds(document);
    if (identity !== account) {
      pending = null;
      prefixUntil = 0;
      const stored = identity && items[accountKey(identity)];
      catalog = Array.isArray(stored?.lists) ? [
        { id: 'forYou', label: 'For you', list: false },
        { id: 'following', label: 'Following', list: false },
        ...stored.lists.filter(list => /^\d+$/.test(list.id)).map(list => ({ ...list, list: true })),
      ] : [];
      if (identity && lastAccount && identity !== lastAccount && lastOwnedSnapshot) quarantine = { bar: lastOwnedSnapshot.bar, signature: lastOwnedSnapshot.signature };
      account = identity;
      if (identity) lastAccount = identity;
    }
    if (window.location.href !== lastURL) {
      lastURL = window.location.href;
      prefixUntil = 0;
    }
    if (!account || !found) { accountSwitcher.restore(null); return null; }
    if (quarantine && found.bar === quarantine.bar && found.signature === quarantine.signature) { accountSwitcher.restore(null); return null; }
    quarantine = null;
    lastOwnedSnapshot = found;
    accountSwitcher.restore(found);
    catalog = found.feeds.filter(feed => feed.id !== null).map(({ id, label, list }) => ({ id, label, list }));
    if (!found.complete) return found;
    const lists = catalog.filter(feed => feed.list).map(({ id, label }) => ({ id, label }));
    const key = accountKey(account);
    const serialized = JSON.stringify(lists);
    if (saved.get(key) !== serialized) {
      saved.set(key, serialized);
      storage.local.set({ [key]: { lists } }).catch(error => {
        saved.delete(key);
        console.warn('X Shortcut Plus could not save discovered lists.', error);
      });
    }
    return found;
  }
  function actions() {
    return [...Object.keys(ACTIONS), ...catalog.filter(feed => feed.list).map(feed => listAction(account, feed.id))];
  }
  function resolveFeed(action, found) {
    if (!found) return null;
    const position = /^feed([3-9])$/.exec(action);
    if (position) {
      const element = found.feeds[Number(position[1]) - 1]?.element;
      return canClick(element) ? element : null;
    }
    const element = found.feeds.find(feed => feed.list ? listAction(account, feed.id) === action : feed.id === action)?.element;
    return canClick(element) ? element : null;
  }
  function homeLink() {
    const element = document.querySelector('a[data-testid="AppTabBar_Home_Link"]');
    return canClick(element) ? element : null;
  }
  function top() {
    stopBanner();
    const generation = actionGeneration;
    const startAccount = account;
    const startURL = window.location.href;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const scrollRoot = primary(document);
    for (let node = scrollRoot; node && node !== document.body; node = node.parentElement) {
      if (node.scrollTop > 0 && /auto|scroll/.test(window.getComputedStyle(node).overflowY)) node.scrollTo({ top: 0, behavior: 'instant' });
    }
    const tryBanner = () => {
      if (generation !== actionGeneration || accountIdentity(document) !== startAccount || window.location.href !== startURL || protectedContext({ composedPath: () => [] }, document)) return true;
      return clickTarget(newPostsBanner(document));
    };
    if (tryBanner()) return;
    // X may mount the banner only after the scroll reaches the top.
    const observer = new window.MutationObserver(() => { if (tryBanner()) stopBanner(); });
    observer.observe(scrollRoot ?? document, { childList: true, subtree: true, attributes: true });
    const timeout = window.setTimeout(() => stopBanner(), 1000);
    stopBanner = () => { observer.disconnect(); window.clearTimeout(timeout); stopBanner = () => {}; };
  }
  function begin(action, found) {
    if (action === 'nextAccount') return accountSwitcher.begin(account, found, accountSwitchContext(document));
    if (action === 'author') {
      const target = postAuthor(document);
      return target ? () => clickTarget(target) : false;
    }
    if (action === 'top') {
      if (!/^\/(?:home\/?|i\/lists\/\d+\/?)$/.test(window.location.pathname) || !primary(document)) return false;
      return () => top();
    }
    let targetAction = action;
    let relative = null;
    if (action === 'next' || action === 'previous') {
      const feeds = found?.feeds ?? catalog;
      const index = found ? selectedFeed(feeds, window.location.pathname) : feeds.findIndex(f => f.list && window.location.pathname === `/i/lists/${f.id}`);
      if (index < 0 || feeds.length < 2) return false;
      relative = { id: feeds[index].id, list: feeds[index].list, step: action === 'next' ? 1 : -1 };
      const target = feeds[(index + relative.step + feeds.length) % feeds.length];
      // Relative navigation can click every displayed tab without inventing
      // persistent identities for tabs whose list ID is not yet known.
      if (found) return canClick(target.element) ? () => clickTarget(target.element) : false;
      targetAction = target.list ? listAction(account, target.id) : target.id;
    }
    const target = resolveFeed(targetAction, found);
    if (target) return () => clickTarget(target);
    const home = homeLink();
    if (!home || window.location.pathname === '/home' || quarantine) return false;
    return () => {
      pending = { action: targetAction, relative, account, origin: window.location.pathname, expires: Date.now() + 4000 };
      clickTarget(home);
      schedulePending();
    };
  }
  function schedulePending() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!pending || stopped) return;
      const found = refresh();
      if (!pending) return;
      if (pending.expires < Date.now() || pending.account !== account || (!/^\/home\/?$/.test(window.location.pathname) && window.location.pathname !== pending.origin) || protectedContext({ composedPath: () => [] }, document)) { pending = null; return; }
      if (found && pending.relative) {
        const cursor = pending.relative;
        const index = found.feeds.findIndex(feed => feed.id === cursor.id && feed.list === cursor.list);
        if (index < 0) { pending = null; return; }
        const feed = found.feeds[(index + cursor.step + found.feeds.length) % found.feeds.length];
        pending.action = feed.list ? listAction(account, feed.id) : feed.id;
      }
      const target = resolveFeed(pending.action, found);
      if (target && /^\/home\/?$/.test(window.location.pathname)) { pending = null; clickTarget(target); }
      else schedulePending();
    }, 100);
  }
  function keydown(event) {
    if (stopped) return;
    if (event.key === 'Escape') accountSwitcher.cancel();
    const found = refresh();
    if (!account || composing || event.isComposing || event.keyCode === 229 || Date.now() - compositionEnded < 100) {
      prefixUntil = 0; pending = null; return;
    }
    if (event.defaultPrevented || event.repeat || event.getModifierState?.('AltGraph')) return;
    const binding = bindingFromEvent(event);
    if (!binding) return;
    if (Date.now() < prefixUntil && !event.ctrlKey && !event.altKey && !event.metaKey) { prefixUntil = 0; return; }
    const ids = actions();
    const duplicate = duplicateActions(bindings, ids);
    const action = ids.find(id => effectiveBinding(bindings, id) === binding && !duplicate.includes(id));
    // Only modified account shortcuts can override X media/composer guards.
    const fromOverlay = action === 'nextAccount' && (event.ctrlKey || event.altKey || event.metaKey)
      && accountSwitchContext(document);
    const context = fromOverlay ? { allowedOverlays: [...document.querySelectorAll(OVERLAY_SELECTOR)], allowEditing: true } : {};
    if (protectedContext(event, document, context)) { prefixUntil = 0; pending = null; return; }
    const run = action && begin(action, found);
    if (!run) {
      if (binding === 'g' || binding === 'a') prefixUntil = Date.now() + 1500;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    pending = null;
    actionGeneration++;
    accountSwitcher.cancel();
    run();
  }
  const onStorage = (changes, area) => {
    if (area !== 'local') return;
    for (const [key, change] of Object.entries(changes)) {
      if (change.newValue === undefined) delete items[key];
      else items[key] = change.newValue;
    }
    if (Object.keys(changes).some(key => key.startsWith(BINDING_PREFIX))) {
      bindings = readBindings(items);
      pending = null;
    }
  };
  storage.onChanged.addListener(onStorage);
  cleanup.push(() => storage.onChanged.removeListener(onStorage));
  listen(window, 'keydown', keydown, true);
  listen(window, 'compositionstart', () => { composing = true; pending = null; actionGeneration++; accountSwitcher.cancel(); }, true);
  listen(window, 'compositionend', () => { composing = false; compositionEnded = Date.now(); }, true);
  listen(window, 'blur', event => {
    // Captured element blur events also reach window during panel focus changes.
    if (event.target !== window) return;
    actionGeneration++; pending = null; prefixUntil = 0; composing = false; accountSwitcher.cancel();
  }, true);
  listen(window, 'pagehide', () => { actionGeneration++; pending = null; prefixUntil = 0; accountSwitcher.cancel(); }, true);
  listen(window, 'pointerdown', () => accountSwitcher.cancel(), true);
  let refreshTimer;
  const observer = new window.MutationObserver(() => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, 100);
  });
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'aria-selected', 'hidden', 'aria-hidden', LIST_ID_ATTRIBUTE] });
  refresh();
  return { refresh, stop() { stopped = true; observer.disconnect(); window.clearTimeout(timer); window.clearTimeout(refreshTimer); cleanup.forEach(fn => fn()); } };
}
