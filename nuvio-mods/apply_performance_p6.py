#!/usr/bin/env python3
"""P6 styling-only patch. Applies to the exact audited AlwanCinema P5 source."""
from pathlib import Path
import base64, gzip, hashlib, json, sys

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python apply_performance_p6.py <P5-source-root>')
    root = Path(sys.argv[1]).resolve()
    data = Path(__file__).with_name('performance_p6.patch.gz.b64').read_text().strip()
    entries = json.loads(gzip.decompress(base64.b64decode(data)))
    changes = []
    for entry in entries:
        rel = Path(entry['path'])
        if rel.is_absolute() or '..' in rel.parts:
            raise ValueError(f'Unsafe path: {rel}')
        dest = (root / rel).resolve()
        if not dest.is_relative_to(root):
            raise ValueError(f'Path outside project: {rel}')
        desired = base64.b64decode(entry['content'])
        if sha(desired) != entry['new_sha']:
            raise ValueError(f'Corrupt P6 payload: {rel}')
        current = dest.read_bytes() if dest.exists() else b''
        if sha(current) == entry['new_sha']:
            continue
        if sha(current) != entry['old_sha']:
            raise ValueError(f'Unexpected base for {rel}; expected P5 — no changes applied')
        changes.append((dest, desired))
    for dest, content in changes:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)
    print(f'P6: {len(changes)} changed files; {len(entries) - len(changes)} already updated')

if __name__ == '__main__':
    main()