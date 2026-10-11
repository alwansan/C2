#!/usr/bin/env python3
"""Apply reviewed P1 -> P3 patch to the pinned Nuvio source. Fail closed."""
from pathlib import Path
import base64, gzip, subprocess, sys, hashlib


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python apply_performance_p3.py /path/to/nuvio")
    source = Path(sys.argv[1]).resolve(strict=True)
    bundle = Path(__file__).with_name("performance_p3.patch.gz.b64")
    patch = gzip.decompress(base64.b64decode(bundle.read_text().strip(), validate=True))
    assert hashlib.sha256(patch).hexdigest() == "216ff7139094b09b06bd643c24ca701bd5fca89bd038992ec121c9a082d90930", "P3 patch checksum mismatch"
    for args in (["patch", "--batch", "--dry-run", "--forward", "-p1"],
                 ["patch", "--batch", "--forward", "-p1"]):
        result = subprocess.run(args, input=patch, cwd=source, capture_output=True)
        if result.returncode:
            print(result.stdout.decode(errors="replace"))
            print(result.stderr.decode(errors="replace"))
            raise SystemExit("Patch mismatch; source differs from reviewed P1 baseline")
    print("P3 changes verified and applied, SHA256", hashlib.sha256(patch).hexdigest())

if __name__ == "__main__":
    main()