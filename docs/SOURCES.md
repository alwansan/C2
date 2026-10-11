# Sources and traceability

Reviewed: 2026-10-11. The supplied Cinemana PATCH205 source is the baseline, not a claim about every future server revision.

## Primary public specifications

- Stremio HTTP protocol: https://stremio.github.io/stremio-addon-sdk/protocol.html
- Manifest: https://stremio.github.io/stremio-addon-sdk/api/responses/manifest.html
- Meta: https://stremio.github.io/stremio-addon-sdk/api/responses/meta.html
- Streams: https://stremio.github.io/stremio-addon-sdk/api/responses/stream.html
- Subtitles (including label and custom non-ISO display text): https://stremio.github.io/stremio-addon-sdk/api/responses/subtitles.html
- GitHub Pages is static hosting: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Node environment files: https://nodejs.org/api/cli.html#--env-file-if-existsconfig
- Termux releases: https://github.com/termux/termux-app/releases

## Nuvio client review

Repository: https://github.com/NuvioMedia/NuvioMobile — default branch observed: `cmp-rewrite`.

Reviewed paths:

- `composeApp/src/commonMain/kotlin/com/nuvio/app/features/search/SearchRepository.kt`: search resources selected from manifest; initial search fetched into a HomeCatalogSection.
- `composeApp/src/commonMain/kotlin/com/nuvio/app/features/catalog/CatalogRepository.kt`: catalog pagination and transport URLs.
- `composeApp/src/commonMain/kotlin/com/nuvio/app/features/player/AddonSubtitleLoader.kt`: subtitle URL/lang parsing; current display does not use label as the preferred name.
- `composeApp/src/commonMain/kotlin/com/nuvio/app/features/player/PlayerLanguagePreferences.kt`: normalization aliases can collapse English Arabic Enhanced to ar.
- AddonModels, SubtitleRepository and SubtitleAudioModels for accepted resource fields.

## Supplied source evidence

`docs/evidence/native-endpoints.json` inventories all 36 ApiServices methods with original request annotations and source hash. `docs/evidence/native-models.json` inventories all JSON-annotated fields of the 27 remote model files found in the supplied source. These files preserve the contract rather than bundling old DEX or Android libraries.

Additional source classes reviewed: px4 (API base), jf (authorization interceptor), hz3/fz3 (search), rx/jx (categories), r54/q54 and r54$a/r54$c (home group pagination), qx/sx/ox (sorting), native translation and transcode DTOs. SHA-256 values for pagination/header/base/sort evidence are in `native-source-hashes.json`.

The logo is copied without modification from the supplied `res/mipmap-xxxhdpi/ic_app_logo_round.png`. Cinemana branding belongs to its owner. This repository is an independent unofficial integration and does not represent Cinemana or Nuvio.

## Evidence boundary

Automated tests use synthetic JSON and local HTTP mocks only. No recorded success in these tests asserts live Cinemana availability, a verified live catalog count, or Android device playback. The connection report records current reachability separately. Native account writes, dynamic recommendation hosting, old playback/downloader code and private endpoint access are not claimed as implemented addon resources.
