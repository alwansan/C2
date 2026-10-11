# AlwanCinema Performance P4 — تحسين السلاسة والحساب

أساس الإصدار: Nuvio 0.5.9-beta + تعديلات P3. يحتوي P4 على تغييرات محدودة بالملفات التالية فقط:

- `AvatarPicker.kt`: قائمة صور رمزية كسولة ذات ارتفاع محدود (5 صفوف ظاهرة). لم يعد Compose ينشئ عشرات أو مئات عناصر الصور مرة واحدة. يتم تحميل الصور عند الوصول إليها.
- `AvatarRepository.kt`: إزالة المعرّفات المكررة من الكتالوج منعًا للتعطل مع مفاتيح Lazy Grid.
- `AlwanStorage.kt` و`MainActivity.kt` و`AlwanStorageGate.kt`: إذا وجدت نسخة بيانات يجب استعادتها أو ترحيلها، تُنفّذ القراءة وفك الضغط على Dispatcher.IO وتظهر شاشة انتظار غير متجمدة. لا يبدأ نظام الحساب قبل انتهاء الاستعادة.
- بناء GitHub Actions: يجلب APK Nuvio الرسمي 0.5.9-beta من المستودع الرسمي ويتحقق من بصمة SHA-256 ثم يقرأ إعدادات `anon` العامة ويضعها في `local.properties` *داخل عامل البناء فقط*. لا يُرفق `local.properties` في النتائج ولا يُضاف للمستودع.

## البناء المحلي

يحتاج تطبيق P3 أولاً ثم P4. يمكن بناء APK على جهاز يحتوي Android SDK وGradle وJDK مناسبين:

```bash
python nuvio-mods/install.py nuvio
python nuvio-mods/apply_performance_p3.py nuvio
python nuvio-mods/apply_performance_p4.py nuvio
python nuvio-mods/configure_public_backend_from_official_apk.py original-0.5.9.apk nuvio
cd nuvio
./gradlew :composeApp:verifyAlwanAccountBackend -Pnuvio.android.distribution=full -Pnuvio.ios.distribution=appstore
./gradlew :androidApp:assembleFullRelease -Pnuvio.android.distribution=full -Pnuvio.ios.distribution=appstore -Palwan.testSigning=true
```

## قيود الاختبار

نجاح البناء لا يثبت الأداء على الهاتف. يجب اختبار سرعة بدء التشغيل والانتقال بين الأقسام، قائمة الصور، إنشاء الملف الشخصي، والحساب الفعلي. التوقيع التجريبي قد يختلف عن النسخ السابقة، لذا يلزم نسخ `AlwanCinema` احتياطياً قبل حذف تطبيق قديم. لم تتغير صلاحيات الحساب أو بيانات تسجيل الدخول.