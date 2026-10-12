#!/usr/bin/env python3
"""Check P7 compressed patch integrity and output source mapping."""
from pathlib import Path
import sys,base64,gzip,re
data=gzip.decompress(base64.b64decode(Path(__file__).with_name('p7.diff.gz.b64').read_bytes()))
assert data.startswith(b'diff --git a/'), 'Invalid unified Git patch'
for path in [
    b'core/ui/FontSizeSettings.kt',
    b'features/settings/FontSizeSettingsPage.kt',
    b'features/settings/SettingsModels.kt',
    b'features/settings/ThemeSettingsStorage.kt',
    b'features/details/components/DetailSeriesContent.kt'
]:
    assert path in data, 'Missing audited typography integration: '+repr(path)
if len(sys.argv)>1:
    src=Path(sys.argv[1])
    page=(src/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/settings/FontSizeSettingsPage.kt').read_text()
    assert 'FontAreaSlider' in page and 'SettingsNavigationRow' in page
    base=(src/'composeApp/src/commonMain/kotlin/com/nuvio/app/core/ui/FontSizeSettings.kt').read_text()
    assert 'Profile' not in base or 'profiles' in base
    assert 'FontScaleRegion' in base and 'serialize' in base
print('P7 patch verified:', len(data), 'bytes')
