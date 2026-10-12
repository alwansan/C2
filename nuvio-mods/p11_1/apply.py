#!/usr/bin/env python3
"""Idempotent P11.1 MKV preservation fix applied after P11."""
from pathlib import Path
import hashlib,sys

relative = 'composeApp/src/androidMain/kotlin/com/nuvio/app/features/downloads/AlwanMkvExporter.kt'
original_sha = '15ea2a9bc943b7bf0f4816363c68d8761173c24c1a917d7d49c8dfeadd8c9e8b'
patched_sha = '8cec87580ea44443626272f9c7fdae26512db7432cc669f75e1ab5cb8dd446ff'
root = Path(sys.argv[1] if len(sys.argv)>1 else 'nuvio')
source = root / relative
text = source.read_text()
sha = hashlib.sha256(text.encode()).hexdigest()
if sha == patched_sha:
    print('P11.1 already applied')
    raise SystemExit(0)
if sha != original_sha:
    raise SystemExit('P11.1 base mismatch: refusing to overwrite modified source')
old1 = '''            if (source.extension.equals("mkv", true)) return@withContext source
            ffmpegSlot.withPermit {
                currentCoroutineContext().ensureActive()
                val subtitles = readySubtitles(source)
                // Enforce manifest readiness: never embed half-downloaded or ambiguous tracks.
                val result = File(source.parentFile, source.nameWithoutExtension + ".mkv")
                if (result.canonicalPath == source.canonicalPath) return@withPermit source
'''
new1 = '''            ffmpegSlot.withPermit {
                currentCoroutineContext().ensureActive()
                val subtitles = readySubtitles(source)
                // MKV sources can contain tracks already. Preserve them and add new sidecars.
                // Without new sidecars, do not remux an existing MKV unnecessarily.
                val sourceIsMkv = source.extension.equals("mkv", ignoreCase = true)
                if (sourceIsMkv && subtitles.isEmpty()) return@withPermit source
                val result = if (sourceIsMkv) source else File(source.parentFile, source.nameWithoutExtension + ".mkv")
'''
old2 = '''                args += listOf("-map", "0:v:0", "-map", "0:a?", "-map", "0:t?")
                subtitles.forEachIndexed { index, _ -> args += listOf("-map", "${index + 1}:0") }
                args += listOf("-c", "copy")
'''
new2 = '''                // Map sidecars first among subtitle streams so language metadata below
                // refers to the intended external track even when video already has
                // embedded subtitles. Always keep embedded subtitle/attachment tracks.
                args += listOf("-map", "0:v:0", "-map", "0:a?")
                subtitles.forEachIndexed { index, _ -> args += listOf("-map", "${index + 1}:0") }
                args += listOf("-map", "0:s?", "-map", "0:t?", "-c", "copy")
'''
old3 = ' * The ffmpeg library is a maintained Android Maven AAR rather than decompiled Smali.'
new3 = ' * Uses the standalone verified arm64 FFmpeg executable, not conflicting FFmpegKit libraries.'
for a,b in [(old1,new1),(old2,new2),(old3,new3)]:
    if text.count(a)!=1:
        raise SystemExit('Unexpected P11 exporter content. Refusing unsafe edit.')
    text=text.replace(a,b)
if hashlib.sha256(text.encode()).hexdigest()!=patched_sha:
    raise SystemExit('P11.1 source hash validation failed')
source.write_text(text)
print('Applied P11.1 to',source)