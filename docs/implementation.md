# Build and use v1

The implementation covers the actions in [first-milestone.md](first-milestone.md). The original README and research files are preserved.

## Install locally

Use Node.js 22 or later.

1. Run `npm ci` in the project directory.
2. Run `npm run build`.
3. Open `chrome://extensions` in Chrome or Chromium.
4. Enable Developer mode.
5. Select **Load unpacked**.
6. Select this project's `dist` directory.
7. Reload any X tabs that were open before installation.
8. Sign in to X and open Home to discover pinned lists.
9. Click the extension's toolbar icon to open settings.

No server is required. Build dependencies are only used during development. The extension uses Chrome's `storage` permission and runs only on HTTPS X/Twitter desktop hosts. It makes no network or private API requests.

After rebuilding, reload the extension in `chrome://extensions`, then reload X tabs. Content scripts in existing documents otherwise retain the old build.

## Default bindings

These defaults match the tester-approved bindings. Browser shortcuts, operating system shortcuts, input language switching, and other extensions can take priority.

| Action | Default |
| --- | --- |
| For you | `Ctrl+Alt+1` |
| Following | `Ctrl+Alt+2` |
| Next feed | `Ctrl+Alt+n` |
| Previous feed | `Ctrl+Alt+p` |
| Feed 3 through feed 9 by position | `Ctrl+Alt+3` through `Ctrl+Alt+9` |
| Selected post author | `Ctrl+Alt+u` |
| Next signed-in account | `Ctrl+Alt+a` |
| Top and new posts (optional) | Unassigned; use X’s native `.` for new posts |
| Each pinned list | Unassigned |

Select a binding button and press a single key or key combination. Escape cancels recording. Tab cancels and moves focus. Select **Clear** to disable a binding. Changes save automatically and apply to open tabs.

Letters use the key reported by the keyboard layout. Number-row digits use their physical digit position, including when Shift changes their printed character. Numpad digits use the reported character. Sequences are not configurable. The author action preserves X’s native `g` sequences.

Native X conflicts produce a warning. Assigning a warned binding explicitly overrides that native shortcut when the extension can perform the action. Duplicate bindings disable all affected actions in that account. A binding can be reused for lists in different accounts.

## Feed behavior

Position shortcuts follow Home’s current displayed order, including lists with unknown IDs. They can return through Home from other routes. Each position is configurable.

The extension reads Home's displayed tab order. The first two Home tabs identify For you and Following. Pinned lists use their numeric ID from `/i/lists/<id>` links or the `List:<id>` React keys confirmed in the user's live tab capture. Labels and numeric tab positions do not determine identity.

Home tabs can be anchors or non-link `div` controls. Next and previous include every displayed feed and wrap at both ends. From a list page without Home tabs, the extension uses the account's last discovered feeds. It returns through X's Home link and checks the fresh tab order before selecting the destination. From unrelated routes, next and previous do nothing.

Direct shortcuts can return through Home from another route. They wait up to four seconds for X to render the destination tab. They do not create synthetic links or call X APIs. If X's controls cannot be identified, the extension leaves the shortcut alone or stops the pending switch.

Top and new posts operates on Home and list routes. It scrolls to the top and clicks a recognized banner before the first post. It waits up to one second for a banner that appears after scrolling. Without a recognized banner, it only scrolls. It never calls page reload. Banner text recognition currently covers specific English, Simplified Chinese, and Japanese forms; other wording only scrolls.

A small `MAIN`-world content script reads only the list keys on rendered Home tab elements. It publishes validated numeric IDs as DOM attributes. The isolated shortcut script requests a synchronous refresh before acting, so recycled tabs cannot retain an old ID. The reader does not use extension APIs, read timeline data, or send network requests. The MAIN script also hosts a separate, validated reply-navigation bridge. It locates X’s history object on the profile link’s React ancestry and opens only the saved reply composer. It does not submit posts or call X APIs. This internal router adapter is verified against live X but can change.

React keys are an internal frontend detail. If X changes their format, unidentified tabs remain available for next/previous, but cannot receive a persistent individual binding. The extension preserves previously saved identities until complete discovery becomes available again.

## Author and account shortcuts

The author action clicks the profile link in the focused post’s `User-Name` block. On a post detail route, it can use the main post without focus. It excludes quoted posts, replies selected only by visibility, sidebar suggestions, and the signed-in account’s profile navigation link. Use X’s `j` and `k` to focus a post first. Without a confirmed post and profile link, the shortcut passes through.

The account action opens `SideNav_AccountSwitcher_Button`. It recognizes the captured `UserCell` button by its `Switch to @<handle>` label and matching `UserAvatar-Container-<handle>` identity. It does not require a named list container or a row for the current account. If the current account is absent, it selects the first displayed alternative. The previous named-list adapter remains supported, including wraparound. It never selects login, add-account, or logout controls. The menu has three seconds to render. Escape, pointer input, blur, composition, or another extension action cancels a pending selection.

Before selecting an account, the action stores this tab’s relative URL, source and target handles, and selected Home feed in X’s per-tab `sessionStorage`. The record expires after 30 seconds. After X confirms the target handle, the extension returns from `/home` to the saved URL, including query and fragment, at most once. On Home, it restores a known list by ID or an unidentified feed by position. A missing list cannot be restored. Reply composers also retain their reply post ID, background page URL, and self-thread flag from X’s navigation state. After the target account loads, the extension visits the background page and reopens the same reply through X’s in-app router. It does not treat `/compose/post` alone as a complete reply state. Exact scroll position is not restored.

Unexpected account changes, unrelated navigation, invalid records, or expired records cancel restoration. If session storage is blocked, the extension does not switch accounts. The button selector and identity fields come from the user’s signed-in markup. Regression checks use a minimized copy of that control. A full signed-in live check remains required.

## Keyboard and account handling

Shortcuts pass through inputs, editable ancestors, shadow editors with visible event paths, and active composition. The extension also ignores composition boundary keys for 100 ms. Visible dialogs and menus, focused media controls, repeats, and AltGraph combinations pass through. A modified account shortcut is an exception on photo/video viewer and `/compose/post` routes. It can use the background sidebar controls while X marks them `aria-hidden`. Other shortcuts retain their guards. Account switching restores the URL but does not copy unsent reply text across accounts. X's `g` and `a` prefixes reserve the next unmodified key for 1.5 seconds. Native listeners receive keys the extension does not handle.

Settings use `chrome.storage.local`, with one key per action. List bindings include the observed account handle and list ID. Reordering or renaming a list preserves its binding. Unpinning a list removes its settings row; re-pinning the same ID restores the saved binding.

The profile navigation link supplies the account handle. Missing account identity disables shortcuts. After an account change, unchanged old feed controls are rejected until X changes the tab list or its identities. If X reuses identical controls indefinitely, reload that X tab. Account handle changes require discovery and reassignment under the new handle.

## Source and checks

- `src/dom.js`: isolated DOM assumptions and context guards.
- `src/list-identities.js` and `src/identity-main.js`: page-side list identity reader and DOM-only connection to the isolated script.
- `src/controller.js`: feed actions, account discovery, keyboard handling, and SPA waits.
- `src/keys.js`: defaults, binding normalization, duplicate detection, and native warnings.
- `src/options.js`: settings and storage error handling.
- `extension/manifest.json`: Manifest V3 permissions and host scope.
- `tests/`: automated DOM and settings regression checks.

Run `npm test` to rebuild and run all automated checks. See [verification.md](verification.md) for observed results and live access limits.
