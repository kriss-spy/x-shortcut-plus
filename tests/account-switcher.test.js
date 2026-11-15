import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { ACCOUNT_RETURN_KEY, createAccountSwitcher } from '../src/account-switcher.js';

const list = handles => `<div role="menu"><div data-testid="AccountSwitcher_LoggedInAccountList">${handles.map(handle => `<div role="button" data-testid="UserCell"><span>@${handle}</span></div>`).join('')}</div><button id="logout">Log out</button></div>`;
function setup(t, url = 'https://x.com/writer/status/123?ref=feed#reply') {
  const dom = new JSDOM('<a data-testid="AppTabBar_Profile_Link" href="/alice">Profile</a><button data-testid="SideNav_AccountSwitcher_Button">Accounts</button><main></main>', { url, pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;
  window.HTMLElement.prototype.getClientRects = () => [{ width: 100, height: 30 }];
  const navigations = [];
  const switcher = createAccountSwitcher(window, url => navigations.push(url));
  const clicks = [];
  document.addEventListener('click', event => {
    if (event.target.closest('[data-testid="SideNav_AccountSwitcher_Button"]')) document.querySelector('main').innerHTML = list(['alice', 'bob', 'carol']);
    const cell = event.target.closest('[data-testid="UserCell"]');
    if (cell) clicks.push(cell.textContent);
  });
  t.after(() => { switcher.stop(); window.close(); });
  const stored = () => JSON.parse(window.sessionStorage.getItem(ACCOUNT_RETURN_KEY));
  return { switcher, window, document, clicks, navigations, stored };
}
const tick = ms => new Promise(resolve => setTimeout(resolve, ms));

test('next account selects only a signed-in account and stores the exact return URL (#3)', t => {
  const env = setup(t);
  env.switcher.begin('alice', null)();
  assert.deepEqual(env.clicks, ['@bob']);
  assert.equal(env.stored().url, '/writer/status/123?ref=feed#reply');
  assert.equal(env.stored().target, 'bob');
  assert.equal(env.stored().source, 'alice');
});

test('return survives controller replacement and restores once after account identity changes (#3)', t => {
  const env = setup(t);
  env.switcher.begin('alice', null)();
  env.document.querySelector('main').replaceChildren();
  env.window.history.replaceState({}, '', '/home');
  env.switcher.stop();
  const restored = createAccountSwitcher(env.window, url => env.navigations.push(url));
  t.after(() => restored.stop());
  restored.restore(null);
  assert.deepEqual(env.navigations, []);
  env.document.querySelector('a').href = '/bob';
  restored.restore(null);
  assert.deepEqual(env.navigations, ['/writer/status/123?ref=feed#reply']);
  restored.restore(null);
  assert.equal(env.navigations.length, 1);
  assert.equal(env.stored().redirected, true);
  env.window.history.replaceState({}, '', '/writer/status/123?ref=feed#reply');
  restored.restore(null);
  assert.equal(env.stored(), null);
});

test('Home feed selection restores by stable list identity after reordering (#3)', t => {
  const env = setup(t, 'https://x.com/home');
  const makeFeed = (id, selected = false) => {
    const element = env.document.createElement('button');
    element.setAttribute('aria-selected', String(selected));
    element.addEventListener('click', () => env.clicks.push(id));
    env.document.body.append(element);
    return { id, list: /^\d+$/.test(id), element };
  };
  const forYou = makeFeed('forYou'); const following = makeFeed('following');
  const list11 = makeFeed('11', true); const list22 = makeFeed('22');
  env.switcher.begin('alice', { feeds: [forYou, following, list11, list22] })();
  env.document.querySelector('main').replaceChildren();
  env.document.querySelector('a').href = '/bob';
  env.switcher.restore({ feeds: [forYou, following, list22, list11] });
  assert.deepEqual(env.clicks, ['@bob', '11']);
  assert.equal(env.stored(), null);
});

test('unrelated account changes and navigation discard a pending return (#3)', t => {
  for (const scenario of ['account', 'navigation']) {
    const env = setup(t);
    env.switcher.begin('alice', null)();
    env.document.querySelector('main').replaceChildren();
    env.document.querySelector('a').href = scenario === 'account' ? '/carol' : '/bob';
    env.window.history.replaceState({}, '', scenario === 'account' ? '/home' : '/notifications');
    env.switcher.restore(null);
    assert.deepEqual(env.navigations, []);
    assert.equal(env.stored(), null);
  }
});

test('expired, malformed, and external return URLs are never followed (#3)', t => {
  const env = setup(t);
  for (const change of [{ url: '//evil.test/path' }, { url: 'https://evil.test' }, { expires: Date.now() - 1 }, { expires: 'tomorrow' }, { target: 'bad/handle' }, { feed: 1.5 }]) {
    env.window.sessionStorage.setItem(ACCOUNT_RETURN_KEY, JSON.stringify({ url: '/writer/status/123', target: 'bob', source: 'alice', expires: Date.now() + 10000, feed: -1, ...change }));
    env.switcher.restore(null);
    assert.equal(env.stored(), null);
    assert.deepEqual(env.navigations, []);
  }
});

test('delayed menu rendering can be canceled without switching (#3)', async t => {
  const env = setup(t);
  env.document.addEventListener('click', event => {
    if (event.target.matches('[data-testid="SideNav_AccountSwitcher_Button"]')) env.document.querySelector('main').replaceChildren();
  });
  env.switcher.begin('alice', null)();
  env.switcher.cancel();
  env.document.querySelector('main').innerHTML = list(['alice', 'bob']);
  await tick(80);
  assert.deepEqual(env.clicks, []);
  assert.equal(env.stored(), null);
});

test('one account or missing controls never trigger an account change (#3)', t => {
  const env = setup(t);
  const opener = env.document.querySelector('button');
  opener.remove();
  assert.equal(env.switcher.begin('alice', null), false);
  env.document.body.append(opener);
  env.document.addEventListener('click', event => {
    if (event.target === opener) env.document.querySelector('main').innerHTML = list(['alice']);
  });
  env.switcher.begin('alice', null)();
  assert.deepEqual(env.clicks, []);
  assert.equal(env.stored(), null);
});

test('blocked session storage prevents switching without a return record (#3)', t => {
  const env = setup(t);
  env.window.Storage.prototype.setItem = () => { throw new Error('disabled'); };
  env.switcher.begin('alice', null)();
  assert.deepEqual(env.clicks, []);
});

test('a delayed account menu chooses the next account and wraps (#3)', async t => {
  const env = setup(t);
  env.document.querySelector('a').href = '/carol';
  env.document.addEventListener('click', event => {
    if (event.target.matches('[data-testid="SideNav_AccountSwitcher_Button"]')) {
      env.document.querySelector('main').replaceChildren();
      env.window.setTimeout(() => { env.document.querySelector('main').innerHTML = list(['alice', 'bob', 'carol']); }, 10);
    }
  });
  env.switcher.begin('carol', null)();
  await tick(80);
  assert.deepEqual(env.clicks, ['@alice']);
  assert.equal(env.stored().target, 'alice');
});

// Minimized from the user's supplied live button on 2026-11-15.
const capturedSwitchButton = `<button aria-label="Switch to @projectarisu" role="button" data-testid="UserCell" type="button"><div data-testid="UserAvatar-Container-projectarisu"><div aria-hidden="true" role="presentation" tabindex="-1"><img alt=""></div></div><div dir="ltr"><span>Millennium Robotics Lab</span></div><div dir="ltr"><span>@projectarisu</span></div></button>`;

test('captured account button switches without the assumed container or current account row', t => {
  const env = setup(t);
  env.document.addEventListener('click', event => {
    if (event.target.matches('[data-testid="SideNav_AccountSwitcher_Button"]')) {
      env.document.querySelector('main').innerHTML = capturedSwitchButton;
    }
  });
  env.switcher.begin('alice', null)();
  assert.equal(env.clicks.length, 1);
  assert.equal(env.stored().target, 'projectarisu');
  assert.equal(env.stored().url, '/writer/status/123?ref=feed#reply');
});

test('captured switch control works inside a dialog without selecting unrelated UserCells', t => {
  const env = setup(t);
  env.document.body.insertAdjacentHTML('beforeend', '<button data-testid="UserCell"><span>@suggestion</span></button>');
  env.document.addEventListener('click', event => {
    if (event.target.matches('[data-testid="SideNav_AccountSwitcher_Button"]')) {
      env.document.querySelector('main').innerHTML = `<div role="dialog">${capturedSwitchButton}</div>`;
    }
  });
  env.switcher.begin('alice', null)();
  assert.equal(env.clicks.length, 1);
  assert.equal(env.stored().target, 'projectarisu');
});

test('mismatched captured account identity never triggers a switch', t => {
  const env = setup(t);
  env.document.addEventListener('click', event => {
    if (event.target.matches('[data-testid="SideNav_AccountSwitcher_Button"]')) {
      env.document.querySelector('main').innerHTML = capturedSwitchButton.replace('Switch to @projectarisu', 'Switch to @other');
    }
  });
  env.switcher.begin('alice', null)();
  assert.deepEqual(env.clicks, []);
  assert.equal(env.stored(), null);
});

test('another dialog blocks selecting the captured account control', t => {
  const env = setup(t);
  env.document.addEventListener('click', event => {
    if (event.target.matches('[data-testid="SideNav_AccountSwitcher_Button"]')) {
      env.document.querySelector('main').innerHTML = `${capturedSwitchButton}<div role="dialog">Another action</div>`;
    }
  });
  env.switcher.begin('alice', null)();
  assert.deepEqual(env.clicks, []);
  assert.equal(env.stored(), null);
});

test('captured alternative accounts follow displayed order and exclude the current account', t => {
  const env = setup(t);
  env.document.addEventListener('click', event => {
    if (event.target.matches('[data-testid="SideNav_AccountSwitcher_Button"]')) {
      env.document.querySelector('main').innerHTML = capturedSwitchButton.replaceAll('projectarisu', 'alice') + capturedSwitchButton + capturedSwitchButton.replaceAll('projectarisu', 'carol');
    }
  });
  env.switcher.begin('alice', null)();
  assert.equal(env.clicks.length, 1);
  assert.equal(env.stored().target, 'projectarisu');
});

test('reply account return retains the post identity and restores its background before the composer', t => {
  const env = setup(t, 'https://x.com/compose/post');
  env.window.history.replaceState({ key: 'reply', state: { inReplyToStatusId: '123', isSelfThreadReply: false, fromApp: true, previousPath: '/writer/status/123' } }, '', '/compose/post');
  env.switcher.begin('alice', null, true)();
  assert.deepEqual(env.stored().reply, { postId: '123', backgroundURL: '/writer/status/123', isSelfThreadReply: false });
  env.document.querySelector('main').replaceChildren();
  env.document.querySelector('a').href = '/bob';
  env.window.history.replaceState({}, '', '/home');
  env.switcher.restore(null);
  assert.deepEqual(env.navigations, ['/writer/status/123']);
});
