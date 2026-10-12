from pathlib import Path
import base64,gzip,json,hashlib
from tempfile import TemporaryDirectory
from subprocess import run
base=Path(__file__).parent
entries=json.loads(gzip.decompress(base64.b64decode((base/'performance_p7.patch.gz.b64').read_bytes())))
assert entries
for e in entries:
    assert '..' not in Path(e['path']).parts
    assert hashlib.sha256(base64.b64decode(e['content'])).hexdigest()==e['new_sha']
with TemporaryDirectory() as d:
    root=Path(d)
    for e in entries:
        p=root/e['path'];p.parent.mkdir(parents=True,exist_ok=True)
        # For a full regression run point at the P6 source and use the installer twice instead.
        assert len(e['old_sha'])==64
    print('Validated',len(entries),'portable patch entries and checksums')