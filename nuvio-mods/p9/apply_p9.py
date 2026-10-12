#!/usr/bin/env python3
"""Apply P9 changes to the full P8 source root. Safe to rerun."""
import sys,subprocess,base64,gzip,pathlib,tempfile
base=pathlib.Path(__file__).resolve().parent
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
raw=gzip.decompress(base64.b64decode((base/'P9.patch.gz.b64').read_bytes()))
with tempfile.NamedTemporaryFile(suffix='.patch') as patch:
    patch.write(raw);patch.flush()
    check=subprocess.run(['git','apply','--check',patch.name],cwd=root,capture_output=True,text=True)
    if check.returncode==0:
        subprocess.run(['git','apply',patch.name],cwd=root,check=True)
        print('P9 episode download/show-all patch applied')
    else:
        reverse=subprocess.run(['git','apply','--reverse','--check',patch.name],cwd=root,capture_output=True,text=True)
        if reverse.returncode==0:print('P9 already applied')
        else:raise SystemExit('P9 patch conflicts with source:\n'+check.stderr)