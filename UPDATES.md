# Updates

## Windows client

New versions download in the background while you play. When an update is ready:

1. Close the client normally when you are ready.
2. Let the update finish.
3. Open the same **DigiMMO.exe** again.

Your login and settings are kept. The game never forces a restart. The client checks about 20 seconds after starting and every four hours.

Version 0.1.2 requests a Windows notification when the download finishes; Windows may not display it. From 0.1.3 onward, the client also keeps an update notice visible inside the game, including after reloading. When upgrading from 0.1.2 to 0.1.3, only the old Windows notification is available. The in-game notice applies to future updates after 0.1.3 is installed.

### If the connection drops

The current version keeps working. A later check retries an interrupted download. Completed downloads are verified and cached, so they do not need to be downloaded again. Offline startup still opens the current version; a cached update can be used after the next successful release check. Windows shutdown postpones installation.

### If an update fails

Close the client, download a fresh [DigiMMO.zip](https://github.com/dadero-deadline/digimmo-client/releases/latest/download/DigiMMO.zip) and extract it into your game folder. Keep one active copy in its own writable folder, such as Games/DigiMMO. Login and settings are stored separately from the program files.

Using the old standalone **DigiMMO-0.1.1-x64.exe**? Switch to the ZIP once. That experimental updater is retired. Existing Setup installations already receive automatic updates and do not need to switch.

## Browser extension and userscript

Both need manual updates. For the extension, replace its files, reload it on the browser's extensions page, then reload the game. For a userscript, install the new script through your userscript manager. No browser store version is available yet.

<details>
<summary>How client updates work</summary>

Updates use the standard Windows installer silently in the game folder. After the first update, the client also appears in Windows Installed Apps. The included `scripts` and `extension` folders are refreshed with it; copies installed separately in a browser are not.

Only newer regular releases from this repository are offered. Drafts, prereleases and forks are excluded. Development clients do not use the public feed. The updater verifies downloads against SHA512 hashes. Windows executables are unsigned.

The main download is DigiMMO.zip. The Setup files under Releases serve automatic updates. See [release instructions](CONTRIBUTING.md#releases) for maintainers.

</details>
