#!/usr/bin/env python3
from pathlib import Path
import sys,re
base=Path(sys.argv[1] if len(sys.argv)>1 else '.')/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/cinemana'
s=(base/'CinemanaDownloadActions.kt').read_text()
q=(base/'CinemanaDownloadQuality.kt').read_text()
solo=(base/'CinemanaSingleEpisodeDownloadSheet.kt').read_text()
for term in ['selectedEpisodes','preferred = 1080','selected = episodes.map','overrideQuality','sizeByUrl','httpRequestRaw','CinemanaDownloadQuality.choose','DropdownMenu','CinemanaDownloadQuality.range','download','EnqueueResult','الموسم']:
    assert term in s,term
for term in ['fun choose','fun uniqueOptions','fun range','fun declaredBytes','fun humanBytes','videoSize']:
    assert term in q,term
assert 'text = CinemanaDownloadQuality.label(item)' in solo
assert 'selected = CinemanaDownloadQuality.choose(options, 1080)' in solo
assert 'episode?.season' in s and 'episode?.episode' in s
print('P10 static checks OK')