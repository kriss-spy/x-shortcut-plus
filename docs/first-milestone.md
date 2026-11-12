# Agreed v1 scope

Build a Chrome extension from scratch for keyboard navigation between X feeds.

## Actions

- Go directly to For you.
- Go directly to Following.
- Go directly to any pinned list through its assigned shortcut.
- Switch to the next or previous feed.
- Scroll to the top and refresh new posts through one combined action.

Next/previous follows X's displayed tab order: For you, Following, then pinned lists. Wrap at both ends.

The combined top-and-refresh action scrolls to the top and activates X's new-post banner, such as “Show 28 posts,” when available. Without that banner, it only scrolls to the top. Do not reload the whole page.

## Extension settings

Let users assign, change, and clear every shortcut in the extension's settings page. Each pinned list gets a separate binding. Bind to list identity so tab reordering preserves assignments.

Flag conflicts with X's known native shortcuts. Preserve native shortcuts by default. Ignore extension shortcuts while typing, including input method composition. Preserve dialog and media keyboard behavior.

## Boundaries

Only the actions above belong to v1. Earlier proposals for post expansion, author navigation, quoted-post navigation, and other post actions are withdrawn. No additional feature design is approved.

Keep the extension local, without a server or private X API integration. Choose implementation details and initial key defaults during the build. Do not assume current DOM selectors or behavior are verified.

## Verification

Verify direct feed navigation, pinned-list discovery, list identity after reordering, next/previous order and wraparound, and both banner states for top-and-refresh.

Verify settings persistence, changes in open tabs, duplicate/conflicting bindings, typing guards, IME composition, native shortcut coexistence, and route changes. Account switching must not reuse another account's discovered pinned lists.

Use meaningful automated checks and live X checks where access permits. Report access limits and unrun checks explicitly.

Current status: research and agreed scope only. No extension code or runtime verification exists.
