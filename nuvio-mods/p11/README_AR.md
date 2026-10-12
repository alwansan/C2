# AlwanCinema P11 — ترحيل طبقة التحميل من سينمانا إلى Nuvio (مرحلة تكامل فعلية)

## المصادر التي فُحصت
- `Cinemana_Pro_50382_PATCH238_TMDB_3Before_3After_Full_Source.zip`: ملفات Smali والأجزاء غير المبهمة من `com.shabakaty.cinemana.features`، وخصوصاً `MkvExporter`, `MkvManifestStore`, `MkvStateStore`, `MkvReconciler`, `DownloadTrace`, `LocalMkvResolver` و`com.liulishuo.filedownloader`.
- `AlwanCinema_P10_Full_Source.zip`: نظام Nuvio Kotlin الحالي (`DownloadsRepository`, `AndroidDownloadScheduler`, `AndroidDownloadTransfer`, `DownloadSubtitles`, `DownloadSubtitleStorage`) وكذلك بنية تخزين `AlwanStorage`.

## البنية المنفذة في هذه المرحلة

```text
/storage/emulated/0/AlwanCinema/
  work/
    data/download-transfers/       # سجلات الطابور الذرّية؛ محفوظة عند انهيار العملية
    data/nuvio-state.zip           # ملف النسخ الاحتياطي السابق
    mkv/                            # ملفات الفيديو النهائية وملفات .subtitles الجانبية
    tmp/                            # تنزيلات .part المعاد استئنافها
    tmp/remux/                      # نتيجة MKV مؤقتة، لا تظهر كملف مكتمل
    subtitles/                      # محجوزة لملفات الترجمات الإضافية المستقبلية
    logs/download.log               # تشخيص محدود بدون روابط/توكنات
    logs/performance.log
```

يجري ترحيل المجلدين القديمين `AlwanCinema/mkv` و`AlwanCinema/logs` في الخلفية. الملفات الحديثة التعديل أو المتعارضة لا تُستبدل، ويحاول قارئ التنزيل الوصول للملف السابق إذا تعذّر نقله. **لا تحذف الملفات القديمة قبل التأكد من الترحيل على جهازك.**

## دورة العمل
1. طلب التنزيل من واجهة Nuvio -> طلب صلاحية التخزين عند اللزوم -> عرض استثناء تحسين البطارية مرة واحدة فقط، عند بدء تنزيل بموافقة المستخدم، وبصورة لا تمنع التنزيل عند الرفض.
2. إنشاء سجل DownloadItem وطابور Android (Android 14+ JobScheduler user-initiated، وأقدم من ذلك WorkManager مع foreground notification حسب سياسة الإصدار).
3. حدّ أقصى 3 عمليات فيديو متزامنة؛ تنزيل عبر HTTP `Range`/`If-Range` إلى `work/tmp/*.part`، ومنع قبول فيديو ناقص إذا عُرف الحجم المتوقع.
4. محاولة الاستئناف بعد انقطاع الاتصال؛ 8 محاولات في حالات HTTP 408/429/5xx وIOException مع backoff من مدير النظام. لا تعاد تلقائياً الطلبات المرفوضة 403/404.
5. نقل الجزء المكتمل إلى `work/mkv` أولاً، ثم جلب الترجمات الخارجية حتى لا تؤخر بدء الفيديو. يحتوي manifest على حالة `complete` ولا يُعلَن مكتملًا إذا فشل جلب ترجمة معلومة.
6. لمزود سينمانا فقط: برنامج FFmpeg مستقل مأخوذ من سينمانا، remux دون إعادة ضغط الفيديو/الصوت، مع مضاعفة شروط السلامة: تتحقق ترويسة EBML وحجم ناتج MKV، وتتم الترقية بعد نجاح كتابة الملف المؤقت، مع حفظ القديم مؤقتاً واسترجاعه عند فشل الترقية.
7. إذا تعذّر MKV يبقى الفيديو الأصلي قابلاً للتشغيل، وتُجدول 3 إعادة محاولات في WorkManager للترجمة/الدمج. بعد النجاح يُحدَّث السجل ويُستخدم ملف MKV النهائي.

## خصائص سينمانا التي لم تُنقل حرفياً بعد — مهام مفتوحة
**هذه ليست نسخة مطابقة 100% من محرك سينمانا**؛ إذ يتطلب النقل الحرفي فك ارتباط آلاف الكلاسات من Smali بمكتبات Android والـRoom والـFragment القديمة. الذي نُقل هنا هو ضمانات التنفيذ الرئيسية مع محرك Kotlin الحالي، وليس قاعدة بيانات سينمانا ولا نفس ملفاته التنفيذية.
- ترقية/توافق قاعدة بيانات التحميل القديمة لـCinemana (Room وعمليات `DB_PROMOTE`, `SORT_DB_PROMOTE`) وتحويل سجلاتها إلى سجل Nuvio، خصوصاً عند نقل تنزيلات أقدم جداً.
- تجزئة الفيديو الواحدة إلى اتصالات HTTP متعددة concurrent HTTP segments حسب إعداد سينمانا (P11 يدعم تنزيلات مستقلة متزامنة مع الاستئناف، لا تجزئة كل ملف بعد).
- إعادة التفاوض مع مزود سينمانا على رابط فيديو موقّع انتهت صلاحيته؛ خطأ 403 لا يمكن إصلاحه بإعادة إرسال الرابط نفسه.
- تأكيد اكتمال جميع ترجمات المزود، بما فيها الترجمة المحسنة، يتطلب فحص المخرجات لكل عنوان على جهازك، ويدعم نظام manifest ملفات SRT وASS المجلوبة عبر مزود Nuvio.
- اختبار موثوق للأداء والتشغيل في الخلفية على جهاز POCO، وحالات إعادة الإقلاع وفشل التخزين وإلغاء الإذن أثناء النقل. قيود Android النظامية، خاصة حد خدمة `dataSync`، لا تُزال برمجياً بمجرد طلب استثناء البطارية.

## الاعتماديات والروابط الأصلية
- `FileDownloader 1.7.7` من سينمانا: https://repo.maven.apache.org/maven2/com/liulishuo/filedownloader/library/1.7.7/library-1.7.7.aar — **مرجع فقط**؛ لا تضع ملفه المفكوك أو Smali داخل Nuvio إلى جانب WorkManager لأن ذلك يكرر خدمتي التحميل ويخلق تعارضات. عند اعتماد هذا المحرك مستقبلاً يُضاف كـAAR أصلي ويحذف المحرك البديل أو يُعزل عنه.
- الكود الرسمي: https://github.com/lingochamp/FileDownloader
- FFmpeg CLI المستقل (المطابق تماماً للملف الموجود في سينمانا PATCH238)، Android arm64، 16KB:
  https://raw.githubusercontent.com/hzw1199/Android-FFmpeg-Prebuilt/90231cc0105aef4f76926b911535f5eb73511b86/ffmpeg-8.1.1/bin/ffmpeg
  SHA-256: `480defd776199b5434008565974de5bf99822371c3cd9c1f130fda2c57de6439`.
  ينزَّل في GitHub Actions آلياً ويوضع باسم `composeApp/src/full/jniLibs/arm64-v8a/libffmpeg.so` ليُستخرج في `nativeLibraryDir`، لا يخلط مكتبات MPV/FFmpegKit.
- شفرة ومعلومات ترخيص LGPL للمشروع المستقل: https://github.com/hzw1199/Android-FFmpeg-Prebuilt
- السبب: إضافة AAR من FFmpegKit مع MPV سببت تعارضاً فعلياً بين `libavdevice.so` من نسختين مختلفتين. مجرد `pickFirst` ليس حلاً آمناً.

## ملفات المصدر التي تغيرت
تتضمن ModKit فهرس SHA-256 ووسيلة تطبيق التغييرات فقط، ولا تحتوي نسخ Smali من Cinemana ولا كلمات مرور أو مفتاح توقيع.