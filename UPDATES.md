# Updates

## Windows client

Download DigiMMO.zip, extract it and run DigiMMO.exe. New versions download in the background. Close the client normally to finish the update, then open the same EXE next time. Updates replace files in that folder. Your settings stay in place and play is never interrupted by a forced restart.

The client checks shortly after starting and every four hours. Drafts, prereleases and changes in forks are not offered. Development clients do not use the public update feed.

If a download is interrupted, the current version keeps working and a later check retries. Completed downloads are verified and cached. If you start offline, the current version still opens; the cached update is used after the next successful release check. Windows shutdown postpones updates.

Keep the extracted folder somewhere you can write to, such as your Downloads or Games folder. If an update cannot replace the EXE, your current copy stays in place. You can also download a new ZIP and extract it over the old files while the client is closed.

Existing Setup installations continue to receive automatic updates. You do not need to switch them to the ZIP version.

## Browser extension and userscript

Unpacked extensions require manual updates: replace the extracted files, reload the extension, then reload the game. The standalone userscript also needs a manual update. Future store versions can update through their browser stores; no listings exist yet.

## Downloads

The main download is [DigiMMO.zip](https://github.com/dadero-deadline/digimmo-client/releases/latest/download/DigiMMO.zip). Setup files under Releases keep existing installations and extracted folders up to date. The updater verifies downloads against SHA512 hashes. Windows executables are unsigned. See [release instructions](https://github.com/dadero-deadline/digimmo-client/blob/main/CONTRIBUTING.md#releases) for maintainers.
