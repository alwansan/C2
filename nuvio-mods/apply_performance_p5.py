#!/usr/bin/env python3
"""Apply the exact P4 -> P5 source delta. Idempotent and hash-checked."""
from pathlib import Path
import sys,base64,gzip,json,hashlib

def sha(content): return hashlib.sha256(content).hexdigest()
def main():
    if len(sys.argv)!=2:
        raise SystemExit('usage: python apply_performance_p5.py <Nuvio source directory>')
    root=Path(sys.argv[1]).resolve()
    payload=Path(__file__).with_name('performance_p5.patch.gz.b64').read_text().strip()
    entries=json.loads(gzip.decompress(base64.b64decode(payload)))
    changes=[]
    for entry in entries:
        rel=Path(entry['path'])
        if rel.is_absolute() or '..' in rel.parts:raise ValueError('unsafe path')
        target=(root/rel).resolve()
        if not target.is_relative_to(root):raise ValueError('unsafe resolved path')
        existing=target.read_bytes() if target.exists() else b''
        desired=base64.b64decode(entry['content'])
        if sha(existing)==entry['new_sha']:continue
        if sha(existing)!=entry['old_sha']:
            raise ValueError(f'Unexpected source: {entry["path"]}; aborting (expected P4)')
        changes.append((target,desired))
    for target,desired in changes:
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(desired)
    print(f'P5 installed: {len(changes)} changed files, {len(entries)-len(changes)} already current')
if __name__=='__main__':main()