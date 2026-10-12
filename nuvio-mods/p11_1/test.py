#!/usr/bin/env python3
from pathlib import Path
import hashlib,sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'nuvio')
file=root/'composeApp/src/androidMain/kotlin/com/nuvio/app/features/downloads/AlwanMkvExporter.kt'
s=file.read_text()
assert hashlib.sha256(s.encode()).hexdigest() == '8cec87580ea44443626272f9c7fdae26512db7432cc669f75e1ab5cb8dd446ff'
assert '"-map", "0:s?"' in s and '"-map", "0:t?"' in s
assert s.index('subtitles.forEachIndexed { index, _ -> args') < s.index('"-map", "0:s?"')
assert 'sourceIsMkv && subtitles.isEmpty()' in s
assert 'val result = if (sourceIsMkv) source else File(' in s
assert 'if (backup.exists()) backup.renameTo(result)' in s
assert 'if (source != result) source.delete()' in s
assert 'if (staged.exists() && !staged.delete())' in s
print('P11.1 MKV track preservation and safe promotion checks passed')