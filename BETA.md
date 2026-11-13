# X Shortcut Plus beta

Current beta: **1.0.4-beta.1**. Chrome's numeric extension version is **1.0.4**.

See [release notes and installation](docs/releases/1.0.4-beta.1.md).

## Build and verify

Requires Node.js 22 or later. Packaging also requires the `zip` and `unzip` commands.

```sh
npm ci
npm test
npm run package
```

The unpacked extension is built into `dist/`. The distributable ZIP and SHA-256 checksum are written to `release/`. Load `dist/` directly for development, or extract the release ZIP into a permanent folder and load that folder.

The extension has no server and makes no private X API requests. Settings stay in Chrome's local extension storage. See [implementation details](docs/implementation.md) and [verification limits](docs/verification.md).
