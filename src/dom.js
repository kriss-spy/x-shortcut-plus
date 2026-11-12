import { LIST_ID_ATTRIBUTE, REFRESH_IDENTITIES_EVENT } from './list-identities.js';
export function available(element) {
  if (!element?.isConnected || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}
export function accountIdentity(document) {
  const profile = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  const path = profile && new URL(profile.href, document.URL).pathname;
  return /^\/[A-Za-z0-9_]{1,15}\/?$/.test(path ?? '') && available(profile) ? path.split('/')[1].toLowerCase() : null;
}
export function primary(document) { return document.querySelector('[data-testid="primaryColumn"]'); }
export function listId(element) {
  const link = element.matches('a[href]') ? element : element.querySelector('a[href]');
  if (!link) {
    const id = element.getAttribute(LIST_ID_ATTRIBUTE);
    return /^[1-9]\d{0,29}$/.test(id ?? '') ? id : null;
  }
  const url = new URL(link.href, element.ownerDocument.URL);
  if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname)) return null;
  return /^\/i\/lists\/(\d+)\/?$/.exec(url.pathname)?.[1] ?? null;
}
export function discoverFeeds(document) {
  document.dispatchEvent(new document.defaultView.Event(REFRESH_IDENTITIES_EVENT));
  const column = primary(document);
  if (!column) return null;
  for (const bar of column.querySelectorAll('[role="tablist"]')) {
    if (!available(bar) || bar.closest('article, [role="dialog"]')) continue;
    const tabs = [...bar.querySelectorAll('[role="tab"]')].filter(tab => available(tab) && !tab.closest('[role="dialog"]'));
    if (tabs.length < 2) continue;
    // Home's first two tabs are stable identities. Labels are localized.
    const linkedHomes = tabs.slice(0, 2).every(tab => {
      const link = tab.matches('a') ? tab : tab.querySelector('a');
      return link && /^\/home\/?$/.test(new URL(link.href, document.URL).pathname);
    });
    // Current X uses div tabs without links, including pinned lists on /home.
    // Restrict that form to the first header tablist on Home, before any posts.
    const firstArticle = column.querySelector('article');
    const nativeHomeTabs = /^\/home\/?$/.test(new URL(document.URL).pathname)
      && bar === column.querySelector('[role="tablist"]')
      && (!firstArticle || !!(bar.compareDocumentPosition(firstArticle) & 4))
      && tabs.slice(0, 2).every(tab => !tab.matches('a') && !tab.querySelector('a')
        && ['true', 'false'].includes(tab.getAttribute('aria-selected')));
    if (!linkedHomes && !nativeHomeTabs) continue;
    const feeds = tabs.map((element, index) => {
      const id = index < 2 ? ['forYou', 'following'][index] : listId(element);
      return { id, label: element.textContent.trim().slice(0, 150), element, list: index >= 2 };
    });
    return { bar, feeds, complete: feeds.every(feed => feed.id !== null), signature: feeds.map(f => f.id ?? '?').join('|') };
  }
  return null;
}
export function selectedFeed(feeds, pathname) {
  const id = /^\/i\/lists\/(\d+)\/?$/.exec(pathname)?.[1];
  if (id) return feeds.findIndex(feed => feed.list && feed.id === id);
  if (!/^\/home\/?$/.test(pathname)) return -1;
  return feeds.findIndex(feed => feed.element.getAttribute('aria-selected') === 'true');
}
export function protectedContext(event, document) {
  if (document.designMode?.toLowerCase() === 'on') return true;
  if ([...document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open], [role="menu"], [role="listbox"]')].some(available)) return true;
  const nodes = [...(event.composedPath?.() ?? [event.target]), document.activeElement];
  return nodes.some(node => node?.nodeType === 1 && (node.isContentEditable || node.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], video, audio, [role="slider"], [data-testid="videoPlayer"], [data-testid="audioDock"]')));
}
const bannerText = /^(?:Show\s+(?:[\d,.]+\s+|new\s+)?(?:posts|Tweets)|View\s+[\d,.]+\s+new\s+posts|显示\s*(?:[\d,.]+\s*条)?\s*(?:新帖文|新帖子|新推文|帖子|推文)|查看\s*[\d,.]+\s*条新(?:帖文|帖子|推文)|[\d,.]+\s*件の(?:新しい)?(?:ポスト|ツイート)を表示)$/i;
export function newPostsBanner(document) {
  const column = primary(document);
  if (!column) return null;
  const firstArticle = column.querySelector('article');
  return [...column.querySelectorAll('button, [role="button"]')].find(button => {
    if (!available(button) || button.matches(':disabled, [aria-disabled="true"]') || button.closest('article, [role="tablist"], [role="dialog"], [contenteditable="true"]')) return false;
    if (firstArticle && !(button.compareDocumentPosition(firstArticle) & 4)) return false;
    return bannerText.test((button.getAttribute('aria-label') || button.textContent).trim().replace(/\s+/g, ' '));
  }) ?? null;
}
export function canClick(element) {
  return available(element) && !element.matches(':disabled, [aria-disabled="true"]');
}
export function clickTarget(element) {
  if (!canClick(element)) return false;
  element.click();
  return true;
}
