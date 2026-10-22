# Keyboard controls

| Shortcut | Public behavior |
|---|---|
| F10 | Open or close the cosmetic settings menu. |
| Ctrl+Shift+O | Alternative to F10 for the same menu. |
| Alt+F10 | Turn all added atmosphere and ambient sounds off or on. Saved between sessions. Original game graphics, music and sounds remain. Audio correction settings are separate. |
| Ctrl+F10 | Turn only added ambient sounds off or on. Saved between sessions. |
| Escape | Close the cosmetic settings menu when it is open. Otherwise the game handles Escape. |
| F11 | Toggle fullscreen in the Electron client. |
| Ctrl+R | Reload the game page in the Electron client. This is not a full process or GPU restart. |

The F10 shortcuts are ignored while typing outside the settings menu. When multiple modifiers are held, Ctrl takes precedence over Alt. Use the listed combinations individually.

## Development builds only

- Shift+F10: cycle real local time, morning (06:24), noon (12:00), evening (19:18), night (23:00), then real local time again. Each preview transition lasts six seconds. It changes only the added atmosphere, is not saved, and does not change the game's clock.
- Ctrl+Alt+P: show or hide read-only map, rendering and audio counters. It does not change effects.
- Ctrl+Shift+I: Electron developer tools in the development client only.

These development controls are absent from the public output.
