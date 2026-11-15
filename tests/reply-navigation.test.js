import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startReplyNavigationBridge, reopenReply, replyContext, validReplyContext } from '../src/reply-navigation.js';
import { createAccountSwitcher, ACCOUNT_RETURN_KEY } from '../src/account-switcher.js';

const context = { postId: '2121861256151994453', backgroundURL: '/Kabocya_Na/status/2121861256151994453', isSelfThreadReply: false };
function setup(t) {
  const dom = new JSDOM(`<a data-testid="AppTabBar_Profile_Link" href="/bob">Profile</a><main data-testid="primaryColumn"><article><a href="${context.backgroundURL}"><time>Today</time></a></article></main>`, { url: `https://x.com${context.backgroundURL}`, pretendToBeVisual: true });
  const { window } = dom;
  window.HTMLElement.prototype.getClientRects = () => [{ width: 100, height: 30 }];
  const calls = [];
  const router = {
    get location() { return window.location; },
    getLastNonModalLocationPath() { return context.backgroundURL; },
    push(path, state) {
      calls.push({ path, state });
      window.history.pushState({ key: 'restored', state }, '', path);
      window.document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><article data-testid="tweet"></article><div role="textbox" contenteditable="true"></div></div>');
    },
  };
  window.document.querySelector('a').__reactFiber$fixture = { memoizedProps: {}, return: { memoizedProps: { history: router }, return: null } };
  const bridge = startReplyNavigationBridge(window);
  t.after(() => { bridge.stop(); window.close(); });
  return { window, calls };
}

test('reply navigation reopens the same target while retaining the background post', t => {
  const { window, calls } = setup(t);
  assert.equal(reopenReply(window, context), true);
  assert.equal(window.location.pathname, '/compose/post');
  assert.deepEqual(replyContext(window), context);
  assert.equal(calls.length, 1);
  assert.equal(window.document.querySelector('main article a').getAttribute('href'), context.backgroundURL);
  assert.ok(window.document.querySelector('[role="dialog"] [data-testid="tweet"]'));
  assert.equal(window.document.documentElement.hasAttribute('data-xsp-reply-context'), false);
});

test('reply navigation rejects external backgrounds, invalid IDs, and mismatched routes', t => {
  const { window, calls } = setup(t);
  for (const change of [{ postId: '0' }, { postId: 123 }, { postId: '<script>' }, { backgroundURL: '//evil.test/' }, { backgroundURL: 'https://evil.test/' }, { backgroundURL: '/compose/post' }, { isSelfThreadReply: 'yes' }]) {
    assert.equal(validReplyContext({ ...context, ...change }, window.location.origin), false);
    assert.equal(reopenReply(window, { ...context, ...change }), false);
  }
  assert.equal(reopenReply(window, { ...context, backgroundURL: '/home' }), false);
  assert.deepEqual(calls, []);
});

test('missing X router leaves the background post open instead of creating a blank composer', t => {
  const { window, calls } = setup(t);
  delete window.document.querySelector('a').__reactFiber$fixture;
  assert.equal(reopenReply(window, context), false);
  assert.equal(window.location.pathname, context.backgroundURL);
  assert.deepEqual(calls, []);
});

test('reply account restoration survives reload and restores target, background, and composer', t => {
  const { window, calls } = setup(t);
  const record = { source: 'alice', target: 'bob', url: '/compose/post', feed: -1, reply: context, expires: Date.now() + 30000 };
  window.sessionStorage.setItem(ACCOUNT_RETURN_KEY, JSON.stringify(record));
  window.history.replaceState({}, '', '/home');
  const navigations = [];
  let switcher = createAccountSwitcher(window, url => navigations.push(url));
  switcher.restore(null);
  assert.deepEqual(navigations, [context.backgroundURL]);
  assert.deepEqual(calls, []);
  switcher.stop();
  // The original reply record survives a new content-script instance.
  window.history.replaceState({}, '', context.backgroundURL);
  switcher = createAccountSwitcher(window);
  t.after(() => switcher.stop());
  switcher.restore(null);
  assert.deepEqual(replyContext(window), context);
  assert.equal(window.location.pathname, '/compose/post');
  assert.ok(window.document.querySelector(`main article a[href="${context.backgroundURL}"]`));
  assert.ok(window.document.querySelector('[role="dialog"] [data-testid="tweet"]'));
  assert.equal(window.sessionStorage.getItem(ACCOUNT_RETURN_KEY), null);
  assert.equal(calls.length, 1);
  switcher.restore(null);
  assert.equal(calls.length, 1);
});

test('malformed saved reply context cannot redirect restoration', t => {
  const { window, calls } = setup(t);
  window.sessionStorage.setItem(ACCOUNT_RETURN_KEY, JSON.stringify({ source: 'alice', target: 'bob', url: '/compose/post', feed: -1,
    reply: { ...context, backgroundURL: '//evil.test' }, expires: Date.now() + 10000 }));
  const switcher = createAccountSwitcher(window);
  t.after(() => switcher.stop());
  switcher.restore(null);
  assert.equal(window.sessionStorage.getItem(ACCOUNT_RETURN_KEY), null);
  assert.deepEqual(calls, []);
});
