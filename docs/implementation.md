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
| Top and new posts | `Ctrl+Alt+k` |
| Each pinned list | Unassigned |

Select a binding button and press a single key or key combination. Escape cancels recording. Tab cancels and moves focus. Select **Clear** to disable a binding. Changes save automatically and apply to open tabs.

Letters use the key reported by the keyboard layout. Number-row digits use their physical digit position, including when Shift changes their printed character. Numpad digits use the reported character. Sequences are not configurable in v1.

Native X conflicts produce a warning. Assigning a warned binding explicitly overrides that native shortcut when the extension can perform the action. Duplicate bindings disable all affected actions in that account. A binding can be reused for lists in different accounts.

## Feed behavior

The extension reads Home's displayed tab order. The first two Home tabs identify For you and Following. Pinned lists use their numeric ID from `/i/lists/<id>` links or the `List:<id>` React keys confirmed in the user's live tab capture. Labels and numeric tab positions do not determine identity.

Home tabs can be anchors or non-link `div` controls. Next and previous include every displayed feed and wrap at both ends. From a list page without Home tabs, the extension uses the account's last discovered feeds. It returns through X's Home link and checks the fresh tab order before selecting the destination. From unrelated routes, next and previous do nothing.

Direct shortcuts can return through Home from another route. They wait up to four seconds for X to render the destination tab. They do not create synthetic links or call X APIs. If X's controls cannot be identified, the extension leaves the shortcut alone or stops the pending switch.

Top and new posts operates on Home and list routes. It scrolls to the top and clicks a recognized banner before the first post. It waits up to one second for a banner that appears after scrolling. Without a recognized banner, it only scrolls. It never calls page reload. Banner text recognition currently covers specific English, Simplified Chinese, and Japanese forms; other wording only scrolls.

A small `MAIN`-world content script reads only the list keys on rendered Home tab elements. It publishes validated numeric IDs as DOM attributes. The isolated shortcut script requests a synchronous refresh before acting, so recycled tabs cannot retain an old ID. The reader does not use extension APIs, read timeline data, or send network requests.

React keys are an internal frontend detail. If X changes their format, unidentified tabs remain available for next/previous, but cannot receive a persistent individual binding. The extension preserves previously saved identities until complete discovery becomes available again.

## Keyboard and account handling

Shortcuts pass through inputs, editable ancestors, shadow editors with visible event paths, and active composition. The extension also ignores composition boundary keys for 100 ms. Visible dialogs and menus, focused media controls, repeats, and AltGraph combinations pass through. X's `g` and `a` prefixes reserve the next unmodified key for 1.5 seconds. Native listeners receive keys the extension does not handle.

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
