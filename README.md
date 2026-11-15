# X Shortcut Plus

**Beta 1.1.4-beta.1**: configurable keyboard shortcuts for X feeds, post authors, and account switching.

- Jump to For you, Following, or a pinned list.
- Cycle feeds in their displayed order, with wraparound.
- Select feeds 1–9 with `Ctrl+Alt+1` through `Ctrl+Alt+9`.
- Open the selected post’s author with `Ctrl+Alt+u`.
- Switch to the next signed-in account with `Ctrl+Alt+a` and restore the current URL.
- Use X’s native `.` to load new posts, or assign the optional top-and-new-posts action.
- Assign or clear shortcuts in extension settings.

[Beta installation and release notes](docs/releases/1.1.4-beta.1.md) · [Build and verify](BETA.md) · [Verification record](docs/verification.md)

[Privacy policy](PRIVACY.md) · [Chrome Web Store upload assets](docs/store/README.md)

The extension runs locally, requests only `storage`, and makes no private X API requests. Pinned-list bindings use numeric list identity and remain assigned after tabs move or lists change names.

Defaults follow the tester-approved bindings. X’s page structure and internal React keys can change. This is a beta release, with the tested cases and remaining limits recorded in the release notes.

<details>
<summary>Original research baseline (historical, preserved)</summary>

# X Shortcut Plus

A planned Chrome extension to improve keyboard use on X (Twitter).

Status: research baseline. No extension code or runtime tests exist yet.

## Research

- [Native shortcut inventory](docs/native-shortcuts.md): all 40 entries from the supplied screenshot, plus documentation conflicts.
- [Implementation resources](docs/resources.md): Chrome APIs, keyboard handling, and related projects.
- [Agreed v1 scope](docs/first-milestone.md): feed switching, pinned-list shortcuts, settings, and top-and-refresh.

Version 1 preserves X's native shortcuts and adds feed navigation. Default bindings remain provisional until live testing confirms their behavior. The v1 scope supersedes earlier feature proposals.

</details>
