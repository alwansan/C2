#!/usr/bin/env python3
"""Apply the audited P4 delta to a checked-out, fully patched P3 Nuvio tree."""
from pathlib import Path
import base64,gzip,subprocess,sys
root=Path(sys.argv[1]).resolve(strict=True)
kit=Path(__file__).resolve().parent
if not (root/'composeApp/build.gradle.kts').is_file():
    raise ValueError('Expected Nuvio source checkout')
patch=gzip.decompress(base64.b64decode((kit/'performance_p4.patch.gz.b64').read_text()))
check=subprocess.run(['git','apply','--check','-'],input=patch,cwd=root,capture_output=True)
if check.returncode:
    reversed_check=subprocess.run(['git','apply','--reverse','--check','-'],input=patch,cwd=root,capture_output=True)
    if reversed_check.returncode==0:
        print('P4 already applied')
        sys.exit(0)
    raise RuntimeError('P4 source mismatch; refusing to damage the checkout: '+check.stderr.decode('utf-8','replace'))
subprocess.run(['git','apply','-'],input=patch,cwd=root,check=True)
print('P4 performance delta applied cleanly')