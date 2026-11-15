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

## 2026-11-13: Ctrl+Alt defaults, build 1.0.5-beta.1

The tester replaced the Alt+Shift defaults with Ctrl+Alt+1, Ctrl+Alt+2, Ctrl+Alt+n, Ctrl+Alt+p, and Ctrl+Alt+k. All five defaults and current release documentation now match that request. No saved custom binding or explicit clear is migrated or overwritten.

All 33 automated checks passed. The controller input helper now derives Ctrl, Alt, Shift, and Meta flags from the configured default. Typing/composition fixtures exercise Ctrl+Alt+2. Options tests continue to verify account-scoped duplicate handling while allowing the expected general Ctrl warning on the global defaults.

The release build passed visible Chromium checks using real Ctrl+Alt key events: fresh-install settings displayed all five defaults, direct feeds and cycling worked with wraparound, the top action handled both banner states without reload, typing was protected, and saved/cleared overrides remained effective after reload. Command:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp-ctrl-alt.cjs
```

ZIP integrity and generated JavaScript syntax checks passed. The fixture uses locally fulfilled HTML; the existing authenticated X, operating system, and real IME testing limits remain unchanged. The general browser/system warning is retained and does not assert that a specific Ctrl+Alt combination conflicts.

## 2026-11-13: Chrome Web Store assets, build 1.0.6-beta.1

Prepared an original SVG feed-and-arrow icon and transparent PNG exports at 16, 32, 48, 128, and 512 pixels. The manifest declares extension and toolbar icons. The 128-pixel icon uses a 96-pixel square mark with transparent padding, matching Google's image guidance. No third-party logo is used.

Captured both settings sections from the actual packaged extension in a temporary visible Chromium profile. The profile contains only example account/list data seeded for these captures. Two 1280×800 screenshots frame those captures with explanatory copy. A 440×280 promo tile and 1400×560 marquee image use the same original icon and product typography. All four final graphics and the master icon were visually inspected.

`npm test` passed all 33 checks after adding icon copying to the build. The capture itself confirms Chrome can load the icon-inclusive manifest and options page. `npm run package` validates manifest paths, JavaScript syntax, and ZIP integrity. `npm run package:store-assets` checks all exported PNG dimensions, RGBA icon formats, and asset-pack ZIP integrity; both packages include SHA-256 checksums.

The privacy policy and dashboard copy describe actual local account/list metadata handling, keyboard-event matching, storage retention, and absence of extension-operated analytics or network transmission. The public privacy URL points to `PRIVACY.md` in the repository. Store screenshots label their example data and contain no live X posts, credentials, or actual account data.

This task prepared upload assets and a store-ready package. No Chrome Web Store upload, legal agreement, review submission, or approval occurred. Google still reviews the submitted product and declarations.

References checked for asset preparation: https://developer.chrome.com/docs/webstore/cws-dashboard-listing, https://developer.chrome.com/docs/webstore/images, and https://developer.chrome.com/docs/webstore/program-policies/user-data-faq.

## 2026-11-13: clean store screenshot previews

At the tester's request, yellow warning rows are hidden only in the temporary screenshot-capture page. Production CSS, warnings, shortcut behavior, and the extension upload ZIP are unchanged. Raw captures with warnings are retained in `store-assets/source/*-raw.png` for provenance.

Regenerated both 1280×800 screenshot previews and visually checked them. The image-dimension and asset-ZIP integrity checks passed. The store asset pack and its checksum were refreshed without changing the extension version or package.

## 2026-11-15: issue fixes, candidate 1.1.0-beta.1

Reviewed all five open issues, their bodies, and the screenshots attached to #1 and #5. The screenshots show repeated generic cautions and a selected timeline post. They do not expose account-menu selectors or establish post-focus behavior.

The warning regression failed before the change:

```sh
node --test --test-name-pattern='default shortcuts do not' tests/controller.test.js
```

Observed failure: `Ctrl+Alt+1` returned the generic browser warning instead of `null`. The rule flagged every Ctrl binding. The revised rule does not flag Ctrl+Alt defaults. Native and duplicate warnings remain.

Added regression checks for feed positions, optional top/new-posts behavior, focused and detail-page authors, and account restoration. `npm test` passes 52 tests. Account checks include delayed rendering, wraparound, cancellation, source/target identity, exact URL retention, feed identity after reordering, storage failure, expiry, malformed records, and external URLs. An integration check found that stale-feed quarantine prevented clearing a completed return record. Restoration now runs without reusing the quarantined feeds.

Visible Chromium fixture command:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp-next.cjs
```

Observed passes:

- Real `Ctrl+Alt+3` selects the current third tab after reordering, without stable list IDs.
- Native `.` reaches the page listener, and typing prevents feed navigation.
- `Ctrl+Alt+u` opens the focused author profile.
- `Ctrl+Alt+a` selects the next signed-in fixture account and survives a full document reload.
- The original post URL, query, and fragment return after X’s simulated Home redirect.
- Default settings show no repeated warning rows and leave top/new-posts unassigned.
- A new position binding persists after settings reload.
- Settings fit a 390-pixel viewport. No page JavaScript errors occur.

The temporary browser profile was closed and removed. The fixture intercepted X requests locally and used no live account. No server was started.

`npm run package` verifies generated JavaScript syntax, required files, ZIP integrity, and SHA-256 output for this candidate. No store upload occurred.

Authenticated X remains untested for the new account-menu selectors and author-focus assumptions. These checks do not verify current X behavior, real IME input, operating system shortcuts, or other extensions. Issues #1–5 remain open for live acceptance.

## Account control captured from live X, candidate 1.1.1-beta.1

The tester reported that the account shortcut opened the panel without switching. They supplied the opener and an alternative-account button. The latter is `button[data-testid="UserCell"]`, labeled `Switch to @projectarisu`, with a matching `UserAvatar-Container-projectarisu` descendant.

A minimized regression using those attributes, without the assumed named container or current-account row, failed:

```sh
node --test --test-name-pattern='captured account button' tests/account-switcher.test.js
```

Observed before the fix: zero account clicks instead of one. The old adapter could not discover the supplied standalone control. Selection also required a current-account row, which the new explicit destination does not need.

The revised adapter validates the explicit switch label against the avatar identity. It selects the first displayed alternative when the current account is absent. It preserves support for the previous named-list form and does not select unrelated user cells. `npm test` passes 57 checks.

Visible Chromium command:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp-account-capture.cjs
```

The fixture uses the captured control structure without the assumed container or current-account row. Real keyboard input selected the alternative account, reloaded the document through Home, and restored the original post URL, query, and fragment. Other feed, author, typing, native-period, settings persistence, narrow-layout, and page-error checks passed. The temporary profile was closed and removed.

Packaging checks passed for `release/x-shortcut-plus-1.1.1-beta.1.zip`. These are captured-markup fixture checks. Live X account switching remains unverified. No store upload occurred.

## Account-panel focus transfer, candidate 1.1.2-beta.1

The tester reported needing two account-shortcut presses. A new controller regression focused a post, then moved focus into the account panel while opening it. Before the fix, `node --test --test-name-pattern='one account shortcut survives focus' tests/controller.test.js` failed with zero account clicks instead of one.

The capture-phase window blur listener also received descendant element blur events. The listener canceled the pending account action during focus transfer. Restricting cancellation to `event.target === window` makes the regression pass. A separate check confirms that actual window blur still cancels a pending switch. All 59 automated checks pass.

The visible Chromium fixture `/tmp/playwright-test-xsp-account-focus.cjs`, run through the Playwright skill runner, also moved focus from a post into the opening panel. One real `Ctrl+Alt+a` selected the alternative account, reloaded through Home, and restored the exact URL. Other keyboard, settings, layout, and page-error checks passed. Packaging and diff checks passed. Live X confirmation remains pending.

## Media and reply-composer account switching, candidate 1.1.3-beta.1

The tester reported that account switching stopped on photo routes and `/compose/post`. Live inspection of the supplied photo page confirmed modal dialogs and an `aria-hidden` background sidebar containing the profile link and account-menu button. Clicking that button programmatically opened a usable account panel while the media view remained open.

`node --test --test-name-pattern='account shortcut switches from protected' tests/controller.test.js` reproduced two failures before the change. The revised controller resolves the action before applying dialog guards. Only modified account shortcuts on photo/video and composer routes receive the exception. The account adapter can use the `aria-hidden` sidebar and permits the dialogs present when the action begins. Other shortcuts retain their guards. Ordinary unmodified keys and input-method composition remain protected. All 63 automated checks pass.

Visible Chromium command:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp-account-overlays.cjs
```

Both modal-route checks passed with a focused fixture editor and hidden sidebar. One real key combination selected an account, reloaded through Home, and restored the original URL. Existing keyboard, settings, layout, and page-error checks passed.

After installation, live Chrome checks also passed in a separate test tab. On `/Kabocya_Na/status/2121861256151994453/photo/1`, one `Ctrl+Alt+a` switched from `projectarisu` to `krisspy39` and restored the exact photo route. The test then opened an empty `/compose/post` view. One press switched back to `projectarisu` and restored the composer route. Both return records cleared. The original account was active at the end, and temporary tabs were closed.

The installed extension retained its ID and Chrome reported `1.1.3-beta.1`. Existing X tabs had no draft text and were reloaded. Draft checks returned only whether an editor was empty; no draft content was captured or copied. No post or message was sent. The live media check covered a photo; video routes are covered by the shared route rule but were not separately checked live. Draft text is not transferred across accounts.

## Reply target and background restoration, candidate 1.1.4-beta.1

The tester supplied before/after screenshots showing a reply composer over a specific post becoming a blank new-post composer over Home after an account switch. Both views use `/compose/post`, so the previous URL-only acceptance check missed the loss of reply state.

Live inspection found `history.state.state.inReplyToStatusId`, `isSelfThreadReply`, `fromApp`, and `previousPath` on a reply opened through X’s native `r` shortcut. The reply preview itself has no status permalink. Replaying browser history state restored the reply target but still left a Home background. Calling the existing X in-app router’s `push` method restored both target and background. That router was observed in `memoizedProps.history` on the profile link’s React ancestry.

The new regression `node --test --test-name-pattern='reply account return retains' tests/account-switcher.test.js` failed before the change because the saved return record contained no reply context. The revised account action stores only the numeric post ID, same-origin background URL, and self-thread flag. After the target account loads, it first visits the background page, then asks the MAIN-world bridge to open that reply through X’s own router. The bridge validates both the saved context and current background URL. It never submits posts. If the router is not ready, restoration waits within the existing record lifetime; missing router support leaves the background page open.

All 69 automated checks pass. Tests cover restored target/background/composer, content-script replacement, malformed context, missing router, external URLs, and cleanup. A packaged Chromium check ran with:

```sh
node /home/krisspy/.agents/skills/playwright-skill/run.js /tmp/playwright-test-xsp-reply-restore.cjs
```

The fixture verified a full account reload, original post background, exact reply ID, reply preview, composer route, and cleared return record through the real MAIN/isolated bridge. It uses locally fulfilled fixture HTML and no server.

The installed build also passed a live account switch from an empty reply to post `2121861256151994453`. The target account was `projectarisu`; the restored route was `/compose/post`, `inReplyToStatusId` matched, `previousPath` was `/Kabocya_Na/status/2121861256151994453`, the original background post link remained in the primary column, a reply preview was present, and the return record cleared. This checks the actual reply state rather than the URL alone.

Packaging checks passed. Unsent draft text and attachments remain outside this restoration feature. No post or message was sent during testing. The bridge uses an internal frontend router shape that can change with X updates.

A second live account-shortcut press switched back to `krisspy39` and again retained the exact reply ID, original background post, reply preview, and cleared return record. Chrome reported installed version `1.1.4-beta.1`. The tester’s original tab was still an empty new-post composer, with no reply ID. After checking that its editor was empty, the test returned that tab to the supplied post and reopened its reply through X’s native shortcut. The original tab then showed the correct reply ID, background post, and reply preview. Temporary tabs were closed. No post or message was sent.


## Chrome Web Store submission, 1.1.4-beta.1

After the tester confirmed the reply restoration and authorized publication, all 69 tests and package checks passed. Source and the updated public privacy policy were pushed in commit `5574d3a`.

The project-local CLI uploaded `release/x-shortcut-plus-1.1.4-beta.1.zip`, then the explicit `publish` subcommand returned `Pending review`. Chrome’s numeric version is `1.1.4`. Google has accepted the submission for review; this does not establish approval or public availability.

The package SHA-256 is `e3700ad5772cb90b466d3241245e94d58e6164df928ad4890f73caef50429ba3`. Credentials remained in the private configured environment file and were not committed. Pre-existing CLI dependency changes and `AGENTS.md` remain outside the release commit.
