# X Shortcut Plus

**Beta 1.0.3-beta.1**: configurable keyboard shortcuts for X Home feeds and pinned lists.

- Jump to For you, Following, or a pinned list.
- Cycle feeds in their displayed order, with wraparound.
- Scroll to the top and load new posts through X’s banner, without reloading.
- Assign or clear shortcuts in extension settings.

[Beta installation and release notes](docs/releases/1.0.3-beta.1.md) · [Build and verify](BETA.md) · [Verification record](docs/verification.md)

The extension runs locally, requests only `storage`, and makes no private X API requests. Pinned-list bindings use numeric list identity and remain assigned after tabs move or lists change names.

Defaults are provisional. X’s page structure and internal React keys can change. This is a beta release, with the tested cases and remaining limits recorded in the release notes.

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
