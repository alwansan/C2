#!/usr/bin/env python3
"""Source-level regression checks for P9, run from repo root with Android project path."""
import sys
from pathlib import Path
from xml.etree import ElementTree
base=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
app=base/'composeApp/src/commonMain'
code=app/'kotlin/com/nuvio/app'
def read(relative):return (code/relative).read_text()
card=read('features/details/components/DetailSeriesContent.kt')
detail=read('features/details/MetaDetailsScreen.kt')
repo=read('features/details/MetaScreenSettingsRepository.kt')
sheet=read('features/cinemana/CinemanaSingleEpisodeDownloadSheet.kt')
settings=read('features/settings/MetaScreenSettingsPage.kt')
assert 'onEpisodeDownload?.let' in card
assert 'Icons.Rounded.DownloadForOffline' in card
assert 'MaterialTheme.colorScheme.onSurface' in card
assert 'seasonEpisodes.take(5)' in card
assert 'episodes.take(5)' in detail
assert 'EpisodeShowAllFooter(' in card and 'EpisodeShowAllFooter(' in detail
assert 'NuvioModalBottomSheet(' in card and 'DetailSeriesListEpisode(' in card
assert 'KeyboardType.Number' in card
assert "in '٠'..'٩'" in card and "in '۰'..'۹'" in card
assert 'episodeShowAllEnabled' in repo and '"episode_show_all_enabled"' in repo
assert 'onCheckedChange = MetaScreenSettingsRepository::setEpisodeShowAllEnabled' in settings
assert 'CinemanaSingleEpisodeDownloadSheet' in detail
assert 'DownloadsRepository.enqueueFromStream' in sheet
assert 'it.parentMetaId == meta.id' in sheet # duplicate guard
assert 'if (!cinemanaDownloadPermission())' in sheet
for locale in ('values','values-ar'):
    tree=ElementTree.parse(app/'composeResources'/locale/'strings.xml')
    names={item.get('name') for item in tree.getroot()}
    assert {'settings_episode_show_all','settings_episode_show_all_description','episode_show_all','episode_search_number','episode_no_search_results','download_episode_action'} <= names
print('P9 source contracts passed: list limit / RTL-adaptive icon / one-episode enqueue / saved setting / native sheet / localized search')