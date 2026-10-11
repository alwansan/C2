#!/usr/bin/env python3
"""Transactional Nuvio source mod installer. Python 3.9+, no third-party packages."""
import argparse, base64, hashlib, json, os, re, shutil, sys, tempfile, gzip
from pathlib import Path

def digest(b):return hashlib.sha256(b).hexdigest()
def safe(root, name):
 p=Path(name)
 if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe payload path: '+name)
 dest=root/p
 if not dest.resolve().is_relative_to(root):raise ValueError('Path escapes source: '+name)
 if dest.is_symlink():raise ValueError('Refusing symlink: '+name)
 return dest


def known_preferences(root):
 names={'nuvio_profile_cache','nuvio_auth','nuvio_addons','alwan_layout'}
 for source in (root/'composeApp/src').rglob('*.kt'):
  text=source.read_text()
  constants=dict(re.findall(r'\b(?:const\s+)?val\s+(\w+)\s*=\s*"([^"\n]+)"',text))
  for literal,key in re.findall(r'getSharedPreferences\(\s*(?:"([^"\n]+)"|([A-Za-z_]\w*))',text):
   name=literal or constants.get(key,'')
   if re.fullmatch(r'[A-Za-z0-9_.-]+',name):names.add(name)
 return sorted(names)

def prepare(root, kit, package):
 spec=json.loads((kit/'patches.json').read_text() if (kit/'patches.json').exists() else gzip.decompress((kit/'patches.json.gz').read_bytes()).decode())
 if not (root/'composeApp/build.gradle.kts').is_file():raise ValueError('Choose the Nuvio source root containing composeApp and androidApp')
 names=known_preferences(root)
 names_path='composeApp/src/androidMain/kotlin/com/nuvio/app/core/storage/KnownSharedPreferences.kt'
 names_content=('package com.nuvio.app.core.storage\ninternal object KnownSharedPreferences { val names = listOf('+','.join(json.dumps(n) for n in names)+') }\n').encode()
 spec['files']=[f for f in spec['files'] if f['path']!=names_path]
 spec['files'].append({'path':names_path,'old':None,'new':base64.b64encode(names_content).decode(),'hunks':[]})
 changes=[]
 for item in spec['files']:
  path=safe(root,item['path']);current=path.read_bytes() if path.exists() else None
  payload=base64.b64decode(item['new'])
  if package!='com.nuvio.cinemana' and item['path']=='androidApp/build.gradle.kts':payload=payload.replace(b'com.nuvio.cinemana',package.encode())
  if current==payload:continue
  if item['old'] is None:
   if current is not None:raise ValueError('Existing custom file differs: '+item['path'])
   result=payload
  elif current is None:raise ValueError('Required upstream file missing: '+item['path'])
  elif digest(current)==item['oldHash']:result=payload
  else:
   try: text=current.decode();result=text
   except UnicodeError:raise ValueError('Modified binary cannot be merged: '+item['path'])
   for h in item['hunks']:
    old,new=h['old'],h['new']
    if package!='com.nuvio.cinemana' and item['path']=='androidApp/build.gradle.kts':new=new.replace('com.nuvio.cinemana',package)
    if result.count(old)==1:result=result.replace(old,new,1)
    elif result.count(new)==1:continue
    else:raise ValueError('Upstream changed a required anchor: '+item['path']+'\nNo files have been modified. Review compatibility before applying.')
   result=result.encode()
   if package!='com.nuvio.cinemana' and item['path']=='androidApp/build.gradle.kts':result=result.replace(b'com.nuvio.cinemana',package.encode())
  if result!=current:changes.append((path,current,result))
 return changes

def install(root,kit,package,dry=False):
 changes=prepare(root,kit,package)
 if dry:return len(changes)
 if not changes:return 0
 backup=root/'.alwan-mod-backups';backup.mkdir(exist_ok=True)
 checkpoint=Path(tempfile.mkdtemp(prefix='before-',dir=backup))
 manifest=[]
 for path,old,new in changes:
  name=path.relative_to(root).as_posix();manifest.append({'path':name,'existed':old is not None,'newHash':digest(new)})
  if old is not None:
   b=safe(checkpoint,name);b.parent.mkdir(parents=True,exist_ok=True);b.write_bytes(old)
 (checkpoint/'restore.json').write_text(json.dumps(manifest,indent=2))
 done=[]
 try:
  for path,old,new in changes:
   path.parent.mkdir(parents=True,exist_ok=True)
   temp=path.with_name(path.name+'.alwan-tmp');temp.write_bytes(new);os.replace(temp,path);done.append((path,old))
 except BaseException:
  for path,old in reversed(done):
   if old is None:path.unlink(missing_ok=True)
   else:path.write_bytes(old)
  raise
 return len(changes)

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('source',help='Path to clean Nuvio source root')
 p.add_argument('--dry-run',action='store_true',help='Check compatibility without modifying source')
 p.add_argument('--package',default='com.nuvio.cinemana')
 a=p.parse_args()
 if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+',a.package):p.error('Invalid application package')
 try:n=install(Path(a.source).resolve(),Path(__file__).resolve().parent,a.package,a.dry_run)
 except (ValueError,OSError) as e:print('ERROR: '+str(e),file=sys.stderr);return 1
 print(('Compatible files: ' if a.dry_run else 'Applied files: ')+str(n));return 0
if __name__=='__main__':sys.exit(main())
