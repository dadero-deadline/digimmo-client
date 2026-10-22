# DigiMMO Tweaks

Optional lighting, shadows, reflections and regional ambience for [DigiMMO](https://play.digimmo.com.br/). Uses the same cosmetic effects as the desktop client. See the project's [known issues](https://github.com/dadero-deadline/digimmo-client#known-issues).

## Chrome and Edge

1. Extract the Chromium ZIP into a permanent folder.
2. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
3. Select **Load unpacked** and choose the folder containing `manifest.json`.
4. Reload the game tab and press **F10** for settings.

## Firefox testing

In Firefox 128 or newer, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select the Firefox build's manifest. This installation disappears after restarting Firefox. Permanent distribution needs signing; browser validation remains pending.

## Updates and controls

Use only one extension or userscript at a time. To update, replace the files in the same folder, reload the extension, then reload the game. Store updates are not available yet.

See [keyboard controls](../KEYBOARD.md), [changes](../CHANGELOG.md) and [sound and artwork credits](../SOUND_CREDITS.md). The icon was supplied by Jorge. The public effects have no developer controls.

Project code uses the [MIT License](../LICENSE). Keep the copyright and license notice when redistributing it. Sounds and artwork retain their separate terms in the credits.
