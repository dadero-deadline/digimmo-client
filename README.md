# DigiMMO Client

<img src="client/icon.png" alt="DigiMMO icon" width="96" height="96" align="right">

An unofficial desktop client and browser extension for [DigiMMO](https://play.digimmo.com.br/). Adds optional lighting, shadows, moving treetops, water reflections and regional ambience. Visuals and sound only; no gameplay automation.

## [Download DigiMMO.zip](https://github.com/dadero-deadline/digimmo-client/releases/latest/download/DigiMMO.zip)

Use the release asset **DigiMMO.zip**. The green repository button downloads the source archive, not the game client.

1. Download **DigiMMO.zip**.
2. Extract it to a folder.
3. Open **DigiMMO.exe** and play.

The extracted folder is the game: **DigiMMO.exe** plus its supporting files, with optional `scripts` and `extension` folders beside it.

**Windows 64-bit. Extract and play.** Client updates download automatically and apply after you close it. Your settings are kept. The EXE is unsigned. [Update details](UPDATES.md) · [Release history](https://github.com/dadero-deadline/digimmo-client/releases)

Using the old standalone `DigiMMO-0.1.1-x64.exe`? Switch to this ZIP once; its experimental updater is no longer supported.

## Prefer your browser?

- **Chrome or Edge:** enable Developer mode on the browser's extensions page, click **Load unpacked** and select the extracted `extension` folder. Reload the game.
- **Userscript:** install `scripts/digimmo-tweaks.user.js` with your userscript manager.

Both use the same effects as the client. Choose one option. Browser copies need manual updates. [Browser instructions](extension/README.md)

## Controls

Press **F10** for settings, **Alt+F10** to toggle atmosphere and **Ctrl+F10** to toggle ambience. Settings support English, Español and Português (Brazil). See [all keyboard controls](KEYBOARD.md).

## Known issues

- Reflections can face the wrong way at northern shores. Some houses, igloos and large objects cast incorrect shadows.
- Tree crowns can split or distort; some trees move too much of the trunk or remain still.
- Some light placements and green sludge glow need correction. Cloud exclusions, snow transitions and particle density also need work.
- Campfire audio needs improvement. Some birds and city voices repeat too often; fountains remain too loud at a distance and water ambience coverage is incomplete.

Report the map, conditions and steps needed to reproduce a problem through [Issues](https://github.com/dadero-deadline/digimmo-client/issues).

## Build from source

<details>
<summary>Source folders and build instructions</summary>

The folders above the README contain source code. Use the ZIP download to play.

```text
src/        Shared effects, ambience and lighting data
client/     Desktop app and automatic updater
extension/  Browser extension template
assets/     Audio recordings and artwork
scripts/    Build and verification tools
```

Requires Node.js 22.12 or newer, npm and Windows. Run `npm ci`, then `npm start` to build and launch the development client from `dist/development/client`. `npm run package:release` produces the five release files in `../release/<version>/`. The build does not install or publish anything. See [Contributing](CONTRIBUTING.md) for development.

</details>

## Contribute

Work in your own fork and submit a focused pull request for maintainer review. Only the maintainer merges changes and publishes official releases. See [Contributing](CONTRIBUTING.md).

## Credits and license

The official DigiMMO icon was supplied by Jorge. [Sound and artwork credits](SOUND_CREDITS.md) document the included assets; sound attribution is also in the in-game Changelog tab. See [Changelog](CHANGELOG.md) for visible and audible changes.

Project code and documentation are available under the [MIT License](LICENSE). You may use, modify and redistribute them, including commercially, while keeping the copyright and license notice. Sounds, artwork and dependencies retain their separate licenses; the MIT License does not relicense those materials. This project is unofficial.
