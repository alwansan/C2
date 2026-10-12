#!/usr/bin/env python3
from pathlib import Path
import sys,re,json,hashlib
root=Path(sys.argv[1] if len(sys.argv)>1 else 'nuvio')
kit=Path(__file__).resolve().parent
manifest=json.loads((kit/'manifest.json').read_text())
for entry in manifest['changes']:
    assert hashlib.sha256((root/entry['path']).read_bytes()).hexdigest() == entry['after_sha256'],entry['path']
common=root/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/downloads/DownloadSubtitles.kt'
text=common.read_text()
for symbol in ['loadDownloadSubtitleCatalog','subtitleIdentity','addedFileNames','complete = failures == 0']:
    assert symbol in text,symbol
scheduler=(root/'composeApp/src/androidMain/kotlin/com/nuvio/app/features/downloads/AndroidDownloadScheduler.kt').read_text()
assert 'destinationFor(item: DownloadItem)' in scheduler
assert 'AlwanMkvRetryWorker.schedule(' in scheduler
export=(root/'composeApp/src/androidMain/kotlin/com/nuvio/app/features/downloads/AlwanMkvExporter.kt').read_text()
assert 'addedSubtitleFiles: Set<String>?' in export
print('P11.2 verified',len(manifest['changes']),'files')