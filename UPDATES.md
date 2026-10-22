# Updates

## Windows client

Install Setup once. Newer stable releases download in the background and install when you close the client normally. There is no forced restart during play, and your settings remain in the Windows user profile.

The client checks shortly after starting and every four hours. Drafts, prereleases and changes in forks are not offered. Development clients do not use the public update feed.

If a download is interrupted, the current version keeps working and a later check retries. A complete, verified download is cached and can install on exit. After an offline restart, the current version opens normally; the cache is reused after the next successful release check. Windows shutdown defers installation. Recovery from power loss during installation has not been verified; Setup may need to be run again.

## Browser extension and userscript

Unpacked extensions require manual updates: replace the extracted files, reload the extension, then reload the game. The standalone userscript also needs a manual update. Future store versions can update through their browser stores; no listings exist yet.

## Downloads

Official downloads are available on [GitHub Releases](https://github.com/dadero-deadline/digimmo-client/releases). The updater verifies downloads against SHA512 hashes. The Windows installer is unsigned. See [release instructions](https://github.com/dadero-deadline/digimmo-client/blob/main/CONTRIBUTING.md#releases) for maintainers.
