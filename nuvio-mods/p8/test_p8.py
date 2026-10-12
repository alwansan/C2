#!/usr/bin/env python3
from pathlib import Path
import json,sys,re
r=Path(sys.argv[1])
k=Path(__file__).parent
manifest=json.loads((k/'manifest.json').read_text())
for file in manifest: assert (r/file).is_file(),file
comp=(r/'composeApp/src/commonMain/kotlin/com/nuvio/app/core/ui/Components.kt').read_text()
assert 'modifier = Modifier.weight(1f)' in comp
assert 'TextAutoSize.StepBased(' in comp
assert 'maxLines = if (currentTitle.any(Char::isWhitespace)) 2 else 1' in comp
assert 'Modifier.fillMaxWidth()' in comp
hero=(r/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/details/components/DetailHero.kt').read_text()
assert 'maxLines = if (meta.name.any(Char::isWhitespace)) 2 else 1' in hero
assert 'modifier = Modifier.fillMaxWidth()' in hero
streams=(r/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/streams/StreamsScreen.kt').read_text()
assert 'maxLines = if (title.any(Char::isWhitespace)) 2 else 1' in streams
assert 'maxLines = if (episodeTitle.any(Char::isWhitespace)) 2 else 1' in streams
settings=(r/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/settings/SettingsComponents.kt').read_text()
assert 'maxLines = if (title.any(Char::isWhitespace)) 2 else 1' in settings
assert settings.count('TextAutoSize.StepBased(')>=1
for file in manifest:
 s=(r/file).read_text()
 assert 'TextOverflow.Ellipsis' in s
print('P8: 12 responsive title layout and fallback checks passed.')