# Chrome Web Store upload pack

Prepared for X Shortcut Plus 1.0.6-beta.1. This pack has not been submitted to the Chrome Web Store.

## Files to use in the dashboard

| Dashboard field | File or value |
| --- | --- |
| Extension package | `x-shortcut-plus-1.0.6-beta.1.zip` from the release. This is separate from the asset-pack ZIP. |
| Store icon | `icon-128.png`, 128×128 PNG with transparent padding. |
| Screenshot 1 | `screenshot-01-shortcuts.png`, 1280×800 PNG. |
| Screenshot 2 | `screenshot-02-pinned-lists.png`, 1280×800 PNG. |
| Small promo tile, optional | `promo-small-440x280.png`, 440×280 PNG. |
| Marquee promo tile, optional | `promo-marquee-1400x560.png`, 1400×560 PNG. |
| Store listing | Copy the fields from `listing.md`. |
| Permission and reviewer fields | Copy the relevant fields from `privacy-fields.md`. |
| Privacy policy URL | https://github.com/kriss-spy/x-shortcut-plus/blob/main/PRIVACY.md |
| Support URL | https://github.com/kriss-spy/x-shortcut-plus/issues |

The store asset ZIP contains artwork and text. Do not upload it as the extension package. The extension package has `manifest.json` at its root and includes the required icon inside `icons/`.

## Screenshot provenance

Both screenshots include actual captures of the extension's settings page. They are framed with explanatory captions. The list example uses a temporary local profile, username `example`, fictional list names, and example numeric IDs. The displayed list bindings are examples, not shipped defaults. No actual X account, posts, credentials, or private messages appear in the captures.

The feed screenshot uses the shipped Ctrl+Alt defaults. The pinned-list screenshot shows separate assigned bindings and the same native browser/system cautions that appear in the real UI. See `source/` in the repository for capture images and rendered artwork sources.

The icon is an original vector feed-and-arrow mark. It does not use X's logo. PNG sizes 16, 32, 48, and 128 are included in the extension; 512 is supplied as an editable/export reference alongside the SVG.

## What remains in your account

Upload the package and listing assets, complete the dashboard's data-use declarations from the supplied facts, choose visibility/regions, and submit for review. For the beta, Unlisted is a suitable initial distribution choice. A store review and approval are still required.

Account-specific declarations, legal terms, and the final submission are completed in your developer account. No account credentials are included in this pack.

## Recreate assets

Requires Node.js 22+, the project dependencies, `zip`/`unzip`, and a Playwright Chromium build that supports unpacked extensions.

```sh
npm ci
npx playwright install chromium
npm run assets:store
npm test
npm run package
npm run package:store-assets
```

Set `XSP_CHROME_PATH` to use a compatible Chrome for Testing executable already installed on your system. Asset rendering opens a temporary visible browser, builds the extension, uses only local/example settings data, and closes/removes the temporary profile when finished. No server or live X login is required.

## Official references

- Image dimensions and listing assets: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Icon specifications: https://developer.chrome.com/docs/webstore/images
- Local data disclosure requirements: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- Publishing: https://developer.chrome.com/docs/webstore/publish
