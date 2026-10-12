#!/usr/bin/env python3
"""Idempotent P9 -> P10 source update; refuses unknown revisions."""
from pathlib import Path
import hashlib,io,json,tarfile,sys,os,tempfile
kit=Path(__file__).resolve().parent
base=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
manifest=json.loads((kit/'manifest.json').read_text())
def sha(data): return hashlib.sha256(data).hexdigest()
import base64
with tarfile.open(fileobj=io.BytesIO(base64.b64decode((kit/'p10-source.tar.gz.b64').read_bytes()))) as z:
    payload={item.name:z.extractfile(item).read() for item in z if item.isfile()}
for path,m in manifest.items():
    dst=base/path
    current=sha(dst.read_bytes()) if dst.exists() else None
    if current not in {m['before_sha256'],m['after_sha256']}:
        raise SystemExit('Unexpected baseline: '+str(dst))
    if sha(payload[path])!=m['after_sha256']:
        raise SystemExit('Corrupt P10 payload: '+path)
count=0
for path,m in manifest.items():
    dst=base/path
    if dst.exists() and sha(dst.read_bytes())==m['after_sha256']: continue
    dst.parent.mkdir(parents=True,exist_ok=True)
    temp=dst.with_name(dst.name+'.p10tmp')
    temp.write_bytes(payload[path]);os.replace(temp,dst)
    count+=1
print('P10 applied:',count,'modified,',len(manifest)-count,'already current')