#!/usr/bin/env python3
"""Idempotent P11 source migration from tested P10 tree, with SHA-256 checks."""
from pathlib import Path
import json,hashlib,tarfile,base64,io,sys
kit=Path(__file__).resolve().parent
project=Path(sys.argv[1]).resolve()
manifest=json.loads((kit/'manifest.json').read_text())
contents={}
raw=base64.b64decode((kit/'p11-changes.tar.gz.b64').read_bytes())
with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
 for info in archive.getmembers():
  if not info.isfile() or info.name not in manifest:raise ValueError('Unexpected file in update')
  contents[info.name]=archive.extractfile(info).read()
assert set(contents)==set(manifest)
changes=[]
for name,data in contents.items():
 target=(project/name).resolve()
 if not target.is_relative_to(project):raise ValueError('Invalid path')
 current=hashlib.sha256(target.read_bytes()).hexdigest() if target.is_file() else None
 expected=manifest[name]
 if current==expected['new_sha256']:continue
 if current!=expected['old_sha256']:
  raise RuntimeError(f'Refusing to overwrite changed file: {name}')
 if hashlib.sha256(data).hexdigest()!=expected['new_sha256']:raise RuntimeError('Bad update checksum')
 changes.append((target,data))
for target,data in changes:
 target.parent.mkdir(parents=True,exist_ok=True)
 target.write_bytes(data)
print('P11 applied',len(changes),'of',len(manifest),'files')