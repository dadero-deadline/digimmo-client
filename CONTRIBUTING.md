# Contributing

Fork the repository, create a branch and keep your change focused. Submit a pull request with a clear description and what you tested. The maintainer reviews and merges changes; forks do not update official releases automatically.

Keep the project cosmetic: no gameplay automation or game network modifications. Update menu text in English, Spanish and Brazilian Portuguese together. Document every new sound in SOUND_CREDITS.md and the in-game credits, preferably using CC0 or attributed CC BY assets.

## Development

```sh
npm ci
npm start
```

The shared source is in `src/`, the Electron wrapper in `client/`, and the browser manifest in `extension/`. `npm start` builds and launches `dist/development/windows/win-unpacked/DigiMMO.exe`. The normal Windows packager gives development the same name and icon as the public client; the runtime is reused until its version or packaging changes. Development never joins the public update feed. To rebuild during a session, run `npm run build:dev`, then reload with Ctrl+R. Changes to the Electron wrapper need a restart. An absolute `DIGIMMO_DEV_TEST_SCRIPT` path can explicitly select a test script; old AppData scripts and development.json files are not loaded automatically.

Keep public packages in the sibling `release/<version>/` folder, archived builds in `archive/` and private checks in `tests/`. Do not launch old executables from the workspace root or archive. Keep profiles, credentials, game caches and private reports outside Git.

Distinguish syntax checks, local reconstructions and actual game tests. For visual or audio changes, include the map and conditions needed to reproduce the result.

## Releases

1. Update the version, source labels and visible release notes together.
2. Run `npm ci` and `npm run package:release`. For individual targets, use `package:installer` or `package:extensions`.
3. Review the known issues and perform the acceptance checks needed for the release. Verify installed upgrades when changing the client or updater.
4. Create a draft tagged `v<version>` and describe the user-facing changes. Upload only the five checked files from `../release/<version>/`: DigiMMO.zip, Setup EXE, Setup blockmap, `latest.yml` and `SHA256SUMS.txt`. DigiMMO.zip is the main download. The Setup files serve automatic updates for extracted folders and installed clients. Check the uploaded hashes before publishing. Never upload a whole old output directory or replace an existing version with a different build.
5. Publish approved releases as regular releases. Installed clients receive newer regular releases; drafts and prereleases are excluded. Reserve prereleases for optional testing. Browser store delivery is separate.

Project code and documentation use the [MIT License](LICENSE); preserve its notice and the separate asset and dependency credits when distributing a fork. The installer is unsigned. Forks distributing their own client should use a separate app identity and update feed.

The build pins `global-agent` 4.1.3 for `@electron/get` 3.1.0 to remove the vulnerable `roarr`/`sprintf-js` chain while retaining its proxy API. Remove the override when the builder's upstream dependency is updated.
