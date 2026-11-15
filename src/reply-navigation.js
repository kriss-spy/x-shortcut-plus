// X stores reply identity separately from the shared /compose/post URL.
const REQUEST = 'xsp:open-reply';
const CONTEXT = 'data-xsp-reply-context';
const RESULT = 'data-xsp-reply-opened';

export function validReplyContext(value, origin) {
  if (!value || typeof value.postId !== 'string' || !/^[1-9]\d{0,29}$/.test(value.postId ?? '')
    || typeof value.backgroundURL !== 'string' || value.backgroundURL.length > 2048
    || !/^\/(?!\/)/.test(value.backgroundURL) || typeof value.isSelfThreadReply !== 'boolean') return false;
  try {
    const url = new URL(value.backgroundURL, origin);
    return url.origin === origin && !/^\/compose\//.test(url.pathname);
  } catch { return false; }
}

export function replyContext(window) {
  if (window.location.pathname !== '/compose/post') return null;
  const state = window.history.state?.state;
  const value = { postId: state?.inReplyToStatusId, backgroundURL: state?.previousPath, isSelfThreadReply: state?.isSelfThreadReply === true };
  return validReplyContext(value, window.location.origin) ? value : null;
}

export function reopenReply(window, context) {
  const root = window.document.documentElement;
  if (!root || !validReplyContext(context, window.location.origin)) return false;
  root.setAttribute(CONTEXT, JSON.stringify(context));
  root.removeAttribute(RESULT);
  try {
    window.document.dispatchEvent(new window.Event(REQUEST));
    return root.getAttribute(RESULT) === 'true';
  } finally { root.removeAttribute(CONTEXT); root.removeAttribute(RESULT); }
}

// Runs in MAIN, using the same X router object observed on profile ancestry.
// It only opens a reply. It never submits text or calls an X API.
export function startReplyNavigationBridge(window) {
  const document = window.document;
  function open() {
    const root = document.documentElement;
    let context;
    try { context = JSON.parse(root?.getAttribute(CONTEXT)); } catch { return; }
    if (!validReplyContext(context, window.location.origin)
      || window.location.pathname + window.location.search + window.location.hash !== context.backgroundURL) return;
    const element = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
    const key = element && Object.keys(element).find(name => name.startsWith('__reactFiber$'));
    let fiber = key && element[key];
    for (let depth = 0; fiber && depth < 100; depth++, fiber = fiber.return) {
      const router = fiber.memoizedProps?.history;
      if (typeof router?.push !== 'function' || typeof router.getLastNonModalLocationPath !== 'function'
        || router.location?.pathname !== window.location.pathname) continue;
      try {
        router.push('/compose/post', { inReplyToStatusId: context.postId, isSelfThreadReply: context.isSelfThreadReply,
          fromApp: true, previousPath: context.backgroundURL });
        if (replyContext(window)?.postId === context.postId) root.setAttribute(RESULT, 'true');
      } catch { /* X changed its router: keep the original post open. */ }
      return;
    }
  }
  document.addEventListener(REQUEST, open);
  return { stop() { document.removeEventListener(REQUEST, open); } };
}
