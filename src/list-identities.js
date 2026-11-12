// The MAIN-world reader only publishes numeric IDs already present on X's
// rendered Home tabs. It has no extension API, storage, or network access.
export const LIST_ID_ATTRIBUTE = 'data-xsp-list-id';
export const REFRESH_IDENTITIES_EVENT = 'xsp:refresh-list-identities';
const numericId = /^[1-9]\d{0,29}$/;

export function reactListId(tab) {
  const property = Object.keys(tab).find(key => key.startsWith('__reactFiber$'));
  let fiber = property && tab[property];
  const ids = new Set();
  for (let depth = 0; fiber && depth < 12; depth++, fiber = fiber.return) {
    if (typeof fiber.key !== 'string') continue;
    const match = /^List:([1-9]\d{0,29})$/.exec(fiber.key);
    if (match) ids.add(match[1]);
  }
  return ids.size === 1 ? [...ids][0] : null;
}

export function startIdentityBridge(window) {
  const document = window.document;
  function refresh() {
    const tabs = new Set();
    if (/^\/home\/?$/.test(window.location.pathname)) {
      const column = document.querySelector('[data-testid="primaryColumn"]');
      const bar = column?.querySelector('[role="tablist"]');
      if (bar && !bar.closest('article, [role="dialog"]')) {
        for (const tab of bar.querySelectorAll('[role="tab"]')) tabs.add(tab);
      }
    }
    // Clear stale values when React recycles a node or changes a tab's key.
    for (const tab of document.querySelectorAll(`[${LIST_ID_ATTRIBUTE}]`)) {
      if (!tabs.has(tab)) tab.removeAttribute(LIST_ID_ATTRIBUTE);
    }
    for (const tab of tabs) {
      let id = null;
      try { id = reactListId(tab); } catch { /* Unknown React shape: leave unbound. */ }
      if (id && numericId.test(id)) {
        if (tab.getAttribute(LIST_ID_ATTRIBUTE) !== id) tab.setAttribute(LIST_ID_ATTRIBUTE, id);
      } else tab.removeAttribute(LIST_ID_ATTRIBUTE);
    }
  }
  const observer = new window.MutationObserver(refresh);
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['role', 'aria-selected', 'href'] });
  // A synchronous request lets the isolated script refresh keys before each
  // action, even if React updated its objects without changing the DOM.
  document.addEventListener(REFRESH_IDENTITIES_EVENT, refresh);
  refresh();
  return { refresh, stop() { observer.disconnect(); document.removeEventListener(REFRESH_IDENTITIES_EVENT, refresh); } };
}
