#!/usr/bin/env python3
"""Quick source/UX contract checks; Android compile must still pass separately."""
from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
source = (root / 'composeApp/src/commonMain/kotlin/com/nuvio/app/features/search/AlwanSearchRows.kt').read_text()
checks = {
    'white foreground from Nuvio tokens': 'color = MaterialTheme.nuvio.colors.textPrimary' in source,
    'white filter icon': 'tint = tokens.colors.textPrimary' in source,
    'filter at physical left for RTL and LTR': 'if (!rtl) {' in source and 'if (rtl) {' in source and source.count('SearchFilterIcon(state.hasActiveFilters()') == 2,
    'Nuvio chip styling': 'tokens.colors.overlaySelected' in source and 'tokens.colors.borderDefault else tokens.colors.borderStrong' in source and 'tokens.colors.textMuted' in source,
    'type order preserved': source.index('"all" to tr(') < source.index('"movie" to tr(') < source.index('"series" to tr('),
    'shorter results': 'maxOf(136, actualPosterWidth * 4 / 3)' in source and '.height(cardHeight)' in source,
    'title higher and spaced': '.padding(horizontal = 12.dp, vertical = 10.dp)' in source and 'Modifier.padding(bottom = 3.dp)' in source,
    'inset image matches reference': '.padding(horizontal = 8.dp, vertical = 9.dp)' in source,
    'retains original custom poster and fallback': 'CustomPosterFallbackInterceptor.FALLBACK_URL_KEY' in source and 'CustomPosterScreen.SEARCH' in source,
    'retains original filter and long click': 'filterAlwanSearchResults(originalRows, state)' in source and 'combinedClickable(onClick = onClick, onLongClick = onLongClick)' in source,
}
for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL') + '  ' + name)
if not all(checks.values()):
    raise SystemExit(1)
print(f'{len(checks)}/{len(checks)} P6 UI source checks passed.')