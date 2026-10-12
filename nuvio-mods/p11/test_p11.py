#!/usr/bin/env python3
from pathlib import Path
import sys
base=Path(sys.argv[1])
a=base/'composeApp/src/androidMain/kotlin/com/nuvio/app'
b=a/'features/downloads'
files=[
 a/'core/storage/AlwanStorage.kt',a/'core/storage/AlwanBatteryGate.kt',
 b/'AndroidDownloadTransfer.kt',b/'AndroidDownloadScheduler.kt',
 b/'AlwanMkvExporter.kt',b/'AlwanMkvRetryWorker.kt',b/'AlwanDownloadLog.kt',
 base/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/downloads/DownloadSubtitles.kt',
 base/'composeApp/src/androidMain/AndroidManifest.xml',
]
for f in files: assert f.is_file(),f
s=(b/'AndroidDownloadScheduler.kt').read_text()
checks=[
 'transferSlots = Semaphore(3)', 'stagingDirectory', 'retryCount + 1',
 'AlwanMkvExporter.export(', 'AlwanMkvRetryWorker.schedule(',
 'DownloadSubtitles.prepare(', 'retries < 8',
]
for item in checks: assert item in s,item
assert s.index('transferAndroidDownload(')<s.index('DownloadSubtitles.prepare(')
storage=(a/'core/storage/AlwanStorage.kt').read_text()
for item in ['File(work, "mkv")','File(work, "tmp")','File(work, "logs")','migrateLegacyStorage()']:
 assert item in storage,item
mkv=(b/'AlwanMkvExporter.kt').read_text()
for item in ['-map_chapters','-c", "copy','renameTo(backup)','return@withContext source','FFmpegKit.executeWithArguments']:
 assert item in mkv,item
bat=(a/'core/storage/AlwanBatteryGate.kt').read_text()
assert 'isIgnoringBatteryOptimizations' in bat and 'ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS' in bat
subs=(base/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/downloads/DownloadSubtitles.kt').read_text()
assert 'complete = !incompleteSources' in subs
print('P11 source checks passed:',len(checks)+15)