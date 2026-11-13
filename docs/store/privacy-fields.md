# Privacy practices and reviewer copy

## Single purpose

Provide configurable keyboard navigation between X Home feeds and pinned lists, including a combined scroll-to-top and new-post-banner action.

## Storage permission justification

Save user-chosen key bindings, disabled actions, and account-scoped pinned-list names and numeric IDs in Chrome's local extension storage. These records keep settings across browser restarts and retain list bindings after reordering or renaming. The extension does not use sync storage or transmit these records to a server.

## X/Twitter site-access justification

Content scripts run only on the X/Twitter hosts listed in the manifest. They inspect the current account's profile navigation link, Home tab controls, and the new-post banner to perform user-requested keyboard navigation. A small MAIN-world reader obtains numeric List:<id> keys from rendered Home tabs and exposes only validated IDs to the isolated shortcut script. No private X API or remote-code execution is used.

## Remote code

Select: No, I am not using remote code.

All extension logic is included in the uploaded ZIP. Reading a React tab identifier does not download or execute code from a remote source.

## Data-use facts for the dashboard declarations

Use the dashboard's current definitions when completing its category checkboxes. Do not describe this extension as handling no user data simply because processing is local.

| Information | Actual handling |
| --- | --- |
| X account username | Read locally and stored to separate list discovery by account. |
| List names and numeric IDs | Read locally and stored to provide persistent list bindings. |
| Shortcut settings | Stored locally in the browser profile. |
| Current X route and selected tab | Used locally to execute the requested action; no history database is created. |
| Keyboard events | Matched to configured combinations; typed text and keystroke history are not recorded. |
| Authentication data | Passwords and authentication cookies are not read. |
| Communications and post bodies | Not read or stored by the extension. |
| Transmission, sale, advertising | No extension-operated network requests, analytics, transmission, sale, or advertising use. |

Account usernames are personal information. Pinned-list labels and IDs are website content. Current route inspection is local navigation processing. Disclose these facts consistently with the published policy and the dashboard's definitions; no server transmission does not remove the disclosure requirement.

Privacy policy URL: https://github.com/kriss-spy/x-shortcut-plus/blob/main/PRIVACY.md

## Test instructions for reviewers

1. Install the extension and sign in to an X account you control.
2. Open https://x.com/home. The extension adds no login flow and requires no developer-provided account.
3. Open extension settings using its toolbar icon.
4. Confirm the five configurable actions and default bindings.
5. Return to X with focus outside an editor. Press Ctrl+Alt+2, then Ctrl+Alt+1.
6. Press Ctrl+Alt+N and Ctrl+Alt+P to cycle through displayed tabs and verify wraparound.
7. If the account has pinned lists, assign separate bindings in settings. Confirm their targets after reordering the tabs.
8. Scroll down. Press Ctrl+Alt+K. It scrolls to the top and activates a recognized new-post banner if present. Without a banner it only scrolls.
9. Focus X's composer and confirm shortcuts do not perform feed actions while typing.
10. Change or clear a binding and confirm the result in the existing X tab.

No paid subscription or additional extension service is required. A signed-in X account and pinned lists are needed to verify the corresponding X behavior. The screenshots use example account/list data in the real extension settings; they do not show a developer-operated X service.
