#!/usr/bin/env python3
"""Extract the *public anon client settings* from an official Nuvio Android APK.

Only inspect public DEX strings; never extract account data, sessions, or
service-role/admin keys. Writes local.properties locally, never uploads it.
"""
from pathlib import Path
import base64, json, re, sys, zipfile


def inspect(apk: Path) -> dict[str, str]:
    with zipfile.ZipFile(apk) as archive:
        data = b''.join(archive.read(n) for n in archive.namelist() if n.endswith('.dex'))
    known_primary = 'https://api.nuvio.tv'
    known_backup = 'https://api-two.nuvioapp.space'
    if known_primary.encode() not in data or known_backup.encode() not in data:
        raise ValueError('Not the expected original Nuvio 0.5.9 APK: account endpoints not found')
    anon_keys = []
    for candidate in set(re.findall(rb'eyJ[A-Za-z0-9_.-]{40,}', data)):
        parts = candidate.split(b'.')
        if len(parts) != 3:
            continue
        try:
            payload = json.loads(base64.urlsafe_b64decode(parts[1] + b'=' * (-len(parts[1]) % 4)))
            if payload.get('role') == 'anon' and payload.get('iss') == 'supabase':
                anon_keys.append(candidate.decode('ascii'))
        except (ValueError, UnicodeError):
            continue
    if len(anon_keys) != 1:
        raise ValueError('Expected exactly one public Supabase anon key in the APK')
    return {
        'NUVIO_SUPABASE_URL': known_primary,
        'NUVIO_SUPABASE_ANON_KEY': anon_keys[0],
        'NUVIO_SUPABASE_FALLBACK_URL': known_backup,
    }


def main():
    if len(sys.argv) != 3:
        sys.exit('Usage: python configure_public_backend_from_official_apk.py originalNuvio.apk /path/to/NuvioSource')
    apk, root = Path(sys.argv[1]).resolve(strict=True), Path(sys.argv[2]).resolve(strict=True)
    if not (root / 'composeApp/build.gradle.kts').is_file():
        raise ValueError('Second argument must point at the Nuvio source root')
    values = inspect(apk)
    props = root / 'local.properties'
    old = props.read_text() if props.exists() else ''
    names = set(values)
    preserved = [line for line in old.splitlines() if line.strip().split('=', 1)[0] not in names]
    props.write_text('\n'.join(preserved + [f'{k}={v}' for k, v in values.items()]) + '\n')
    print('Configured the original Nuvio public anon backend client in local.properties. No account tokens or private credentials were read.')

if __name__ == '__main__':
    main()