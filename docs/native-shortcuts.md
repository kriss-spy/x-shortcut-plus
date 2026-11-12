# Native X keyboard shortcuts

Recorded: 2026-11-10.

Evidence: the user-supplied screenshot of X's keyboard shortcuts dialog. A portable copy is stored at [evidence/x-keyboard-shortcuts.png](evidence/x-keyboard-shortcuts.png). These are displayed bindings, not tested behavior. Account, platform, and rollout differences remain possible.

The supplied URL, [X keyboard shortcuts](https://x.com/i/keyboard_shortcuts), returned HTTP 403 during direct web fetching. No authenticated browser inspection occurred.

Notation: `g → h` means a proposed reading of the displayed `g + h` as a sequence. The screenshot alone does not establish timing. Audio dock combinations retain the screenshot's `+` notation because their sequence/chord semantics need testing.

## Navigation

| Key | Displayed action |
| --- | --- |
| `?` | Shortcut help |
| `j` | Next post |
| `k` | Previous post |
| `Space` | Page down |
| `.` | Load new posts |
| `g → h` | Home |
| `g → e` | Explore |
| `g → n` | Notifications |
| `g → r` | Mentions |
| `g → p` | Profile |
| `g → f` | Drafts |
| `g → t` | Scheduled posts |
| `g → l` | Likes |
| `g → i` | Lists |
| `g → m` | Chat |
| `g → g` | Grok |
| `g → c` | Creator Studio |
| `g → s` | Settings |
| `g → b` | Bookmarks |
| `g → u` | Go to user… |
| `g → d` | Display settings |

## Actions

| Key | Displayed action |
| --- | --- |
| `n` | New post |
| `Ctrl+Enter` | Send post |
| `/` | Search |
| `l` | Like |
| `r` | Reply |
| `t` | Repost |
| `s` | Share post |
| `b` | Bookmark |
| `u` | Mute account |
| `x` | Block account |
| `Enter` | Open post details |
| `o` | Expand photo |
| `i` | Open/Close Messages dock |

## Media

| Key | Displayed action |
| --- | --- |
| `k` | Pause/Play selected Video |
| `Space` | Pause/Play selected Video |
| `m` | Mute selected Video |
| `a + d` | Go to Audio Dock |
| `a + Space` | Play/Pause Audio Dock |
| `a + m` | Mute/Unmute Audio Dock |

Total: 21 navigation entries, 13 action entries, and 6 media entries.

## Documentation conflicts and open questions

X's [How to Post](https://help.x.com/en/using-x/how-to-post#keyboard-shortcuts) page lists `b` for block and `m` for Direct Message. The screenshot instead assigns bookmark to `b`, block to `x`, and video mute to `m`. The help page also includes Moments navigation and omits several destinations visible in the screenshot. Treat the screenshot as the working inventory for this project, with live confirmation still required.

The help page documents both Cmd+Enter and Ctrl+Enter for sending. The screenshot shows only Ctrl+Enter. Test macOS separately.

`k` and `Space` each appear in navigation and media. Their precedence is unresolved. Never treat either as globally available for a new action.

No remapping control, author-profile action for the selected post, quote-post navigation, explicit Show more action, or direct copy-link action appears in the supplied dialog. Absence from the dialog does not prove that X lacks the behavior.

Before selecting defaults, test post selection, scrolling, expanded posts, media focus, dialogs, search, composers, keyboard layouts, and input method composition. Also check whether `g` and `a` prefixes reserve their following keys outside a sequence.
