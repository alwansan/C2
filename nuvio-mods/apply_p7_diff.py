#!/usr/bin/env python3
"""Apply P7 against the pinned P6 source. Requires git, safe idempotent patch."""
from pathlib import Path
import sys,base64,gzip,subprocess
if len(sys.argv)!=2:raise SystemExit('Usage: apply_p7_diff.py <P6 source root>')
root=Path(sys.argv[1]).resolve()
data=gzip.decompress(base64.b64decode(Path(__file__).with_name('p7.diff.gz.b64').read_bytes()))
check=subprocess.run(['git','-C',str(root),'apply','--check','-'],input=data,capture_output=True)
if check.returncode:
    reverse=subprocess.run(['git','-C',str(root),'apply','--reverse','--check','-'],input=data,capture_output=True)
    if reverse.returncode==0:
        print('P7 already installed');sys.exit(0)
    raise SystemExit('Unexpected P6 base; stopping: '+check.stderr.decode('utf-8','replace')[:3500])
apply=subprocess.run(['git','-C',str(root),'apply','-'],input=data,capture_output=True)
if apply.returncode:raise SystemExit('Patch failed: '+apply.stderr.decode('utf-8','replace'))
print('P7 font groups applied')