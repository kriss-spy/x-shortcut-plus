import { replyContext, validReplyContext, reopenReply } from './reply-navigation.js';
import { accountIdentity, canClick, clickTarget, protectedContext, OVERLAY_SELECTOR } from './dom.js';

export const ACCOUNT_RETURN_KEY = 'x-shortcut-plus:account-return';
const lifetime = 30000;


function signedInAccounts(document) {
  const accounts = new Map();
  for (const element of document.querySelectorAll('[data-testid="UserCell"]')) {
    if (!canClick(element)) continue;
    // Captured X controls identify the destination without a list container.
    const explicit = /^Switch to @([A-Za-z0-9_]{1,15})$/.exec(element.getAttribute('aria-label') ?? '');
    let handle = explicit?.[1]?.toLowerCase();
    if (explicit) {
      const avatars = [...element.querySelectorAll('[data-testid^="UserAvatar-Container-"]')];
      if (!avatars.some(avatar => avatar.getAttribute('data-testid').toLowerCase() === `useravatar-container-${handle}`)) continue;
    } else {
      // Keep the previous adapter restricted to the named signed-in list.
      if (!element.closest('[data-testid="AccountSwitcher_LoggedInAccountList"]')) continue;
      const handles = [...element.querySelectorAll('[dir], span')]
        .map(node => /^@([A-Za-z0-9_]{1,15})$/.exec(node.textContent.trim())?.[1]?.toLowerCase())
        .filter(Boolean);
      const unique = [...new Set(handles)];
      if (unique.length !== 1) continue;
      handle = unique[0];
    }
    if (!accounts.has(handle)) accounts.set(handle, { handle, element, explicit: !!explicit });
  }
  return [...accounts.values()];
}

// sessionStorage belongs to this tab and survives X's account-switch reload.
export function createAccountSwitcher(window, navigate = url => window.location.replace(url)) {
  const document = window.document;
  let timer;
  let restoreTimer;
  let switching = false;
  let stopped = false;
  function cancel() { window.clearTimeout(timer); switching = false; }
  function discard() {
    try { window.sessionStorage.removeItem(ACCOUNT_RETURN_KEY); } catch { /* Storage can be disabled. */ }
  }
  function write(record) {
    try { window.sessionStorage.setItem(ACCOUNT_RETURN_KEY, JSON.stringify(record)); return true; }
    catch { return false; }
  }
  function read() {
    try {
      const record = JSON.parse(window.sessionStorage.getItem(ACCOUNT_RETURN_KEY));
      if (!record) return null;
      const url = new URL(record.url, window.location.origin);
      if (!/^\/(?!\/)/.test(record.url) || record.url.startsWith('//') || url.origin !== window.location.origin
        || !/^[a-z0-9_]{1,15}$/.test(record.target) || !/^[a-z0-9_]{1,15}$/.test(record.source)
        || !Number.isFinite(record.expires) || record.expires <= Date.now() || record.expires > Date.now() + lifetime
        || (record.reply !== undefined && (record.url !== '/compose/post' || !validReplyContext(record.reply, window.location.origin)))
        || !Number.isInteger(record.feed) || record.feed < -1 || record.feed > 100) { discard(); return null; }
      return record;
    } catch { discard(); return null; }
  }
  function restore(found) {
    const record = read();
    if (!record) return;
    const identity = accountIdentity(document);
    if (!identity || identity === record.source) return;
    if (identity !== record.target) { discard(); return; }
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (record.reply) {
      const context = replyContext(window);
      if (current === record.url && context?.postId === record.reply.postId && context.backgroundURL === record.reply.backgroundURL) { discard(); return; }
      if (current !== record.reply.backgroundURL) {
        if (window.location.pathname !== '/home' && current !== record.url) { discard(); return; }
        if (record.redirected) return;
        record.redirected = true;
        if (write(record)) navigate(record.reply.backgroundURL);
        return;
      }
      if (protectedContext({ composedPath: () => [] }, document)) return;
      if (reopenReply(window, record.reply)) { discard(); return; }
      // React's router props can become ready without another DOM mutation.
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => { if (!stopped) restore(null); }, 100);
      return;
    }
    if (current !== record.url) {
      // X returns to Home. A different route indicates that the user navigated.
      if (window.location.pathname !== '/home') { discard(); return; }
      if (record.redirected) return;
      record.redirected = true;
      if (write(record)) navigate(record.url);
      return;
    }
    if (record.feed >= 0) {
      if (!found || protectedContext({ composedPath: () => [] }, document)) return;
      const target = record.listId ? found.feeds.find(feed => feed.list && feed.id === record.listId) : found.feeds[record.feed];
      discard();
      clickTarget(target?.element);
    } else discard();
  }
  function begin(account, found, fromOverlay = false) {
    const opener = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (switching || !canClick(opener, { allowAriaHidden: fromOverlay })) return false;
    const reply = replyContext(window);
    // A visible reply preview without usable identity must not become a new post.
    if (window.location.pathname === '/compose/post' && !reply && document.querySelector('[role="dialog"] [data-testid="tweet"]')) return false;
    const allowedOverlays = fromOverlay ? [...document.querySelectorAll(OVERLAY_SELECTOR)] : [];
    const url = window.location.pathname + window.location.search + window.location.hash;
    const feed = /^\/home\/?$/.test(window.location.pathname)
      ? (found?.feeds.findIndex(item => item.element.getAttribute('aria-selected') === 'true') ?? -1) : -1;
    return () => {
      cancel(); discard(); switching = true;
      const deadline = Date.now() + 3000;
      clickTarget(opener, { allowAriaHidden: fromOverlay });
      function choose() {
        if (stopped || !switching) return;
        if (Date.now() > deadline || accountIdentity(document) !== account
          || window.location.pathname + window.location.search + window.location.hash !== url) { cancel(); return; }
        const accounts = signedInAccounts(document);
        if (!accounts.length) { timer = window.setTimeout(choose, 50); return; }
        const index = accounts.findIndex(item => item.handle === account);
        // Some panels list only alternatives, without a current-account row.
        const target = index >= 0 ? accounts[(index + 1) % accounts.length]
          : accounts.find(item => item.explicit && item.handle !== account);
        if (!target || target.handle === account) { cancel(); return; }
        const list = target.element.closest('[data-testid="AccountSwitcher_LoggedInAccountList"]');
        const overlay = target.element.closest(OVERLAY_SELECTOR) ?? list;
        if (protectedContext({ composedPath: () => [] }, document, { allowedOverlays: [...allowedOverlays, overlay], allowEditing: fromOverlay })) { cancel(); return; }
        const record = { source: account, target: target.handle, url, feed, ...(reply ? { reply } : {}),
          listId: feed >= 0 && found.feeds[feed].list ? found.feeds[feed].id : null, expires: Date.now() + lifetime };
        cancel();
        if (write(record) && !clickTarget(target.element)) discard();
      }
      choose();
    };
  }
  return { begin, restore, cancel, stop() { stopped = true; cancel(); window.clearTimeout(restoreTimer); } };
}
