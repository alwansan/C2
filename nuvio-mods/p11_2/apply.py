#!/usr/bin/env python3
"""Applies P11.2 over P11.1, with exact file hash preconditions and idempotency."""
import pathlib,sys,io,tarfile,base64,hashlib,json
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'nuvio')
kit=pathlib.Path(__file__).resolve().parent
config=json.loads((kit/'manifest.json').read_text())
archive=base64.b64decode((kit/'p11_2_files.tar.gz.b64').read_bytes())
with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tar:
    for item in config['changes']:
        path=item['path'];target=root/path
        assert target.is_file(),f'Missing expected base source: {path}'
        before=hashlib.sha256(target.read_bytes()).hexdigest()
        if before==item['after_sha256']: continue
        if before!=item['before_sha256']: raise RuntimeError(f'P11.2 base mismatch: {path}; do not overwrite it')
        member=tar.getmember(path)
        contents=tar.extractfile(member).read()
        assert hashlib.sha256(contents).hexdigest()==item['after_sha256']
        target.write_bytes(contents)
        print('P11.2 upgraded',path)
print('P11.2 source hashes OK')