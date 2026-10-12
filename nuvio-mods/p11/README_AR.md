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
6. لمزود سينمانا فقط: FFmpegKit remux دون إعادة ضغط الفيديو/الصوت، مع مضاعفة شروط السلامة: تتحقق ترويسة EBML وحجم ناتج MKV، وتتم الترقية بعد نجاح كتابة الملف المؤقت، مع حفظ القديم مؤقتاً واسترجاعه عند فشل الترقية.
7. إذا تعذّر MKV يبقى الفيديو الأصلي قابلاً للتشغيل، وتُجدول 3 إعادة محاولات في WorkManager للترجمة/الدمج. بعد النجاح يُحدَّث السجل ويُستخدم ملف MKV النهائي.

## خصائص سينمانا التي لم تُنقل حرفياً بعد — مهام مفتوحة
**هذه ليست نسخة مطابقة 100% من محرك سينمانا**؛ إذ يتطلب النقل الحرفي فك ارتباط قرابة 12 ألف كلاس من Smali بمكتبات Android والـRoom والـFragment القديمة. الذي نُقل هنا هو ضمانات التنفيذ الرئيسية مع محرك Kotlin الحالي، وليس قاعدة بيانات سينمانا ولا نفس ملفاته التنفيذية.
- ترقية/توافق قاعدة بيانات التحميل القديمة لـCinemana (Room وعمليات `DB_PROMOTE`, `SORT_DB_PROMOTE`) وتحويل سجلاتها إلى سجل Nuvio، خصوصاً عند نقل تنزيلات أقدم جداً.
- تجزئة الفيديو الواحدة إلى اتصالات HTTP متعددة concurrent HTTP segments حسب إعداد سينمانا (P11 يدعم تنزيلات مستقلة متزامنة مع الاستئناف، لا تجزئة كل ملف بعد).
- إعادة التفاوض مع مزود سينمانا على رابط فيديو موقّع انتهت صلاحيته؛ خطأ 403 لا يمكن إصلاحه بإعادة إرسال الرابط نفسه.
- تأكيد اكتمال جميع ترجمات المزود، بما فيها الترجمة المحسنة، يتطلب فحص المخرجات لكل عنوان على جهازك، ويدعم نظام manifest ملفات SRT وASS المجلوبة عبر مزود Nuvio.
- اختبار موثوق للأداء والتشغيل في الخلفية على جهاز POCO، وحالات إعادة الإقلاع وفشل التخزين وإلغاء الإذن أثناء النقل. قيود Android النظامية، خاصة حد خدمة `dataSync`، لا تُزال برمجياً بمجرد طلب استثناء البطارية.

## الاعتماديات والروابط الأصلية
- `FileDownloader 1.7.7` من سينمانا: https://repo.maven.apache.org/maven2/com/liulishuo/filedownloader/library/1.7.7/library-1.7.7.aar — **مرجع فقط**؛ لا تضع ملفه المفكوك أو Smali داخل Nuvio إلى جانب WorkManager لأن ذلك يكرر خدمتي التحميل ويخلق تعارضات. عند اعتماد هذا المحرك مستقبلاً يُضاف كـAAR أصلي ويحذف المحرك البديل أو يُعزل عنه.
- الكود الرسمي: https://github.com/lingochamp/FileDownloader
- FFmpegKit (maintained) `ffmpeg-kit-min:8.1.7`: https://repo.maven.apache.org/maven2/dev/ffmpegkit-maintained/ffmpeg-kit-min/8.1.7/ffmpeg-kit-min-8.1.7.aar — يثبّته Gradle آلياً ضمن P11، لذلك لا يلزم رفع الملف ما دام الاتصال بمستودع Maven يعمل.
- المصدر: https://github.com/ffmpegkit-maintained/ffmpeg/releases
- ملاحظة: FFmpegKit القديم من arthenica توقّف وأُزيلت إصداراته التاريخية من Maven Central؛ لا تعتمد عليه. الحزمة المعتمدة من المجتمع LGPL، تحقق من شروط ترخيصها عند النشر.

## ملفات المصدر التي تغيرت
تتضمن ModKit فهرس SHA-256 ووسيلة تطبيق التغييرات فقط، ولا تحتوي نسخ Smali من Cinemana ولا كلمات مرور أو مفتاح توقيع.