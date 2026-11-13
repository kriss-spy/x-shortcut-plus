# X Shortcut Plus privacy policy

Last updated: November 13, 2026.

This policy describes the X Shortcut Plus Chrome extension, including its beta releases. The developer publishes the extension at [kriss-spy/x-shortcut-plus](https://github.com/kriss-spy/x-shortcut-plus).

## Information used on your device

The extension processes the following information to provide configurable keyboard navigation on X:

- Your chosen shortcut bindings, including actions you have disabled.
- The active X account's username, read from the profile navigation link, to keep discovered lists separate between accounts.
- Pinned-list names, numeric list IDs, and their displayed order, to identify shortcut targets and retain assignments after reordering or renaming.
- The current X page route, selected feed tab, and relevant navigation or new-post controls, to perform the action you request.

The extension reads list IDs from rendered links or the `List:<id>` React keys associated with Home tab elements. It does not call private X APIs.

## Storage and retention

Shortcut bindings and account-scoped list metadata are saved in `chrome.storage.local` in your browser profile. The extension does not use Chrome's sync storage or upload these records to a server.

Stored bindings remain until changed, cleared, or removed with the extension's local data. A list's saved binding can remain after it is unpinned so that re-pinning the same list can restore its assignment. Clearing a shortcut disables that action; it does not erase other settings or discovered-list records.

Uninstalling the extension removes its extension storage. To erase all extension-held data, uninstall the extension. Reinstalling starts with the shipped defaults.

## Keyboard input

The extension listens for keyboard events to match configured shortcuts. The settings page records a chosen key combination only when you activate a binding button. It does not keep a history of keystrokes or record the text you type.

Shortcut actions are ignored in typing and composition contexts, visible dialogs and menus, and focused media controls. These guards support normal X interactions; the extension does not read input-field values to implement them.

## Information not accessed or transmitted

The extension does not read passwords, authentication cookies, private messages, or post bodies. It does not create a browsing-history database or read activity on unrelated websites. Its content scripts are restricted to the X/Twitter hosts declared in the manifest.

The extension has no analytics, advertising, telemetry, developer server, or remote-code download. It does not send the information described above to the developer or any third party. The developer does not sell user information or use it for advertising, credit, or lending decisions.

The reader running alongside X's page scripts only publishes a validated numeric list ID on each relevant tab element. It has no extension API, storage, or network access. The extension's isolated content script uses that ID to match a tab to a saved binding.

X and Chrome may make their own network requests when you navigate, refresh posts, install an extension, or receive updates. Those services operate under their own privacy policies. This extension does not operate or control those services.

## Changes and contact

This policy will be updated if the extension's data practices change. The current policy is published in the project repository.

For privacy questions or reports, contact the developer through [GitHub Issues](https://github.com/kriss-spy/x-shortcut-plus/issues). Do not post passwords, cookies, tokens, or private content in a public issue.
