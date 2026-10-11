import importlib.util,unittest,tempfile,shutil
from pathlib import Path
spec=importlib.util.spec_from_file_location('installer',Path(__file__).with_name('install.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
root=Path(__file__).resolve().parent.parent
class InstallerTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.source=Path(self.temp.name)/'source';shutil.copytree(root/'clean-source/NuvioMobile-0.5.9-beta',self.source)
 def tearDown(self):self.temp.cleanup()
 def test_apply_twice(self):
  self.assertGreater(m.install(self.source,root/'modkit','com.nuvio.cinemana'),0);self.assertEqual(m.install(self.source,root/'modkit','com.nuvio.cinemana'),0)
 def test_custom_package_reapply_after_upstream_addition(self):
  self.assertGreater(m.install(self.source,root/'modkit','com.alwan.cinema'),0)
  target=self.source/'androidApp/build.gradle.kts';target.write_text(target.read_text()+'\n// Later upstream addition\n')
  self.assertEqual(m.install(self.source,root/'modkit','com.alwan.cinema'),0)
 def test_preflight_failure_writes_nothing(self):
  target=self.source/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/addons/AddonHttpClient.kt';target.write_text('unsupported source')
  before=(self.source/'androidApp/build.gradle.kts').read_bytes()
  with self.assertRaises(ValueError):m.install(self.source,root/'modkit','com.nuvio.cinemana')
  self.assertEqual((self.source/'androidApp/build.gradle.kts').read_bytes(),before)
 def test_additive_upstream_change(self):
  target=self.source/'composeApp/src/commonMain/kotlin/com/nuvio/app/features/addons/AddonHttpClient.kt';target.write_text(target.read_text()+'\n// Upstream addition\n')
  self.assertGreater(m.install(self.source,root/'modkit','com.nuvio.cinemana'),0);self.assertIn('// Upstream addition',target.read_text())
if __name__=='__main__':unittest.main()
