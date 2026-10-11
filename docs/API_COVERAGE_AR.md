# جرد واجهات المصدر وحدود تغطية الإضافة

تم استخراج **36 واجهة** من ApiServices، دون حذف عمليات الحساب من الجرد. جرد المصدر لا يساوي ادعاء تنفيذ جميع عملياته في بروتوكول الإضافات. وظائف المحتوى التي تنفذها الإضافة مذكورة أدناه، وما يتجاوز البروتوكول معلن صراحة.

| # | الطريقة | المسار الأصلي | التغطية |
|---|---|---|---|
| 1 | GET | `allVideoInfo/id/{videoNb}` | `meta` + حقل `cinemana` بكامل رد التفاصيل |
| 2 | POST | `logout/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 3 | POST | `addLike/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 4 | GET | `categories` | اكتشاف التصنيفات ولغات كل تصنيف؛ كتالوج موحد للتصنيف مع فلتر لغة |
| 5 | POST | `commentSpam/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 6 | GET | `getCollection/collectionID/{id}/level/{parentalLevel}` | اكتشاف كل فروع التجميعات، وكتالوج مستقل لكل فرع |
| 7 | GET | `AdvancedSearch` | كتالوجا البحث بكل صفحاته وخياراته الأصلية |
| 8 | GET | `collectionsId/level/{parentalLevel}` | كتالوج كل تجميعة أصلية |
| 9 | GET | `userSettings/lang/{language}` | إعدادات حساب سينمانا؛ ليست موردًا قياسيًا. غير منفذة |
| 10 | GET | `memberCheckVideoStatus/id/{videoNb}` | حالة المستخدم لهذا العمل؛ ليست ملكية مكتبة Nuvio. غير منفذة |
| 11 | GET | `videoSeason/id/{rootEpisodeId}` | `meta.videos` + بيانات الحلقات الخام |
| 12 | GET | `banner/level/{parentalLevel}` | كتالوج المحتوى المميز حسب رد المزود |
| 13 | POST | `removeFromHistory/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 14 | POST | `history/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 15 | POST | `addComment/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 16 | GET | `newlyVideosItems/level/{parentalLevel}/offset/12/` | كتالوج الحديث المحدود بـ12 في عقده الأصلي؛ بقية المحتوى في الكتالوج العام |
| 17 | GET | `videoComment/id/{videoNb}` | امتداد قراءة `/native/comments/...`؛ ليس قائمة تعليقات ضمن عميل Stremio |
| 18 | GET | `videoGroups/lang/{language}/level/{parentalLevel}` | كتالوجات مجموعات الرئيسية الأصلية |
| 19 | GET | `commentRules` | قواعد التعليق؛ غير منفذة في addon القياسي |
| 20 | POST | `changeParentalLevel` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 21 | GET | `https://6b1m6vnfz2jk.statuspage.io/api/v2/components.json` | حالة خدمة المصدر. غير منفذة؛ تشخيص الإضافة يفحص API مباشرة |
| 22 | POST | `highlightEpisode/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 23 | POST | `UserTranslationSettings` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 24 | GET | `video/V/2` | تصفح الأعمال والتصنيف واللغة وترتيب المصدر |
| 25 | POST | `@Url — dynamic` | طلب توصيات POST إلى URL ديناميكي (@Url). لم نثبت عنوان الاستضافة الحي؛ غير منفذ |
| 26 | POST | `get_subscriptions` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 27 | POST | `get_notifications` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 28 | POST | `updateComment/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 29 | POST | `login/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 30 | POST | `addToHistory/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 31 | GET | `videoListPagination` | تصفح كل صفحات المجموعة برقمها الأصلي |
| 32 | POST | `add_subscriptions/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 33 | GET | `staff/actorID/{actorID}/level/{level}` | امتداد قراءة `/native/staff/...`؛ بحث الطاقم متاح عبر AdvancedSearch |
| 34 | POST | `removeComment/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 35 | POST | `remove_subscriptions/` | عملية حساب/كتابة/إشعار/اشتراك في سينمانا؛ لا مورد قياسي يقابلها. غير منفذة |
| 36 | GET | `transcoddedFiles/id/{videoNb}` | `stream` لجميع الجودات والحاويات والروابط الأصلية |

## معلمات الطلب الأصلية

يرسل المشروع نفس تهجئة المعلمات ولا يصححها إلى أسماء API مفترضة:

| المسار | المعلمات |
|---|---|
| `allVideoInfo/id/{videoNb}` | `videoNb` |
| `categories` | لا يوجد |
| `getCollection/collectionID/{id}/level/{parentalLevel}` | `parentalLevel`, `id` |
| `AdvancedSearch` | `videoTitle`, `staffTitle`, `type`, `category_id`, `star`, `page`, `level` |
| `collectionsId/level/{parentalLevel}` | `parentalLevel` |
| `videoSeason/id/{rootEpisodeId}` | `rootEpisodeId` |
| `banner/level/{parentalLevel}` | `parentalLevel` |
| `newlyVideosItems/level/{parentalLevel}/offset/12/` | `parentalLevel` |
| `videoComment/id/{videoNb}` | `videoNb` |
| `videoGroups/lang/{language}/level/{parentalLevel}` | `language`, `parentalLevel` |
| `video/V/2` | `categoryNb`, `videoKind`, `langNb`, `itemsPerPage`, `pageNumber`, `level`, `sortParam` |
| `videoListPagination` | `groupID`, `level`, `itemsPerPage`, `page` |
| `staff/actorID/{actorID}/level/{level}` | `actorID`, `level` |
| `transcoddedFiles/id/{videoNb}` | `videoNb` |

## جميع حقول النماذج المرصودة

الجرد التالي يشمل 27 ملف نموذج Remote وحقوله الموسومة باسم JSON. تفاصيل النوع وSHA-256 لكل ملف محفوظة في `evidence/native-models.json`. لا توجد افتراضات حقول مستنبطة من أسماء واجهات فقط.

| النموذج | حقول JSON |
|---|---|
| `AvailableYearsApi` | `caption`, `value` |
| `RecommendationsApi` | `expirationDate`, `movieId`, `movieName`, `recommendations`, `temp` |
| `RecommendationsRequest` | `MovieId`, `MovieName`, `ReProcessIfExpired` |
| `StatusApi$StatusComponentApi` | `components`, `created_at`, `description`, `group`, `group_id`, `id`, `name`, `only_show_if_degraded`, `page_id`, `position`, `showcase`, `start_date`, `status`, `updated_at` |
| `StatusApi$StatusPageApi` | `id`, `name`, `time_zone`, `updated_at`, `url` |
| `StatusApi` | `components`, `page` |
| `TranscodeFileApi` | `container`, `name`, `resolution`, `transcoddedFileName`, `videoUrl` |
| `VideoModelApi$CategoryApi` | `ar_title`, `en_title` |
| `VideoModelApi$IntroSkippingApi` | `control_level`, `end`, `start` |
| `VideoModelApi$SkippingDurationsApi` | `end`, `start` |
| `VideoModelApi$StaffsInfoApi` | `name`, `nb`, `role`, `staff_img`, `staff_img_medium_thumb`, `staff_img_thumb` |
| `VideoModelApi$VideoLanguagesApi` | `ar_title`, `en_title` |
| `VideoModelApi$a` | `id`, `name`, `type`, `extention`, `file` |
| `VideoModelApi` | `actorsInfo`, `ar_content`, `ar_title`, `arTranslationFilePath`, `castable`, `categories`, `custom_ar_title`, `custom_en_title`, `directorsInfo`, `duration`, `en_content`, `en_title`, `episode_flag`, `episodeNummer`, `filmRating`, `hasIntroSkipping`, `imdbUrlRef`, `imgMediumThumbObjUrl`, `imgObjUrl`, `imgThumbObjUrl`, `introSkipping`, `isSpecial`, `itemDate`, `item_order_list`, `kind`, `list_id`, `list_sort_order`, `mDate`, `nb`, `parent_skipping`, `publishDate`, `rate`, `rootSeries`, `season`, `seriesRating`, `showComments`, `skippingDurations`, `stars`, `trailer`, `translations`, `useParentImg`, `videoCommentsNumber`, `videoDisLikesNumber`, `videoLanguages`, `videoLikesNumber`, `videoViewsNumber`, `writersInfo`, `year` |
| `StaffModelApi` | `imgMediumThumbObjUrl`, `imgObjUrl`, `imgThumbObjUrl`, `items`, `role`, `title` |
| `NewCategoryItemApi$NewLanguageItemApi` | `catNb`, `lang_ar_title`, `lang_en_title`, `langFreq`, `langNb` |
| `NewCategoryItemApi` | `ar_title`, `en_title`, `img`, `imgMediumThumb`, `imgMediumThumbObjUrl`, `imgObjUrl`, `imgThumb`, `imgThumbObjUrl`, `langArray`, `nb`, `objectUrlExpiration`, `porder`, `sort`, `updateDateTime` |
| `AdApi` | `beacon`, `description`, `id`, `creative`, `img_url`, `click`, `success`, `type` |
| `CollectionItemApi` | `content`, `display_name`, `groupsID`, `id`, `imgMediumThumbObjUrl`, `imgObjUrl`, `imgThumbObjUrl`, `title` |
| `HomeGroupsApi` | `groups` |
| `VideosGroupApi` | `groupsID`, `hasPagination`, `title`, `content` |
| `LogoutResponseApi` | `dislikeNumebr`, `likeNumber`, `status` |
| `NotificationsListApi` | `new`, `notifications` |
| `UserListApi` | `data`, `status` |
| `UserSettingsApi$ParentalControlApi` | `ageLimit`, `filmRating`, `id`, `name`, `SeriesRating` |
| `UserSettingsApi$UserTranslationApi` | `name`, `status` |
| `UserSettingsApi` | `parentalControl`, `parentalLevelStatus`, `userTranslation` |

## التعامل مع المعلومات التي لا يعرضها العميل

يعرض `meta` حقول Stremio القياسية الممكنة، ويحتفظ برد تفاصيل الفيديو الأصلي في `meta.cinemana`. هذا يشمل معلومات الطاقم وصوره، نسب التقييم، الإعجاب والمشاهدات، `introSkipping / skippingDurations / parent_skipping`، الترجمات، اللغة، ترتيب المجموعة والعلامات الخاصة. الحقول الخام لا تُفعّل تلقائيًا أزرارًا أو ميزات داخل عميل لا يفهمها.

`stream.cinemana` يحفظ حقول ملف الجودة، و`subtitle.cinemana` يحفظ معرف الترجمة ونوعها وصيغتها ولغتها وحالة التحسين. توجد امتدادات `/native/index / details / episodes / transcodes / comments / staff` لقراءة معلومات إضافية عند بناء عميل يدعمها.

بيانات المصادر يعاد جلبها عند الحاجة؛ لا يوضع كل فيلم وحلقة ورابط مؤقت داخل manifest. مواقع الفيديو والترجمة تمر إلى العميل دون رفع ملفات المزود إلى GitHub.

ما لم يُنقل: تسجيل دخول UI لحساب سينمانا، تعديل حالته أو تعليقاته واشتراكاته، التوصيات من عنوان ديناميكي غير مثبت، مشغل Android القديم، DownloadManager/FFmpeg/MKV، التنبيهات الدقيقة وصلاحيات تطبيق Android. إظهار هذه الميزات داخل Nuvio الأصلي يحتاج دعمًا من العميل أو إضافة خارج مواصفة addon؛ ليس بمجرد حقول manifest إضافية.

لا يوجد ادعاء بعدد حي ثابت للأعمال أو الأقسام. قوائم الخادم قد تتغير، واختبار الاتصال فشل في بيئة البناء. معيار الاكتمال هنا: تنفيذ قراءة كل مسارات المحتوى المثبتة في العقد، واكتشاف أقسامها ديناميكيًا، وعدم إخفاء فشل أو قطع صفحات على أنه نجاح.
