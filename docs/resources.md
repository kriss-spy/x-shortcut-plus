# X/Twitter keyboard extension resources

Research date: 2026-11-10. Scope: implementation research only. Sources are Chrome documentation, web standards, and original project materials. “Documented” means an author claim; “source-inspected” means static code inspection. Neither means runtime verification.

## MV3 implementation choices

| Area | Verified documentation | Practical recommendation (inference) |
| --- | --- | --- |
| Page shortcuts | Content scripts share the DOM with the page but have isolated JavaScript variables. Static scripts use URL match patterns. `document_idle` is the default; `document_start` runs before page scripts and DOM construction. [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Use one static content script for bare keys and sequences. Limit matches to required X/Twitter hosts. Prefer isolated execution and delegated listeners. Choose early injection only if conflict tests require it; wait for action targets separately. |
| Browser commands | Commands normally require Ctrl or Alt, with macOS equivalents; media keys are an exception. Only four suggested bindings are allowed. Users can remap them at `chrome://extensions/shortcuts`. Reserved browser/OS bindings take priority. Conflicts can leave bindings unregistered. [Chrome commands](https://developer.chrome.com/docs/extensions/reference/api/commands) | Use commands for an optional extension toggle or help action. They cannot implement bare `j`/`k` or `g` then `h`. Check `commands.getAll()` for unbound commands. Route page actions to the content script and recheck its context. |
| State ownership | Chrome can terminate an idle extension worker; global variables do not persist across termination. [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Keep focus, selection, and sequence state in each content script. Persist settings separately. Add a worker only for browser-level APIs that need it. |

Content scripts can directly use storage and runtime messaging, but cannot directly call every extension API. Programmatic injection requires `scripting` and host permission or temporary `activeTab` access. Static injection avoids requiring a user gesture for every page visit. [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)

### Storage

Declare `storage`. The API is asynchronous, supports content scripts, and emits `storage.onChanged`. `sync` allows approximately 100 KB total and 8 KB per item. `local` allows 10 MB. `session` is memory-backed, clears on restart/reload/update, and is hidden from content scripts by default. Web `localStorage` in a content script belongs to the host page. [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

Recommendation: store small key maps and preferences in `sync`; use `local` for device-specific settings. Load defaults before enabling shortcuts. Cache settings in memory, update through `onChanged`, and debounce writes. Do not write on every keypress or persist DOM nodes. Handle failed writes and version settings for migration. These are design recommendations, not tested behavior.

## Keyboard context handling

The following policies derive from [W3C UI Events](https://w3c.github.io/uievents/#events-keyboardevents), [HTML editing and focus](https://html.spec.whatwg.org/multipage/interaction.html#editing), and [DOM event dispatch](https://dom.spec.whatwg.org/#dispatching-events):

- Check each `keydown` against its event path and focused element. Pass through inputs, textareas, selects, editable ancestors, and page editors. Account for inherited `contenteditable`, `isContentEditable`, and document `designMode`.
- Skip shortcuts during input method editor composition. Check `isComposing` and track composition events. Test composition boundary keys later; a composition-starting key can have `isComposing === false`.
- Use `event.key` for character bindings. Use `event.code` only for explicitly physical-key bindings. Preserve Shift distinctions and reject unexpected Ctrl, Meta, Alt, or AltGraph combinations.
- Allow `repeat` only for repeatable navigation. Suppress repeat for toggles and actions that change account data.
- Give dialogs and menus their own context. Preserve native Tab, Enter, Space, and Escape behavior unless a documented binding owns the action.
- For sequences, use a short timeout and clear pending state on blur, editing, route changes, or Escape. Show pending state if ambiguity affects use.
- Cancel default behavior only after recognizing an enabled action with a valid target. `preventDefault()` does not stop propagation. Stop propagation only for bindings the extension explicitly owns.

Capture listeners can run before many page listeners, but cannot guarantee precedence over earlier listeners or other extensions. Recommendation: offer remapping and a pause control. Verify coexistence with X's own shortcuts and Vimium before choosing defaults. No current X shortcut inventory was verified here.

## SPA and virtualized DOM risks

Single-page applications can change routes without replacing the document. A one-time load handler is insufficient. Chrome documents `webNavigation.onHistoryStateUpdated` for History API URL changes; it requires `webNavigation` permission. [Chrome navigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation#event-onHistoryStateUpdated)

Recommendation: start by checking the current URL and context when handling an action. If proactive route notifications become necessary, use navigation events and messaging. Do not assume `popstate` reports every `pushState()` call. Patching page History methods from an isolated content script is not equivalent to patching the page's JavaScript world. [HTML session history](https://html.spec.whatwg.org/multipage/nav-history-apis.html#dom-history-pushstate), [Chrome isolation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#work_in_isolated_worlds)

Virtualized lists render a subset of items and can recycle or replace nodes while scrolling. This is a general risk, not evidence that X uses a particular library. [Google's virtualization explanation](https://web.dev/articles/virtualize-long-lists-react-window)

Practical consequences (inference):

- Re-query the target at action time. Validate connection, visibility, current post identity, and enabled state before clicking.
- Track post identity separately from element references or row indexes. A connected recycled node can represent different content.
- Prefer post URLs and semantic structure over generated classes or translated text. Treat even `data-testid` values as undocumented site details.
- Use one delegated listener. If observation is necessary, observe the smallest useful subtree, batch work, and disconnect obsolete observers. Mutation observers report DOM changes, not application routes or completed rendering. [DOM MutationObserver](https://dom.spec.whatwg.org/#interface-mutationobserver)
- Separate focus from scrolling. At a rendered-list boundary, request scrolling and wait for a bounded update. Do not interpret “no next DOM node” as the end of the timeline.

## Closest feature references

These are author descriptions inspected on 2026-11-10. None was installed or tested against current X.

- **[Twitter Shortcut Plus](https://github.com/r7kamura/twitter-shortcut-plus)** is a close predecessor in both name and scope. Its [store listing](https://chromewebstore.google.com/detail/twitter-shortcut-plus/lbmdlngkfaknmfgkpkndloapdhgkmdjo) describes configurable shortcuts for links, media, author selection, quoted tweets, quoting, deletion, and pinning. The listing shows version 0.1.1, updated 2022-05-31. GitHub marks the repository archived on 2026-10-31 and identifies an MIT license. Use it as a feature reference; current compatibility is unverified. This project has no established affiliation with it.
- **[X Keyboard Extras](https://chromewebstore.google.com/detail/x-keyboard-extras/eageolnblhmpikmccendndnbidcifflh)** describes `h` for Show more, Shift+G for Grok, Shift+O for a referenced post, and Shift+S for a screenshot. It advertises compatibility with native selection, typing guards, and shortcut-dialog integration. Those claims closely overlap the proposed reading workflow. This review did not establish a source repository or reuse license.
- **[digitalby/twitter-userscripts](https://github.com/digitalby/twitter-userscripts)** describes opening an author's profile and embedded quotes from native selection. A shared library adds custom bindings to X's help dialog. The README identifies an MIT license. Treat its context-specific key assignments as examples, not safe global defaults. Some other scripts use private GraphQL APIs; the proposed milestone does not need that approach.

## Broader implementation references

### Control Panel for Twitter

- **Author and license:** original repository under `insin`; inspected MIT license names Jonny Buchanan, copyright 2019. Preserve the notice when reusing covered code. [Repository](https://github.com/insin/control-panel-for-twitter), [pinned license](https://github.com/insin/control-panel-for-twitter/blob/7e6a8b07c38aa18903db5ca505578343ef35faf1/LICENSE).
- **Documented:** keeps Following selected, hides unwanted timeline/UI content, and applies options as they change. The author's site links browser installation pages. [Author website](https://soitis.dev/control-panel-for-twitter).
- **Source-inspected:** revision `7e6a8b07c38aa18903db5ca505578343ef35faf1` contains an MV3 manifest, version 4.25.1. It matches X/Twitter desktop/mobile hosts, injects at `document_start`, and requests `storage`. Its content script loads local settings, injects `script.js` into the page, and forwards configuration changes. [Manifest](https://github.com/insin/control-panel-for-twitter/blob/7e6a8b07c38aa18903db5ca505578343ef35faf1/manifest.mv3.json), [content script](https://github.com/insin/control-panel-for-twitter/blob/7e6a8b07c38aa18903db5ca505578343ef35faf1/content.js).
- **Use:** study host scoping and live settings. Do not copy its page-world injection unless needed. The fetched README calls this a support repository, but the pinned tree contains implementation files. Source inspection establishes availability at that revision, not correspondence with store packages.

### Refined Twitter

- **Author and license:** Sindre Sorhus; MIT license names him. [Original repository](https://github.com/sindresorhus/refined-twitter), [license](https://github.com/sindresorhus/refined-twitter/blob/main/license).
- **Documented:** configurable interface changes and `Alt+m` to toggle Night Mode. The author explicitly says a Twitter rewrite broke the extension and it is no longer maintained. GitHub marks it archived on 2021-01-24. [Author README](https://github.com/sindresorhus/refined-twitter#readme).
- **Source-inspected:** the manifest is MV2 and targets `twitter.com`. The content script observes old containers such as `#doc` and `#stream-items-id`, then reapplies features. [Manifest](https://github.com/sindresorhus/refined-twitter/blob/main/source/manifest.json), [content script](https://github.com/sindresorhus/refined-twitter/blob/main/source/content.js).
- **Use:** historical feature organization and direct evidence of maintenance risk. Its selectors and MV2 manifest are unsuitable as a current implementation template.

### Vimium

- **Authors and license:** original repository under `philc`; MIT license names Phil Crosby and Ilya Sukhar, copyright 2010. [Repository](https://github.com/philc/vimium), [license](https://github.com/philc/vimium/blob/master/MIT-LICENSE.txt).
- **Documented:** `j`/`k` scrolling, `gg` sequences, link hints, custom mappings, help with `?`, and insert mode that ignores commands until Escape. The README links official store listings. [Author README](https://github.com/philc/vimium#readme).
- **Source-inspected:** its manifest uses MV3, content scripts, and a module worker. Insert mode tracks focus and passes events to editable content. [Manifest](https://github.com/philc/vimium/blob/master/manifest.json), [insert mode](https://github.com/philc/vimium/blob/master/content_scripts/mode_insert.js).
- **Use:** strongest keyboard-context reference here. Adapt mode separation and pass-through behavior. Its broad browser-navigation permissions exceed this project's initial needs. It is also a likely binding-conflict partner.

## Findings and access limits

Start with a narrowly scoped MV3 content script, configurable mappings, and explicit editing/dialog guards. Reserve browser commands for extension-level actions. Treat route changes, stale targets, and extension conflicts as first-class acceptance cases. Control Panel offers X-specific integration examples; Vimium offers keyboard modes; Refined Twitter demonstrates rewrite breakage.

Only documentation, repository metadata, and source text were checked. No extension was installed or run. No browser automation, live X inspection, shortcut tests, or store-package verification occurred. Current selectors, X virtualization details, and runtime compatibility remain unverified.

GitHub API reads intermittently failed with TLS `UNEXPECTED_EOF_WHILE_READING`; individual source URLs remained accessible. Unpinned web results can reflect different cached revisions. Control Panel implementation links are pinned to the API-reported revision to resolve the README/source discrepancy. Other branch links can change. No implementation, scaffold, or commits were created.
