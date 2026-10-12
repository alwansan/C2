# قاعدة التطوير الدائمة في AlwanCinema/Nuvio

**مطلوب لكل تعديل UI/UX جديد:** استخدم مكوّناً قائماً من Nuvio الأصلي 0.5.9 أو إصداره المعتمد كأساس، وانسخ آلية عمله ولغة تصميمه ثم عدّل الخصائص المطلوبة، بدلاً من إنشاء بطاقة/زر/درج جديد بنمط منفصل. لا تستنسخ شكل سينمانا القديم.

## مراجع ملزمة قبل كل تعديل

- البطاقات والأسطح والأزرار: `composeApp/src/commonMain/kotlin/com/nuvio/app/core/ui/Components.kt`
- الحلقات (نمط القائمة)، الأبعاد والكفرات: `features/details/components/DetailSeriesContent.kt` (`EpisodeListCard`).
- بطاقات الملصقات: `core/ui/ShelfComponents.kt` و`features/home/components/HomePosterCard.kt`.
- قوائم الاختيار: `core/ui/DropdownChip.kt` (`NuvioDropdownChip`, `NuvioDropdownOption`).
- الأدراج: `core/ui/BottomSheet.kt` (`NuvioModalBottomSheet`, `NuvioBottomSheetActionRow`).
- حقل البحث: `core/ui/Components.kt` (`NuvioInputField`).
- تخصيص الغلاف والصورة الاحتياطية: `core/poster/CustomPosterUrlRepository.kt`, `CustomPosterOverlay.kt`, `CustomPosterFallbackInterceptor.kt`, `CustomPosterScreen.kt`.
- تصميم البطاقات من الإعدادات: `core/ui/PosterCardStyleRepository.kt` و`PosterCardStyleCompose.kt`.

## شروط قبول كل إضافة

1. يستخدم ألوان `MaterialTheme.nuvio` وأشكال البطاقات وأحجام المسافة الأصلية، دون قيم سوداء/بيضاء ثابتة سوى ما يستخدمه المكوّن المصدر فعلاً.
2. يعمل بالعربية والإنجليزية؛ يتبع اتجاه RTL/LTR الطبيعي، ولا يفرض `LayoutDirection.Ltr` على محتوى عربي.
3. يدعم تحكم المستخدم في أبعاد الملصقات وزوايا البطاقات، وأنماط الكفرات وfallback إذا كان يعرض صوراً.
4. يحتفظ بإجراءات الضغط المطوّل وأزرار الرجوع وسلوك الشاشات الأصلي.
5. لا يجري تحميل صور أو معالجة ملفات على الخيط الرئيسي، ويستخدم LazyColumn/LazyVerticalGrid في القوائم الكبيرة.
6. لا يغيّر نموذج بيانات المزود ولا صلاحيات التخزين القسرية إن لم تكن لازمة للوظيفة.
7. يرفق اختبار البناء والارتداد (regression) عند تغيير سلوك وظيفي.

هذه قاعدة مراجعة ملزمة لهذا المستودع في التعديلات اللاحقة، لا وصفاً زخرفياً للشكل.