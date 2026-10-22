# DigiMMO Client

<img src="client/icon.png" alt="DigiMMO icon" width="96" height="96">

An unofficial desktop client and browser extension for [DigiMMO](https://play.digimmo.com.br/). Adds optional lighting, shadows, moving treetops, water reflections and regional ambience. Visuals and sound only; no gameplay automation.

## Download and install

Download **version 0.1** from [Releases](https://github.com/dadero-deadline/digimmo-client/releases/tag/v0.1.0).

- **Windows:** run the [Setup EXE](https://github.com/dadero-deadline/digimmo-client/releases/download/v0.1.0/DigiMMO-Setup-0.1.0-x64.exe). Future releases download in the background and install when you close the client. The installer is unsigned.
- **Chrome and Edge:** extract the [extension ZIP](https://github.com/dadero-deadline/digimmo-client/releases/download/v0.1.0/digimmo-extension-0.1.0-chromium.zip), enable Developer mode on the extensions page and choose **Load unpacked**. Reload the game tab.
- **Firefox:** the [Firefox ZIP](https://github.com/dadero-deadline/digimmo-client/releases/download/v0.1.0/digimmo-extension-0.1.0-firefox.zip) is for temporary testing. Browser validation and signing are still pending.
- **Userscript:** install the [`.user.js` file](https://github.com/dadero-deadline/digimmo-client/releases/download/v0.1.0/digimmo-tweaks-0.1.0.user.js) with a compatible userscript manager.

Enable only one copy of the effects. See [browser installation](extension/README.md) and [updates](UPDATES.md) for details.

## What is included?

All three options use the same effects and sounds. The **client** opens the game in a desktop app. The **extension** loads the effects in your browser. The **userscript** is a single `.user.js` file that a userscript manager loads into the game page; it is an alternative to the extension.

The repository contains the source:

```text
src/        Shared effects, ambience and lighting data
client/     Desktop app and automatic updater
extension/  Browser manifest, icons and installation instructions
assets/     Audio recordings and artwork
scripts/    Build and verification tools
dist/       Generated downloads (created locally, not stored in Git)
```

An extracted extension download contains:

```text
manifest.json       Tells the browser to load the effects on DigiMMO
digimmo-tweaks.js    Complete effects script, including sounds and data
icons/              Extension icons
LICENSE             MIT license for the project code
*.md                Installation, controls, changelog and credits
```

Load this extracted folder into your browser. The repository's `extension/` folder is a build template; the build adds the complete script from `src/` and `assets/`.

## Controls

Press **F10** for settings, **Alt+F10** to toggle atmosphere and **Ctrl+F10** to toggle ambience. Settings support English, Español and Português (Brazil). See [all keyboard controls](KEYBOARD.md).

## Known issues

Known issues in 0.1:

- Reflections can face the wrong way at northern shores. Some houses, igloos and large objects cast incorrect shadows.
- Tree crowns can split or distort; some trees move too much of the trunk or remain still.
- Some light placements and green sludge glow need correction. Cloud exclusions, snow transitions and particle density also need work.
- Campfire audio needs improvement. Some birds and city voices repeat too often; fountains remain too loud at a distance and water ambience coverage is incomplete.
- Shortcut hints can overflow the World settings tab.

Report the map, conditions and steps needed to reproduce a problem through [Issues](https://github.com/dadero-deadline/digimmo-client/issues).

## Build from source

Requires Node.js 22.12 or newer and npm. Windows is required for the Setup build.

```sh
npm ci
npm run package:release
```

This builds and checks the client, both extensions and userscript. Uploadable files appear in `dist/releases/<version>/`. Nothing is installed or published by the build. For development and individual targets, see [Contributing](CONTRIBUTING.md).

## Contribute

Work in your own fork and submit a focused pull request for maintainer review. Only the maintainer merges changes and publishes official releases. See [Contributing](CONTRIBUTING.md).

## Credits and license

The official DigiMMO icon was supplied by Jorge. [Sound and artwork credits](SOUND_CREDITS.md) document the included assets; sound attribution is also in the in-game Changelog tab. See [Changelog](CHANGELOG.md) for visible and audible changes.

Project code and documentation are available under the [MIT License](LICENSE). You may use, modify and redistribute them, including commercially, while keeping the copyright and license notice. Sounds, artwork and dependencies retain their separate licenses; the MIT License does not relicense those materials. This project is unofficial.
