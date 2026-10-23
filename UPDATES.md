# Updates

## Windows client

Download [DigiMMO.zip](https://github.com/dadero-deadline/digimmo-client/releases/latest/download/DigiMMO.zip), extract it into its own folder and open DigiMMO.exe. New versions download in the background. When an update is ready, close the client normally and let it finish before opening the same EXE again. Your settings stay in place and the game never forces a restart.

Updates use the standard Windows installer silently in that folder. After the first update, the client also appears in Windows Installed Apps. Keep one active copy. The included `scripts` and `extension` folders are supplied again with each update.

The client checks shortly after starting and every four hours. Drafts, prereleases and changes in forks are not offered. Development clients do not use the public update feed.

If a download is interrupted, the current version keeps working and a later check retries. Completed downloads are verified and cached. If you start offline, the current version still opens; the cached update is used after the next successful release check. Windows shutdown postpones updates.

Keep the game in its own writable folder, such as Games/DigiMMO. If an update fails, close the client and extract a fresh ZIP into that folder. Login and game settings are stored separately from the program files.

Existing Setup installations continue to receive automatic updates. You do not need to switch them to the ZIP version.

The old standalone `DigiMMO-0.1.1-x64.exe` used an unfinished updater. Replace it once with the ZIP version. Opening `DigiMMO.exe` inside the extracted folder keeps the existing profile.

## Browser extension and userscript

Unpacked extensions require manual updates: replace the extracted files, reload the extension, then reload the game. The standalone userscript also needs a manual update. Future store versions can update through their browser stores; no listings exist yet.

## Downloads

The main download is [DigiMMO.zip](https://github.com/dadero-deadline/digimmo-client/releases/latest/download/DigiMMO.zip). Setup files under Releases keep existing installations and extracted folders up to date. The updater verifies downloads against SHA512 hashes. Windows executables are unsigned. See [release instructions](https://github.com/dadero-deadline/digimmo-client/blob/main/CONTRIBUTING.md#releases) for maintainers.
