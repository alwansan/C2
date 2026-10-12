#!/usr/bin/env python3
"""Safe, idempotent P7-to-P8 title layout patch for AlwanCinema/Nuvio."""
from pathlib import Path
import base64, gzip, hashlib, json, subprocess, sys

kit=Path(__file__).resolve().parent
root=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
manifest=json.loads((kit/'manifest.json').read_text())
updated=0
for name,hashes in manifest.items():
    path=root/name
    if not path.is_file(): raise SystemExit('Required Nuvio source missing: '+name)
    current=hashlib.sha256(path.read_bytes()).hexdigest()
    if current == hashes['new']: continue
    if current != hashes['old']:
        raise SystemExit('Unrecognized base; source unchanged: '+name)
    updated+=1
if not updated:
    print('P8 already applied; no changes')
    raise SystemExit(0)
if updated != len(manifest):
    raise SystemExit('Partially modified source; stop to avoid mixed state')
patch=gzip.decompress(base64.b64decode((kit/'p8-title-layout.patch.gz.b64').read_bytes()))
cmd=['git','-C',str(root),'apply','--check','-']
p=subprocess.run(cmd,input=patch,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
if p.returncode: raise SystemExit('Patch preflight failed: '+p.stderr.decode(errors='replace'))
p=subprocess.run(cmd[:-2]+['-'],input=patch,stdout=subprocess.PIPE,stderr=subprocess.PIPE) if False else subprocess.run(['git','-C',str(root),'apply','-'],input=patch,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
if p.returncode: raise SystemExit('Patch apply failed: '+p.stderr.decode(errors='replace'))
for name,hashes in manifest.items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==hashes['new'],name
print('P8 title layout applied and verified to '+str(root))