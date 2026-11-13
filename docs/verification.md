# Verification record

Date: 2026-11-10. Scope: v1 local implementation.

## Automated checks

`npm test` builds the unpacked extension and runs 22 Node.js tests with jsdom. All 22 passed.

The tests cover:

- Direct For you, Following, and separate pinned-list bindings.
- List identity after reordering and renaming.
- Displayed next/previous order and wraparound in both directions.
- Returning through Home from other routes, including discovery after controller restart.
- Rechecking fresh order when a list route has no Home tabs.
- Top-and-new-posts with a banner, without one, and with delayed rendering.
- Excluding post buttons, hidden controls, unrelated tabs, and disabled targets.
- Canceling delayed banner activation after route changes, blur, or composition.
- Live binding changes, cleared bindings, duplicate suppression, and controller restart persistence.
- Separate account discovery and rejection of old tabs during an account switch.
- Native shortcut and sequence pass-through.
- Typing, open shadow editors, dialogs, menus, media, repeats, AltGraph, and synthetic IME events.
- Settings assignment, replacement, clearing, native warnings, and account-scoped duplicate warnings.
- Storage read/write failures and safe rendering of list labels.

These are DOM fixtures. They do not establish compatibility with authenticated X's current markup.

## Packaged Chromium checks

A temporary visible Chromium profile loaded `dist` as an unpacked Manifest V3 extension. Playwright routed the fixture origin `https://x.com` to local HTML. No server was started and no live account was used.

The check ran with:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp.cjs
```

The temporary script remains available locally. It uses the installed Playwright skill's browser. The temporary profile was closed and removed after the run.

Observed passes:

- Chrome loaded the manifest, service worker, options page, and isolated content script.
- Content-script discovery populated settings with the account and two lists.
- Real keyboard input switched directly between Home feeds and wrapped at both ends.
- Settings changes applied to an already open X fixture tab and persisted into a new tab.
- A list shortcut retained its target after reordering.
- Next from a tabless list route returned through Home and used the fresh order.
- Changing accounts did not save the old lists under the new account or reuse the old account's binding.
- Top-and-new-posts scrolled and activated the banner once. Without a banner it only scrolled.
- The document's random token stayed unchanged during top-and-new-posts, confirming no document reload in the fixture.
- Typing, focused video, and a dialog preserved keyboard input. Unhandled native keys reached the page listener.
- Native conflict warnings, duplicate suppression, clearing, and options-page reload persistence worked.
- Settings fit a 390-pixel viewport without horizontal overflow. Desktop and mobile screenshots were visually inspected.
- No page JavaScript errors were reported.

## Live X access and unrun checks

The shared default browser profile opened `https://x.com/home`. X redirected to `https://x.com/` and displayed its sign-in form. The check tab was then closed.

The supplied feed/banner screenshot was inspected as a visual reference. It does not expose DOM attributes or verify runtime behavior.

The following remain unverified:

- Authenticated X feed tab selectors, list discovery, and real SPA transitions.
- Actual X new-post banner markup and its effect on timeline data.
- Authenticated X native shortcut precedence, dialog variants, media selection, and account switching.
- Real operating system IME sessions, keyboard layouts, macOS, and interactions with other extensions.
- Banner wording outside the explicit patterns in `src/dom.js`.

The runtime DOM adapter uses semantic roles, Home/list URLs, and specific X test IDs. These assumptions require a signed-in check. If X changes or omits them, actions stop or only scroll, depending on the action. The original README, agreed scope, and research files were preserved.

## 2026-11-12: non-link Home tab regression

The user supplied live Home tab markup. It contains `div[role="tab"]` inside presentation wrappers, with no `href`. Selecting a pinned list leaves the URL at `/home` without a query string. The original adapter required `/home` anchors, so it returned no feed targets. The original fixtures incorrectly used anchors for every feed.

Before the fix, this command reproduced both the default shortcut failure and the reported `Ctrl+Alt+1` failure:

```sh
node --test --test-name-pattern='captured X div tabs|unknown list identities|div tab support' tests/controller.test.js
```

Observed before the fix: four failures and one pass. After the fix, `npm test` passed all 27 checks.

The adapter now recognizes non-link tabs in Home's first header tablist. Next and previous click every displayed tab, including pinned tabs with no confirmed list ID. Unknown identities are never persisted by name or position. Incomplete discovery does not erase previously saved list identities.

The built extension also passed visible Chromium checks using the captured tab structure. The temporary script was `/tmp/playwright-test-xsp-div-tabs.cjs`, executed through the Playwright skill runner. Checks covered default direct bindings, a real `Ctrl+Alt+1` binding recorded in settings, cycling and wraparound while staying on `/home`, typing guards, and the banner action without reload.

This verifies the adapter against captured markup and real Chromium keyboard events. The revised build has not yet been verified in the user's authenticated X tab. Stable identity for the non-link pinned tabs still requires further evidence; their DOM attributes and URL do not expose a list ID.


## 2026-11-12: list identities from captured React keys, build 1.0.2

The user's next probe confirmed `home`, `home_latest`, and `List:<numeric ID>` keys on the tab ancestry. Numeric position keys such as `2` are separate and are not identities. This supplies the identity evidence missing from build 1.0.1.

The extension now includes a minimal `MAIN`-world reader for these keys. It publishes only validated numeric list IDs. The isolated script reads them through DOM attributes. A synchronous event refreshes the IDs before each discovery/action. No additional permission or network access was added.

Three integration regressions failed before connecting the reader to discovery: separate list bindings, retention after reorder/rename, and stale-ID rejection after React-only updates. They now pass. `npm test` passes all 33 checks, including rejection of malformed or ambiguous keys, route cleanup, and account separation.

The packaged build passed visible Chromium checks with the captured DOM and React-key structure. Command:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp-list-identity.cjs
```

Observed passes:

- Default direct bindings and the user-selected `Ctrl+Alt+1` binding.
- Displayed cycling order and wraparound with pinned selections remaining on `/home`.
- Actual `MAIN` to isolated-world identity publication and list discovery in settings.
- Separate pinned-list bindings after both reorder and rename.
- Immediate rejection of the old binding after a React-only identity change with no DOM mutation.
- List binding persistence after reloading the options page.
- Typing protection, banner activation without reload, and no page JavaScript errors.

The test uses locally fulfilled HTML and starts no server. The reader's input structure comes from the user's authenticated page capture. A live check of build 1.0.2 in that authenticated tab remains unrun. Real IME, operating system shortcuts, other extensions, X's banner behavior, and native event precedence retain the live limitations listed above.

## Beta release confirmation

After receiving build 1.0.2 and reload instructions, the initial tester reported “worked” and requested a beta release. This confirms successful use in the tester's environment. The message did not enumerate every action or guard, so the remaining case-specific live checks above are not all marked verified.

Beta 1.0.3-beta.1 retains that implementation and adds release metadata, documentation, and ZIP packaging. `npm test` passed all 33 checks. Packaging checked each generated JavaScript file with `node --check`, verified required manifest files, tested ZIP integrity, and generated a SHA-256 checksum. Release bundles exclude source maps.

## 2026-11-13: tester-approved defaults, build 1.0.4-beta.1

The tester requested these shipped defaults: For you `Alt+Shift+1`, Following `Alt+Shift+2`, next `Alt+Shift+n`, previous `Alt+Shift+p`, and top/new posts `Alt+Shift+k`. The default map and current release documentation now use those bindings. Stored overrides and explicit null (cleared) values remain authoritative; no settings migration overwrites them.

`npm test` passed all 33 checks. The existing controller tests now send uppercase shifted letter events with `KeyN`, `KeyP`, and `KeyK` codes, matching how the approved combinations arrive in the browser.

A visible Chromium check loaded the packaged extension and passed fresh-install display of all five bindings, real Shift+N/P navigation and wraparound, Shift+K with and without the banner, typing protection, and saved/cleared binding precedence after options reload. The local fixture was fulfilled from memory, with no server or live X requests. Command:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp-new-defaults.cjs
```

`npm run package` checked generated JavaScript syntax, verified manifest entries, tested ZIP integrity, and wrote a SHA-256 checksum. The existing live-test limits remain applicable; this change did not repeat authenticated X testing.
