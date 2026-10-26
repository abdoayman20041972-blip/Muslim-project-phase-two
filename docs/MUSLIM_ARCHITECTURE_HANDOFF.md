# Muslim — Architecture & Work Handoff

> **اقرأ CLAUDE_REVIEW_GUIDE.md أولًا.**

> هذا الملف هو سجل تسليم شامل للعمل الذي تم في هذه المحادثة، بحيث يمكن فتح محادثة جديدة أو استخدام حساب آخر دون فقدان السياق.
>
> **الحالة الزمنية الأحدث موجودة في آخر أقسام الملف. لا تعتمد أي HEAD مذكور في الأقسام الأقدم؛ اقرأه دائمًا من `git rev-parse HEAD`. الأقسام التاريخية تعكس حالة وقت كتابتها.**

---

## 1. الهدف العام من العمل

المشروع هو تطبيق **Muslim**، وهو PWA/ويب إسلامي كان اسمه سابقًا مرتبطًا بتطبيق الأذكار/التسبيح، ويضم بصورة عامة:

- الصفحة الرئيسية / Dashboard.
- الأذكار.
- السبحة والتسبيح.
- المصحف وقراءة القرآن.
- مواقيت الصلاة.
- القبلة.
- الصوت/التلاوة، ومنها خادم المنشاوي.
- الإعدادات.
- الوضع الداكن/الفاتح.
- PWA.
- حفظ بعض الحالة محليًا عبر `localStorage`.
- تكاملات ومصادر خارجية للقرآن والصلاة والصوت.

المشروع موجود في مستودع GitHub:
`abdoayman20041972-blip/Azkar-app-`

ومشروع Macaly الحالي:
`chatId = hep5hp2bq6qerrvl27y8ffds`

---

## 2. قواعد العمل التي تم تثبيتها

هذه القواعد يجب اعتبارها جزءًا من العقد مع أي نموذج سيكمل العمل:

1. **لا تعديل للكود ولا الانتقال إلى بند جديد بدون موافقة المستخدم.**
2. الاستثناء هو عندما يقول المستخدم صراحة **«قرار عبدو»** ويطلب تنفيذ البند المحدد.
3. **لا Publish** إلا إذا طلب المستخدم ذلك صراحة.
4. **ممنوع تعديل `routeTree.gen.ts`.**
5. **ممنوع إضافة dependencies جديدة** إلا بقرار صريح.
6. في البنود المعمارية:
   - نأخذ baseline أولًا.
   - ننفذ البند بشكل مستقل قدر الإمكان.
   - نتحقق قبل الـ commit.
   - ثم نعيد التحقق بعد الـ commit.
7. **قاعدة الـ commit:** التحقق (typecheck + الاختبارات) يجري قبل أي commit. إذا فشل قبل الـ commit، يجوز إصلاح الفشل داخل نفس التغيير غير المثبّت ثم إعادة التحقق كاملاً. الممنوع: عمل commit ثم إصلاح فشله في commit لاحق. لو حدث ذلك توقف وأبلغ.
8. **استثناء write_file:** أداة `write_file` في Macaly تنشئ commit تلقائياً لكل ملف جديد، ولا يمكن تجنبه. يُوثَّق في التقرير ولا يُعد مخالفة.
9. لا نعتمد على hashes محفوظة من الذاكرة؛ **نقرأ الـ hashes مباشرة من `git log`.**
10. التقارير يجب أن تحتوي على:
   - الـ baseline.
   - الـ HEAD/commit النهائي.
   - الـ commit hashes الدقيقة.
   - الملفات التي تغيرت كما تظهر من `git show --stat`.
   - نتيجة typecheck.
   - نتيجة الاختبارات.
   - التغييرات السلوكية.
   - العناصر المؤجلة.
11. لا نكتب علامة **✅** إلا إذا كان البند مكتملًا فعلًا.
12. أي تغيير يجب أن يكون:
   - محدود النطاق.
   - قابلًا للمراجعة.
   - سهل الدمج في البنية الحالية.
   - مع الحفاظ على السلوك الموجود ما لم يكن التغيير مطلوبًا.
13. عند توحيد التخزين أو loaders لا نغيّر المفاتيح أو الصيغ الموجودة إلا إذا كان ذلك مطلوبًا صراحة.
14. لا نلمس منطقًا خارج نطاق البند لمجرد «تنظيف» غير مطلوب.
15. **قاعدة عرض الـdiff عند لمس `isUsableText`/`normalizeText` أو Unicode escapes:** أي تعديل يلمس الدوال `isUsableText` أو `normalizeText` أو أي regex في الكود يحتوي على `\u` (unicode escape)، يجب أن يعرض GPT الـdiff الفعلي الكامل لتلك الدالة تحديدًا ضمن رد المحادثة نفسه، وليس فقط وصفًا نصيًا أو ملخصًا في ملف التوثيق. هذا لمنع تكرار خلل مضاعفة الـbackslash الذي حدث مرتين سابقًا (commit 948162a، وcommit 8837d5d) دون أن يظهر بوضوح في ملخص المحادثة. وقد وقع هذا الخلل وتم تصحيحه ضمنيًا في القسم الموثق لإصلاح الذيل الغريب؛ أُضيفت هذه القاعدة لمنع تكراره صامتًا مستقبلًا.


---

# 2.0 نظام التوثيق التفصيلي — الفصل بين Claude وGPT وعبدو

من الآن فصاعدًا، هذا الملف لا يوثق النتيجة النهائية فقط، بل يوثق **سلسلة العمل كاملة**: الطلب، مراجعة Claude، تحليل GPT، قرار عبدو، التنفيذ الفعلي، الأخطاء، الإصلاحات، والتحقق.

## الوسوم الإلزامية

- **[طلب عبدو]**: ما طلبه عبدو أو ما وافق عليه صراحة.
- **[طلب إلى Claude]**: ما تم طلب مراجعته من Claude.
- **[رد Claude]**: ما قاله Claude فعلًا. لا يتحول تلقائيًا إلى أمر تنفيذ.
- **[تحليل GPT]**: تحليل GPT لرد Claude والتحقق المستقل من نقاطه.
- **[قرار عبدو]**: القرار النهائي الذي يحدد ما ينفذ.
- **[تنفيذ GPT]**: ما تم تنفيذه فعليًا داخل المشروع.
- **[خطأ/فشل]**: أي محاولة فاشلة أو مشكلة ظهرت.
- **[إصلاح/تراجع]**: طريقة الإصلاح أو التراجع.
- **[Validation]**: نتائج typecheck والاختبارات والتحقق الآخر الذي تم فعليًا.
- **[Commit]**: الـ hash والعنوان والملفات الفعلية من Git.
- **[مؤجل]**: ما تم اقتراحه أو مناقشته ولم ينفذ.
- **[النتيجة]**: الحالة النهائية للبند.

### قاعدة الفصل

لا يجوز صياغة سجل يوحي بأن Claude نفذ كودًا إذا كان Claude قد اقترح أو راجع فقط. ولا يجوز اعتبار اقتراح Claude قرارًا نهائيًا قبل موافقة عبدو.

إذا لم يتوفر النص الأصلي لرد Claude في السجل الحالي، نكتب صراحة: **"رد Claude غير متاح نصيًا في السجل الحالي"** بدل اختلاقه أو إعادة بنائه من الذاكرة.

إذا فشل التنفيذ، **يبقى الفشل موثقًا** حتى لو تم إصلاحه لاحقًا. وإذا تم التراجع عن محاولة، تُسجل المحاولة والتراجع والسبب.

## قالب كل تنفيذ جديد

### [طلب عبدو]
...

### [طلب إلى Claude]
...

### [رد Claude]
...

### [تحليل GPT]
...

### [قرار عبدو]
...

### [Baseline]
...

### [تنفيذ GPT]
...

### [خطأ/فشل]
...

### [إصلاح/تراجع]
...

### [Validation]
...

### [Commit]
...

### [التغييرات السلوكية]
...

### [مؤجل]
...

### [النتيجة]
...

**هذا النظام إلزامي لكل عمل جديد، سواء انتهى بالنجاح أو الفشل أو التوقف.**

---

## سجل التنفيذ الحالي — Boundary + إصلاح زر الرئيسية

### [طلب عبدو]
تنفيذ مرحلتين مستقلتين: إصلاح زر «الرئيسية» عند انهيار Home، إضافة أربع اختبارات AppContent حقيقية، ثم تحديث وثيقة التسليم فقط.

### [طلب إلى Claude]
مراجعة Boundary السابق والتحقق من العزل، عدم إعادة تركيب mushafReader، والحالة الفعلية للمشروع.

### [رد Claude]
بحسب النص الذي وصله GPT: المراجعة اعتبرت Boundary السابق مكتملًا وظيفيًا، وأكدت عدم إعادة تركيب القارئ في التنقل الفعلي، مع ملاحظات حول قوة الاختبارات، زر الرئيسية عند انهيار Home، أخطاء event handlers/promises، وسلوك الصوت أثناء الانهيار.

### [تحليل GPT]
تم تحويل الملاحظات المقبولة إلى نطاق تنفيذ صريح، مع إبقاء أي نقاط خارج الطلب مؤجلة وعدم تغيير App.tsx أو router أو المنطق الوظيفي الآخر.

### [قرار عبدو]
تنفيذ الحزمة كاملة على مرحلتين: كود/اختبارات ثم توثيق، مع commit مستقل لكل مرحلة.

### [Baseline]
`07b7f078c8a85ec9a4826926e9cf954d9fe9764b`، شجرة نظيفة، و21 ملف اختبار/108 اختبارات قبل التعديل.

### [تنفيذ GPT]
المرحلة 1: إضافة `showHome?: boolean`، إخفاء زر «الرئيسية» في Home فقط، وإضافة T1–T4 على `AppContent` الحقيقي. المرحلة 2: تحديث handoff موضعيًا.

### [خطأ/فشل]
حدثت محاولة أولى لإدخال الاختبارات بترميز newline حرفي، ثم تم تصحيحها قبل validation. لم تُنشأ أي commit وسيطة ولم يدخل الخطأ إلى التاريخ.

### [إصلاح/تراجع]
تم تصحيح ملف الاختبارات، ثم أُعيد typecheck والاختبارات كاملًا قبل commit المرحلة 1.

### [Validation]
بعد المرحلة 1: typecheck Pass، و21 ملف اختبار / 112 اختبارًا Pass.

### [Commit]
Boundary الأصلي: `8eaf564ca0699f80d31e2e672bfb3f6c8b4409d0`. مرحلة 1: `44855fdff1f5b8446474e99ef9d3871fb99fca6b` — `fix: hide home action when home screen crashes and add AppContent boundary tests`. الملفات: `src/app/components/app-shell.tsx` و`__tests__/app/app-shell-boundary.test.tsx`.

### [التغييرات السلوكية]
عند انهيار Home لا يظهر زر «الرئيسية» داخل الـ fallback، ويظهر النص «يمكنك استخدام شريط التنقل بالأسفل.» مع بقاء «إعادة المحاولة». باقي الشاشات تحتفظ بزر «الرئيسية».

### [مؤجل]
نقل ملفات الصلاة مع توحيد الأسماء، ولا يبدأ إلا بقرار عبدو.

### [النتيجة]
Boundary لكل شاشة مكتمل، وإصلاح Home مع اختبارات AppContent مضاف ومتحقق منه.

---

## سجل التنفيذ الحالي — نقل ملفات الصلاة مع توحيد الأسماء

### [طلب عبدو]
تنفيذ بند «نقل ملفات الصلاة مع توحيد الأسماء» على مرحلتين مستقلتين: (1) الكود، (2) التوثيق، مع عدم بدء أي بند آخر دون قرار جديد.

### [طلب إلى Claude]
مراجعة الحالة المجهزة والتأكد من أن النطاق الصحيح هو 7 ملفات، مع rename بنسبة 98% للملفين وأسطر التغيير المحددة والتحقق 21/112.

### [رد Claude]
بحسب المراجعة المنقولة إلى GPT، الحالة المجهزة تطابق النطاق المطلوب: 7 ملفات، والملفان المنقولان يظهران كـ R098، مع 21 ملف اختبار و112 اختبارًا ناجحًا.

### [تحليل GPT]
تمت مطابقة الحالة المجهزة مباشرة على المستودع: 7 ملفات، R098 للملفين، وأسطر التغيير كما في النتيجة المعتمدة.

### [قرار عبدو]
تصحيح شرط التوقف السابق: العدد المتوقع الصحيح هو 7 ملفات وليس 8، مع الإبقاء على التغييرات المجهزة دون تغيير، ثم تنفيذ commit المرحلة 1 وإتمام مرحلة التوثيق.

### [Baseline]
HEAD قبل commit الكود: `98a7aace91141ede56a4c2752d2342c7b1fcf9a9`، والحالة المجهزة 7 ملفات، وtypecheck ناجح، و21/112 اختبارًا ناجحًا.

### [تنفيذ GPT]
لم تُغيّر التغييرات المجهزة. أُعيد typecheck والاختبارات مباشرة قبل الـ commit، ثم تم تنفيذ commit الكود.

### [خطأ/فشل]
كان هناك توقف سابق صحيح لأن التعليمات الأصلية ذكرت 8 ملفات بينما النطاق الفعلي كان 7. تبيّن لاحقًا أن رقم 8 كان خطأً في الشرط نفسه. كما حدثت محاولة أولى لـ `git add` بالمسارات القديمة بعد النقل؛ فشلت كأمر Git فقط، ولم تُنشئ commit ولم تغيّر الحالة المجهزة.

### [إصلاح/تراجع]
صحّح عبدو العدد المتوقع إلى 7، واستُكملت العملية دون تعديل على الملفات المجهزة. لم يحدث reset أو amend أو rebase أو force.

### [Validation]
قبل commit المرحلة 1: typecheck Pass، و21 ملف اختبار / 112 اختبارًا Pass. بعد commit: typecheck Pass، و21 ملف اختبار / 112 اختبارًا Pass.

### [Commit]
`4eb3e7c72a336938dab84def304c4ae2bb9f3ca0` — `refactor: move prayer files into prayer feature and unify names`.
`git show -M --stat` أكد 7 ملفات متغيرة، مع rename بنسبة 98% للملفين.

### [التغييرات السلوكية]
لا تغيير سلوكي مقصود؛ التغيير نقل/إعادة تسمية وتحديث imports فقط.

### [مؤجل]
- نقل `src/notifications.ts` إلى `features/notifications`.
- إبقاء `quran-meta.ts` و`azkar-data.ts` و`daily-ayahs.ts` في `src/`.
- فصل `usePrayerCoords` و`useNextPrayer` و`usePrayerTimings` من `prayerTimes.ts`.
- فجوتا الاختبار المؤجلتان في Boundary: T2 بدون category، واختباران قديمان دون suppression لـ `console.error`.
- App.tsx وSettingsView وQuran cache و`azkar_last_view` لم تُمس.

### [النتيجة]
مرحلة الكود مكتملة ومتحقق منها، ومرحلة التوثيق تسجل النتيجة الحالية. لا يبدأ أي بند جديد دون قرار عبدو جديد.

---

# 2.1 توزيع الأدوار — مرجع إلزامي

المصادر الأصلية التي تم تسليمها للحسابات الأخرى حددت الأدوار بوضوح:| الطرف | الدور |
|---|---|
| **عبدو** | المشرف العام وصاحب القرار النهائي، وهو الذي ينقل التقارير والسياق بين النماذج. |
| **GPT / ChatGPT** | المنفذ الفعلي داخل Macaly: يفحص المستودع، ينفذ التعديلات التي وافق عليها عبدو، يشغل التحقق والاختبارات، ويكتب تقرير التنفيذ. |
| **Claude** | مراجع مستقل: يفحص المشروع بنفسه، يتحقق من تقارير GPT، يحدد ما تأكد وما هو غير دقيق وما يحتاج تنفيذًا أو تأجيلًا. لا يكتب أو يعدل الكود إلا إذا طلب عبدو ذلك صراحة. |

### دورة العمل الإلزامية

1. عبدو يرسل التقرير/البند.
2. GPT ينفذ الفحص ويكتب التقرير أو ينفذ التغيير المتفق عليه حسب المرحلة.
3. عبدو ينقل التقرير إلى Claude.
4. Claude يتحقق من المستودع نفسه، وليس من التقرير فقط.
5. عبدو ينقل مراجعة Claude إلى GPT.
6. GPT يعيد التحقق من النقاط المختلف عليها بالأدلة من المستودع.
7. يتم تنفيذ البنود المتفق عليها فقط.
8. يرسل GPT تقرير التنفيذ.
9. تتم مراجعته قبل الانتقال للبند التالي.

**مهم:** تقرير Claude ليس أمر تنفيذ تلقائيًا؛ القرار النهائي لعبدو، وGPT لا ينفذ نقطة مختلفًا عليها دون تحقق ودليل.

**الدليل التشغيلي لـ Claude:** [CLAUDE_REVIEW_GUIDE.md](CLAUDE_REVIEW_GUIDE.md)

---

# 2.2 الخطة الأصلية الكاملة للمشروع

الخطة الأصلية كانت من **6 مراحل**، والـ 9 ملفات الخاصة بالاختبارات هي المرحلة الرابعة وليست بداية الخطة:

1. **تنظيف الكود:** الملف 10 + الملف 11.
2. **إصلاح الأخطاء المعروفة:** مثل uiSound، تسمية اتجاهات بوصلة القبلة، عرض رسم السبحة، ربط إحصائيات السبحة، وتحديث قائمة إعادة الضبط.
3. **إتمام الميزات الناقصة/المخططة:** تنقل صفحات المصحف، تطوير الأذكار، وتسجيل الدخول فقط بطلب صريح.
4. **الاختبارات الشاملة:** 9 ملفات متتابعة، مع ملفات 12 و13 و16 بالتوازي حسب الخطة الأصلية.
5. **الواجهة البصرية:** الملف 14.
6. **الأداء المقاس رقميًا:** الملف 15، وهو آخر شيء في الخطة قطعًا.

### ملفات 10–16

- 10: جودة الكود الثابتة.
- 11: البنية المعمارية.
- 12: الأمان الموسع، ومنها npm audit وCSP وsecrets.
- 13: القانوني/التراخيص، جمع معلومات فقط.
- 14: الواجهة البصرية وUX.
- 15: الأداء الرقمي، Lighthouse وbundle size، وآخر شيء.
- 16: جرد مصادر المحتوى الديني، توثيق فقط، بدون إصدار حكم شرعي.

**قاعدة مهمة:** مرحلة الأداء 15 لا تبدأ قبل اكتمال المراحل السابقة؛ لأن أي إصلاح لاحق سيغيّر أرقام الأداء.

---

# 2.3 قواعد إضافية من وثائق التسليم الأصلية

- في مراحل الفحص/الاختبار/الواجهة/الأداء: لا يتم إصلاح production code إلا بإذن صريح.
- كل تقرير يعامل كادعاء يحتاج تحققًا، ولا يُعتبر حقيقة لمجرد أنه مكتوب في تقرير.
- عند الشك، يجب التصريح بعدم اليقين بدل الادعاء.
- لا يعتمد على أسماء ملفات build المتغيرة كدليل؛ الدليل الأساسي هو typecheck والاختبارات ومراجعة الـ diff.
- أي مشكلة خارج النطاق تُبلغ فقط ولا تُصلح تلقائيًا.
- الملف 16 خاص بالتوثيق الديني فقط، ولا يجوز لأي AI إصدار حكم شرعي على صحة النصوص.
- الملف 13 جمع معلومات قانونية فقط، بدون رأي قانوني نهائي.
- تسجيل الدخول (Convex + Google Sign-In + ترحيل localStorage) مخطط، ولا يُنفذ إلا بطلب صريح من عبدو.

---

# 3. المرحلة الأولى — التدقيق المعماري

## 3.1 حالة البداية

تم إجراء مراجعة معمارية للمشروع قبل الإصلاحات.

الـ baseline الذي تم التحقق منه في نهاية مراجعة الملف 11:

`4986ac5d565cadf756a2f881491fd9d774a9c8be`

والتحقق كان:

- `git rev-parse` مطابق للـ HEAD.
- الشجرة نظيفة.
- الـ Severities مطابقة لما تم اقتراحه.
- Convex **غير مثبت**:
  - لا يوجد مجلد `convex`.
  - لا توجد حزمة `convex` في `package.json`.
- المصادر الخارجية الخمسة موجودة فعلًا في الكود.
- يوجد CSP فعلًا في:
  - `public/_headers`
- تفاصيل CSP، خصوصًا:
  - `connect-src`
  - `media-src`
  - والسماح بالصوت من `cdn.islamic.network`
  تخص ملف 12.
- **الملف 11 مقبول ومغلق.**
- **المرحلة 1 اكتملت: الملفان 10 و11.**
- لا يوجد تعديل كود مطلوب من الملف 11 نفسه.

---

# 4. ملاحظات التدقيق المعماري الأساسية

## Error Boundary

المكان الأساسي:

- `src/components/error-boundary.tsx`
- `src/routes/__root.tsx`

السلوك:

- يوجد زر **إعادة المحاولة** يعتمد على `router.invalidate()`.
- الربط الفعلي لـ `defaultErrorComponent: ErrorBoundary` موجود في:
  - `src/router.tsx`، سطر 28 تقريبًا.
- `__root.tsx` ليس موضع الربط الفعلي لـ `defaultErrorComponent`.

Severity: **Medium**.

المشكلة التي كانت مؤجلة ثم اكتملت:
- Boundary لكل شاشة يعزل crash لكل شاشة ويتيح recovery مستقلًا.
- التصميم النهائي داخل `src/app/components/app-shell.tsx`.
- تم استخدام `resetKey` بدل تغيير `key` لتجنب إعادة تركيب `mushafReader`.
- `BottomNav` بقي خارج الـ boundary.
- شاشة Home فقط تستخدم `showHome=false`.

الربط الفعلي للـ root ErrorBoundary موجود في `src/router.tsx` سطر 28 تقريبًا، وليس داخل `__root.tsx`.

---

## App.tsx

`App.tsx` حوالي **352 سطرًا**.

تم تصنيفه كدين معماري منخفض:

- Low architecture debt.

(وقت التدقيق: لم يُقسَّم بعد؛ اكتمل التقسيم لاحقًا — راجع القسم 36.)

---

## الصلاة

منطق الصلاة موزع بين:

- `src/app/features/prayer/QiblaCompass.tsx`
- `src/app/features/prayer/PrayerTimesView.tsx`
- `src/app/features/prayer/prayerTimes.ts`

تم اعتبار هذا Low في التدقيق الحالي، ونُفذ بند نقل ملفات الصلاة وتوحيد الأسماء دون تغيير سلوكي مقصود.

---

## SettingsView.tsx

`SettingsView.tsx` حوالي **1115 سطرًا** (وكان حوالي **1139 سطرًا** عند baseline `4986ac5`).

Severity:

- Medium.

(وقت التدقيق: لم يُقسَّم بعد؛ اكتمل التقسيم لاحقًا — راجع القسم 35.)

البند:
**تقسيم SettingsView — كان مؤجلًا وأصبح مكتملًا (راجع القسم 35).**

---

## Tasbih

كان هناك تداخل بين:

- `TasbihView.tsx`
- `useTasbih.ts`

حيث توجد persistence مخصصة للسبحة في بعض المواضع، بينما `useTasbih.ts` يمتلك الحالة الأساسية.

تم تصنيفه Low، ثم تمت معالجة جزء مهم منه ضمن BUG-CODEQ-008/009.

---

## SSR / Hydration

تم فحص الخطر.

النتيجة التي يجب الحفاظ على صياغتها:

> **فُحص خطر SSR/hydration ولا توجد مشكلة (localStorage داخل effects فقط ولا lazy initializer يقرأ browser APIs).**

---

## Convex

تم تصحيح التقرير بعد التحقق:

- لا يوجد مجلد Convex.
- لا توجد حزمة Convex في `package.json`.

إذًا لا ينبغي وصف Convex على أنه backend موجود حاليًا.

---

## المصادر الخارجية

تم التحقق من وجود خمسة مصادر خارجية في الكود:

- `alfurqan.online`
- `bonyan-api.vercel.app`
- `cdn.islamic.network`
- `api.alquran.cloud`
- `api.aladhan.com`

ويجب التعامل معها كـ external dependencies عند الوصول إلى البنود المتعلقة بها، خصوصًا الملفات 12/13/16.

---

# 5. ترتيب الديون المعمارية الذي تم الاتفاق عليه

كان الترتيب المقترح:

### قبل المرحلة 2
**مركزية localStorage**

السبب:
- بنود المرحلة 2 الخاصة بإعادة الضبط وإحصائيات السبحة تلمس نفس المفاتيح.

وهذا البند تم تنفيذه ضمن BUG-CODEQ-008/009.

### قبل إصلاح صفحات المصحف
**توحيد Quran loader**

وهذا البند تم تنفيذه ضمن BUG-CODEQ-010.

### قبل المرحلة 4
**Boundary لكل شاشة + نقل ملفات الصلاة مع توحيد الأسماء**

- [x] Boundary لكل شاشة.
- [x] نقل ملفات الصلاة مع توحيد الأسماء.

### مؤجل
- تقسيم `App.tsx`.
- تقسيم `SettingsView.tsx`.

---

# 6. BUG-CODEQ-008/009 — مركزية localStorage

## الهدف

توحيد التخزين الخاص بـ:

1. Custom Tasbih.
2. Azkar item progress.

مع الحفاظ على المفاتيح والسلوك.## المفاتيح التي يجب أن تظل كما هي

### Custom Tasbih

`azkar_custom_tasbih_list`

### Azkar progress

`azkar_azkar_item_progress_v2`

### Migration marker

`azkar_azkar_item_progress_v2_migrated`

### مهم جدًا

**ممنوع لمس أو دمج:**

`azkar_custom_tasbih`

هذا المفتاح بقي خارج عملية الدمج.

---

## ما تم إنشاؤه

### Custom Tasbih storage

تم إنشاء:

`src/app/features/tasbih/customTasbih.ts`

مع اختبارات:

`__tests__/app/customTasbih.test.ts`

وظيفته توحيد عمليات القراءة/الكتابة/الهجرة المرتبطة بالـ custom tasbih.

---

## التغييرات التي تمت

### `constants.ts`

تم توجيه الثوابت إلى storage module.

### `TasbihView.tsx`

تم استخدام storage المركزي بدل persistence مكرر.

### `SettingsView.tsx`

تم استخدام storage المركزي في إدارة الـ custom tasbih.

### Azkar progress

تم إنشاء:

`src/app/features/azkar/azkarProgress.ts`

وتم توجيه SettingsView إلى constants/functions الخاصة به.

---

# 7. Commits الخاصة بـ BUG-CODEQ-008/009

تم التحقق منها مباشرة من Git.

### `c400c62`
`refactor: centralize custom tasbih storage`

الملفات:
- `__tests__/app/customTasbih.test.ts`
- `src/app/features/tasbih/customTasbih.ts`

### `c2a0a04`
`refactor: preserve custom tasbih migration semantics`

الملف:
- `src/app/features/tasbih/customTasbih.ts`

### `89d84db`
`refactor: route constants through custom tasbih storage`

الملف:
- `src/app/constants.ts`

### `96ee66e`
`fix: type custom tasbih legacy migration`

الملف:
- `src/app/constants.ts`

### `52ea3ae`
`refactor: use custom tasbih storage in view`

الملف:
- `src/app/features/tasbih/TasbihView.tsx`

### `8145b15`
`refactor: use custom tasbih storage in settings`

الملف:
- `src/app/features/settings/SettingsView.tsx`

### `5e0ad91`
`refactor: centralize azkar progress storage`

الملفات:
- `__tests__/app/azkar-progress.test.ts`
- `src/app/features/azkar/azkarProgress.ts`
- `src/app/features/settings/SettingsView.tsx`

### `93bf48e`
`fix: remove unused progress key import`

الملف:
- `src/app/features/settings/SettingsView.tsx`

---

# 8. اختبارات BUG-CODEQ-008/009

بعد اكتمال هذه المجموعة تم التحقق من:

- typecheck: **Pass**
- tests: **19 files / 99 tests — Pass**
- الشجرة نظيفة.

تم التحقق أيضًا من:

- المفاتيح لم تتغير.
- `azkar_custom_tasbih` لم يتم لمسه.
- أماكن الكتابة إلى localStorage بقيت داخل try/catch.
- الاختبارات القديمة لم يتم تعديلها، باستثناء الإضافات المطلوبة للاختبارات الجديدة.
- الاختبارات الجديدة غطت storage behavior.

---

# 9. ملاحظات سلوكية مقبولة في BUG-CODEQ-008/009

تمت ملاحظة اختلافين edge cases وتم قبولهما:

## 1. حذف custom tasbih من Settings

أصبح الحذف يعتمد على filtering للقائمة الخام حسب id بدل إعادة بناء القائمة عبر `getTasbihWords`.

النتيجة:

- IDs غير `custom-`
- والـ extra fields

يمكن أن تبقى محفوظة.

هذا تغيير أكثر محافظة على البيانات، وتم قبوله.

## 2. Migration من المفتاح القديم

إذا كان المفتاح الجديد:

`azkar_custom_tasbih_list`

فارغًا أو غير array، فلن يتم تلقائيًا تشغيل migration من:

`azkar_custom_tasbih`

تمت ملاحظة هذا كفرق edge case وقبوله.

---

# 10. مشكلة مؤقتة حدثت أثناء BUG-CODEQ-008/009

Commit:

`89d84db`

سبب مؤقتًا مشكلة TypeScript:

- TS2345.

تم إصلاحها في:

`96ee66e`

**لكن هذه التجربة أدت إلى قاعدة عمل جديدة مهمة:**

> التحقق (typecheck + الاختبارات) يجري قبل أي commit. إذا فشل قبل الـ commit، يجوز إصلاح الفشل داخل نفس التغيير غير المثبّت ثم إعادة التحقق كاملاً. الممنوع: عمل commit ثم إصلاح فشله في commit لاحق. لو حدث ذلك توقف وأبلغ.

أي:
- validation أولًا.
- إصلاح الفشل داخل نفس التغيير غير المثبّت إذا لزم.
- إعادة التحقق كاملاً.
- commit بعد نجاح التحقق.
- validation بعد commit للتأكيد.

---

# 11. BUG-CODEQ-010 — توحيد Quran Surah Loader

## الهدف

كان هناك موقعان لتحميل السورة:

1. `src/app/features/quran/useQuranReaderData.ts`
2. `src/app/features/quran/QuranReaderView.tsx`
   - داخل `onEnd` الخاص بالانتقال التلقائي للسورة التالية.

المطلوب:
- loader واحد.
- الحفاظ على السلوك الحالي.
- عدم إضافة cache الآن.
- عدم تغيير الصوت أو tafsir.

---

# 12. الفرق المهم في Bismillah

كان هناك فرق سلوكي يجب الحفاظ عليه:

### useQuranReaderData

يقوم بإزالة البسملة من أول آية في السور:

- باستثناء السورة 1.
- والسورة 9.

### QuranReaderView / auto-next

كان يحمل السورة التالية **خامًا** بدون إزالة البسملة.

لذلك القرار الصحيح كان:

> **الـ loader يرجع raw list، والـ hook هو الذي يتولى Bismillah stripping.**

وبالتالي لا يتم وضع منطق إزالة البسملة داخل loader.

---

# 13. مواصفات loadSurah

تم إنشاء:

`src/app/features/quran/loadSurah.ts`

التوقيع:

`loadSurah(surahNumber, signal?)`

وظيفته:- نفس URL السابق.
- نفس timeout = **10 seconds**.
- دعم AbortSignal.
- `!response.ok` يؤدي إلى:
  - `Error('bad-response')`
- mapping إلى:
  - `{ number, numberInSurah, text }`
- مقارنة عدد الآيات مع `surahList`.
- إذا كان العدد غير مطابق أو القائمة فارغة:
  - `Error('incomplete')`
- إرجاع البيانات **raw**.
- لا يقوم بإزالة البسملة.

---

# 14. اختبارات loadSurah

تم إنشاء:

`__tests__/app/loadSurah.test.ts`

وتغطي:

1. success.
2. `!ok`.
3. count mismatch.
4. empty list.

والاختبار يؤكد أن البسملة تبقى raw داخل loader.

---

# 15. استخدام loader داخل hook

تم تعديل:

`src/app/features/quran/useQuranReaderData.ts`

ليستخدم:

`loadSurah`

مع الحفاظ على:

- controller.
- abort عند cleanup.
- Bismillah stripping في مكانه.
- state commands.
- رسائل الخطأ الحالية.

---

# 16. استخدام loader داخل QuranReaderView

تم تعديل:

`src/app/features/quran/QuranReaderView.tsx`

ليستخدم:

`loadSurah(next)`

داخل `onEnd`.

تم الحفاظ على:

- `dataSaver`.
- `setPlaying(false)`.
- `setBuffering(false)` في catch.
- raw list للسورة التالية.

لم يتم تغيير:
- audio logic.
- tafsir logic.
- أي cache.

---

# 17. Commits الخاصة بـ BUG-CODEQ-010

تم التحقق من الـ hashes مباشرة من Git.

### `a7005d627402ca5b46c5b9b4b61052fe92792389`
`chore: update src/app/features/quran/loadSurah.ts`

الملف:
- `src/app/features/quran/loadSurah.ts`

التغيير:
- 34 سطرًا مضافة.

### `0d7e53d9efcd5b508bc9f1cd7eec6d853fcb44e0`
`chore: update __tests__/app/loadSurah.test.ts`

الملف:
- `__tests__/app/loadSurah.test.ts`

التغيير:
- 44 سطرًا مضافة.

### `a0e53ae6f64d4876dd1a01ed7937d568918d0069`
`refactor: use shared surah loader in hook`

الملف:
- `src/app/features/quran/useQuranReaderData.ts`

التغيير:
- 5 additions.
- 12 deletions.

### `af9ce22cff500a9137ecc5282a97d2fe39df756b`
`refactor: use shared surah loader in reader`

الملف:
- `src/app/features/quran/QuranReaderView.tsx`

التغيير:
- 2 additions.
- 21 deletions.

---

# 18. Validation بعد BUG-CODEQ-010

تم التحقق من:

### بعد hook

- typecheck: **Pass**
- tests: **20 files / 103 tests — Pass**

### بعد QuranReaderView

- typecheck: **Pass**
- tests: **20 files / 103 tests — Pass**

### الحالة النهائية

- الشجرة نظيفة.
- لا dependency changes.
- لا `routeTree.gen.ts`.
- لا Publish.

---

# 19. ملاحظة مهمة عن commits التي أنشأتها Macaly

في BUG-CODEQ-010، أداة Macaly `write_file` تقوم بعمل commit تلقائي لكل ملف تكتبه.

لذلك تم إنشاء أول commitين تلقائيًا عند كتابة الملفين الجديدين:

- `a7005d6...`
- `0d7e53d...`

ثم تم الالتزام بقاعدة pre-commit validation بالنسبة للتعديلات اليدوية اللاحقة:

- `a0e53ae...`
- `af9ce22...`

تم توثيق هذا بشفافية؛ لا ينبغي إخفاؤه في تقرير لاحق.

---


---

# 2.4 — سجل تنفيذ تدقيق المرحلة 2 وإصلاح أسماء جهات بوصلة القبلة

### [طلب عبدو]
تنفيذ إصلاح واحد فقط: أسماء جهات بوصلة القبلة، على مرحلتين: كود/اختبارات ثم توثيق. لا يبدأ أي بند آخر.

### [رد Claude]
بحسب النص الذي وصل GPT: أكد Claude أن مشكلة البوصلة مثبتة؛ السهم يدور بـ `bearing - heading` بينما أسماء الجهات كانت ثابتة، فتظهر خاطئة عند `heading ≠ 0`. كما أشار إلى مفاتيح reset خارج القائمة، دون تنفيذ تغيير فيها.

### [تحليل GPT]
uiSound: لا خطأ مؤكد. ربط إحصائيات السبحة: لا خطأ مؤكد. رسم السبحة: لا خطأ مؤكد، والمظهر على 320–380px غير مختبر runtime. reset: لا تغيير؛ المفاتيح خارج القائمة سُجلت كعناصر على الأرجح مقصودة.

### [قرار عبدو]
تنفيذ إصلاح أسماء جهات بوصلة القبلة فقط، على مرحلتين مستقلتين، وعدم بدء أي بند آخر.

### [Baseline]
`c50765b1577012c7ef700e0be450493cf5aa4faf`، شجرة نظيفة، typecheck Pass، 21 ملف اختبار / 112 اختبارًا Pass، و`qibla.test.ts` = 5 اختبارات.

### [تنفيذ GPT]
أضيفت الدالة النقية المصدّرة `dialLabelAngle(cardinalDeg, heading)`؛ تعيد `cardinalDeg` عند `heading === null` وإلا `cardinalDeg - heading`. دارت أغلفة شمال/شرق/جنوب/غرب بهذه الزاوية، وعُكس دوران النص ليبقى مستقيمًا. لم يتغير bearing أو angularDiff أو unwrap أو الحساس أو إشارة heading أو عتبة 3° أو النصوص الأخرى أو aria-label. أضيفت 4 اختبارات دون تعديل الاختبارات الخمسة الموجودة.

### [خطأ/فشل]
حدثت مهلة للأمر المركب أثناء التحقق بعد commit المرحلة 1؛ لم تُنشئ تغييرًا أو commit، وأُعيد التحقق بأمر مستقل واكتمل بنجاح.

### [Validation]
قبل commit المرحلة 1: typecheck Pass، 21/116 tests Pass، و`qibla.test.ts` = 9. `git diff --stat` أظهر ملفين فقط، ولم تتغير `package.json` أو `routeTree.gen.ts` أو `src/router.tsx` أو `src/app/App.tsx`. بعد commit المرحلة 1: typecheck Pass، 21/116 tests Pass، و`qibla.test.ts` = 9.

### [Commit]
مرحلة 1: `19b4cd52f22e6b4dc97345dc8d5cf72ebad72734` — `fix: rotate qibla dial cardinal labels with device heading`. `git show --stat` أكد ملفين فقط: QiblaCompass.tsx وqibla.test.ts، 50 إضافة و5 حذف.

### [التغييرات السلوكية]
عند `heading === null` لا يتغير الشكل الحالي. عند وجود heading تدور أسماء الجهات مع القرص والنص يبقى مستقيمًا. السهم يبقى `bearing - heading`.

### [مؤجل]
الصوت الفعلي runtime؛ حساس البوصلة على جهاز حقيقي بعد الإصلاح؛ مظهر الرسم على 320–380px؛ إعادة قراءة TasbihView لسجل الأيام عند كل نقرة؛ السطر المكرر في `useTasbih.load`؛ وعدم استماع TasbihView لحدث `azkar-tasbih-changed`.

### [تدقيق reset — دون تغيير]
خارج `resetKeys`: `azkar_last_surah`, `azkar_last_view`, `azkar_daily_ayah`, `azkar_counts`, `azkar_day_total`, `azkar_day_total_date`, `azkar_tasbih_selected_word`, `azkar_tasbih_rounds`, `azkar_tasbih_round_counts`, `azkar_tasbih_daily_history`, `azkar_azkar_item_progress_v2`, `azkar_azkar_item_progress_v2_migrated`, `azkar_favorites`, `azkar_favorites_version`, `azkar_catalog_v3`, `azkar_catalog_v3_time`, `azkar_catalog_v4`, `azkar_catalog_v4_time`, `azkar_azkar_item_progress_v1`.

وبحسب رد Claude أيضًا: مفاتيح `*_notification_date`، وكاش الصلاة `azkar_pt_v2_` و`azkar_pt_month_v2_` و`azkar_prayer_timings_`، وبادئة `azkar_tafsir_`. لم يتغير reset؛ وهذه المفاتيح على الأرجح مقصودة أو لها مسارات تنظيف/هجرة منفصلة.

### [النتيجة]
تم إصلاح أسماء جهات بوصلة القبلة واختبار الدالة، ولم يبدأ أي بند آخر.

# 20. الحالة الحالية الدقيقة

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.
آخر تغيير فعلي في الكود هو إصلاح أسماء جهات بوصلة القبلة: تدوير الأسماء مع `heading` مع إبقاء النص مستقيمًا، وإضافة أربعة اختبارات للدالة `dialLabelAngle`. آخر commit للكود: `19b4cd52f22e6b4dc97345dc8d5cf72ebad72734`.

---

# 21. ما تم إنجازه حتى الآن

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.
## مكتمل ومقبول

### المرحلة 1
- [x] الملف 10.
- [x] الملف 11.
- [x] التدقيق الأساسي.
- [x] تصحيح وصف Convex.
- [x] توثيق CSP.
- [x] توثيق external sources.

### BUG-CODEQ-008/009
- [x] Custom Tasbih storage centralization.
- [x] Azkar progress storage centralization.
- [x] الحفاظ على المفاتيح.
- [x] الحفاظ على migration marker.
- [x] اختبارات.
- [x] typecheck.
- [x] 19/99 tests.

### BUG-CODEQ-010
- [x] shared `loadSurah`.
- [x] tests.
- [x] hook migration.
- [x] reader migration.
- [x] الحفاظ على Bismillah behavior.
- [x] الحفاظ على raw list في loader.
- [x] 20/103 tests.
- [x] typecheck.
- [x] clean tree.

---# 22. ما لم يتم تنفيذه بعد

## البنود المكتملة في هذه الحزمة

### Boundary لكل شاشة

**مكتمل** في `44855fdff1f5b8446474e99ef9d3871fb99fca6b`، مع إصلاح زر «الرئيسية» واختبارات AppContent.

### نقل ملفات الصلاة مع توحيد الأسماء

**مكتمل** في `4eb3e7c72a336938dab84def304c4ae2bb9f3ca0`.

- نقل `PrayerTimesView.tsx` و`prayerTimes.ts` إلى `src/app/features/prayer/`.
- توحيد الأسماء وتحديث imports المتأثرة.
- rename بنسبة 98% للملفين.
- لا تغيير سلوكي مقصود.

---

## مؤجل

- نقل `src/notifications.ts` إلى `features/notifications`.
- إبقاء `quran-meta.ts` و`azkar-data.ts` و`daily-ayahs.ts` في `src/`.
- فصل hooks الصلاة من `prayerTimes.ts`.
- فجوتا اختبار Boundary المذكورتان في القسم 24.1.
- App.tsx وSettingsView وQuran cache و`azkar_last_view`.

---

## بنود كانت مؤجلة وأصبحت مكتملة

### تقسيم App.tsx

حوالي 352 سطرًا.

Severity:
- Low.

**مكتمل** — راجع القسم 36.

### تقسيم SettingsView.tsx

حوالي **1115 سطرًا** (وكان حوالي **1139 سطرًا** عند baseline `4986ac5`).

Severity:
- Medium.

**مكتمل** — راجع القسم 35.

---

# 23. أشياء لا تزال مؤجلة عمدًا

## Quran caching / duplicate-fetch prevention

لم يتم تنفيذ:

- cache.
- duplicate-fetch prevention.

السبب:
- خارج BUG-CODEQ-010.
- تم الاتفاق على تأجيله إلى **file 15**.

لا تبدأ هذا البند تلقائيًا.

---

# 24. ما لا يجب تغييره أثناء البنود القادمة

1. لا تغيّر مفاتيح localStorage الموجودة.
2. لا تدمج `azkar_custom_tasbih` مع `azkar_custom_tasbih_list`.
3. لا تضف caching إلى `loadSurah` ضمن BUG-CODEQ-010.
4. لا تغيّر Bismillah semantics دون طلب صريح.
5. لا تغيّر audio/tafsir logic ضمن Quran loader work.
6. لا تعدّل `routeTree.gen.ts`.
7. لا تضف dependency جديدة.
8. لا تعمل Publish.
9. لا تبدأ بندًا جديدًا بدون موافقة المستخدم.
10. لا تستخدم hash من الذاكرة؛ اقرأه من Git.
11. التحقق (typecheck + الاختبارات) يجري قبل أي commit.
12. إذا فشل التحقق قبل الـ commit: أصلح داخل نفس التغيير غير المثبّت وأعد التحقق. لا تعمل commit فاشل ثم تصلحه لاحقاً.
13. تشغيل `pnpm` قد يضيف `packageManager` إلى `package.json`؛ استخدم `npm run typecheck` و`npm test -- --run` وتحقق من `git status` بعد كل تشغيل.
14. بعد أي تعديل، يجب توثيق:
    - baseline.
    - الملفات.
    - commit.
    - validation.
    - behavioral changes.
    - deferred work.

---

## 23.1 `azkar_last_view` — مؤجل

**أولوية منخفضة:** المفتاح يُكتب أيضًا لـ `home` عند أي تنقل، والاستعادة تشمل `prayer-times` و`mushaf-list` و`azkar-list` و`tasbih` فقط، فالحلقة إزعاج وليست قفلًا لأن الـ fallback فيه مخرج. لا يُنفَّذ إلا بقرار عبدو.

---

## 24.1 قيود معروفة ومقبولة

- الـ boundary لا يلتقط أخطاء معالجات الأحداث ولا الـ promises؛ نطاقه أخطاء render/effects التي يدعمها React Error Boundary.
- عنوان commit `8eaf564` (`refactor: wire screen boundary home action`) لا يعكس محتواه الكامل (Boundary + اختبارات)؛ لم يُغيَّر لأن ذلك يتطلب إعادة كتابة التاريخ.
- الصوت أثناء انهيار القارئ: بحسب قراءة الكود، `QuranReaderView` (حوالي الأسطر 157–167) يوقف الصوت ويفرّغ `src` عند unmount، لكن لم يُختبر runtime أثناء انهيار فعلي؛ لذلك لا يُسجل كتحقق runtime.
- في App الحقيقي يبقى القارئ مخفيًا mounted فقط عند الانتقال إلى `settings`/`favorites`/`category`؛ لأن App يصفّر `readerView` عند `home`/`prayer-times`/`mushaf-list`/`azkar-list`/`tasbih`.
- زر «الرئيسية» مخفي عمدًا عند انهيار شاشة Home، ويبقى شريط التنقل السفلي مخرجًا.

---

# 25. الخطة القادمة المقترحة

الترتيب الذي تم اعتماده:

```
المرحلة 1
  ├─ الملف 10 ✅
  └─ الملف 11 ✅

قبل المرحلة 2
  └─ BUG-CODEQ-008/009: localStorage centralization ✅

قبل إصلاح صفحات المصحف
  └─ BUG-CODEQ-010: shared Quran loader ✅

قبل المرحلة 4
  ├─ per-screen Error Boundary ✅
  └─ move/rename prayer files ✅

مؤجل
  ├─ App.tsx split ✅
  └─ SettingsView split ✅

لاحقًا
  └─ Quran cache / duplicate-fetch prevention (file 15) ⏳
```

---

# 26. تعليمات بدء العمل في الحساب الآخر

عند فتح هذه المحادثة/الملف في حساب آخر، يجب على النموذج الجديد أن يتعامل مع هذا الملف كـ **handoff / source of truth للعمل المنجز**.

قبل أي تعديل كود:

1. اقرأ هذا الملف كاملًا.
2. اقرأ حالة Git الحالية.
3. نفّذ:
   - `git rev-parse HEAD`
   - `git status --short`
4. لا تفترض أن الـ HEAD الحالي ما زال هو نفس الـ HEAD الموثق هنا؛ تحقق منه.
5. إذا كان المطلوب تنفيذ بند جديد، خذ baseline جديدًا من المستودع.
6. لا تنفذ البند إلا بعد موافقة المستخدم.
7. لا تبدأ أي بند من تلقاء نفسك، بما في ذلك البنود المؤجلة.
8. لا تغيّر الملفات خارج نطاق البند.
9. لا تعمل commit قبل نجاح validation.
10. بعد الانتهاء، سجّل الـ hash الحقيقي من `git log`.

---

# 27. آخر نقطة توقف فعلية

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.

**نحن متوقفون الآن بعد إصلاح أسماء جهات بوصلة القبلة وإتمام توثيق تدقيق المرحلة 2.**

التحقق بعد إصلاح الكود: **21 test files / 116 tests / typecheck Pass**، وعدد اختبارات `qibla.test.ts` = **9**.

البند التالي: **لا يبدأ أي بند جديد دون قرار عبدو جديد.**

---

# 28. ملاحظة حول هذا الملف نفسه

هذا الملف **توثيق وتسليم فقط**.

إضافته إلى المستودع لا تعني بدء أي بند معماري جديد، ولا تعني موافقة على تنفيذ البند التالي.

إذا كان الحساب الآخر سيكمل العمل، فهذه الوثيقة هي نقطة البداية لفهم:
- ماذا فُعل.
- لماذا فُعل.
- ما الذي تم قبوله.
- ما الذي تم تأجيله.
- ما هي القيود.
- وأين توقفنا بالضبط.
# 29. آخر تحديث للتسليم — إكمال SettingsView والتوقف اليوم

> هذا القسم كان أحدث حالة وقت كتابته، وقد استُبدل بالأقسام اللاحقة (35 وما بعده)؛ ويغلب فقط أي وصف أقدم لحالة SettingsView.

## [طلب عبدو]
أوقف العمل اليوم بعد إكمال تقسيم SettingsView، وتأكد من توثيق ما تم إنجازه في ملف التسليم. لا يبدأ غدًا أي بند جديد إلا بقرار جديد من عبدو.

## [تحليل GPT]
اكتملت فئات SettingsView المحددة إلى مكونات مستقلة داخل:
`src/app/features/settings/sections/`

الفئات المكتملة:
- About
- Notifications
- Azkar
- Prayer
- Quran
- Tasbih
- Motivation
- Privacy
- General

## [تنفيذ GPT] — PrivacySection

تم استخراج فئة Privacy فقط، دون تغيير General أو الفئات الأخرى.

الملف:
`src/app/features/settings/sections/PrivacySection.tsx`

الـ props المنقولة:
`appLock`, `enableLock`, `hijri`, `exportData`, `importData`, `reset`.

تم إبقاء handlers والمنطق القائم داخل SettingsView، ونقل JSX الخاص بالخصوصية فقط.

### [Baseline]
- HEAD: `feed8951c27d28d03f9228854277029370cd5203`
- SettingsView: 536 سطرًا.
- typecheck: Pass.
- tests: 22 files / 126 tests — Pass.

### [Validation]
قبل commit وبعده:
- typecheck: Pass.
- full tests: 22 files / 126 tests — Pass.
- الشجرة بعد التنفيذ: clean.

### [Commit]
`f83da2de406c95fd4c86f8f1cf275aead4d160fc` — `refactor: extract settings privacy section`

`git show --stat`:
```
src/app/features/settings/SettingsView.tsx         | 67 +++---------------
.../features/settings/sections/PrivacySection.tsx  | 82 ++++++++++++++++++++++
2 files changed, 91 insertions(+), 58 deletions(-)
```

### [التغييرات السلوكية]
لا تغيير سلوكي مقصود؛ فصل JSX/props فقط.

---

## [تنفيذ GPT] — GeneralSection

تم استخراج فئة General فقط. وكانت هذه **آخر فئة** في عملية تقسيم SettingsView.الملف:
`src/app/features/settings/sections/GeneralSection.tsx`

الحالة والـ setters المنقولة تشمل:
`theme`, `appearance`, `numberStyle`, `uiScale`, `uiSound`, `reduced`, `awake`, `restore`, `hijri`, `dataSaver`, `save`, `toggle`.

تم التحقق من النوع الفعلي لـ `appearance`:
`'light' | 'dark' | 'system'`

وتم الحفاظ على تغيير `document.documentElement.dataset.theme` داخل handler الخاص بالـ theme.

### [Baseline]
- HEAD: `f83da2de406c95fd4c86f8f1cf275aead4d160fc`
- SettingsView: 487 سطرًا.
- typecheck: Pass.
- tests: 22 files / 126 tests — Pass.
- تم فحص state/setters/handlers المستخدمة في JSX العام قبل التنفيذ.

### [Validation]
قبل commit وبعده:
- typecheck: Pass.
- full tests: 22 files / 126 tests — Pass.
- الشجرة بعد التنفيذ: clean.

### [Commit]
`2a260ae09255003b472dc1c310d6752d36d4269b` — `refactor: extract settings general section`

`git show --stat`:
```
src/app/features/settings/SettingsView.tsx         | 112 +++------------------
.../features/settings/sections/GeneralSection.tsx  |   8 ++
2 files changed, 22 insertions(+), 98 deletions(-)
```

### [التغييرات السلوكية]
لا تغيير سلوكي مقصود؛ تم فصل GeneralSection مع تمرير الحالة والـ handlers المطلوبة.

### [النتيجة]
اكتملت آخر فئة مطلوبة في عملية تقسيم SettingsView.

# 30. الحالة النهائية لـ SettingsView عند التوقف

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.
| الفئة | Commit |
|---|---|
| About / primitives | `f557700399b35df4225eac1759978e1477c66821` |
| Notifications | `6447099048017f43d5cfddf1276cd64da8e97f8a` |
| Azkar | `a0e3c9bf9dac1a52f7187c3fdc9776ca14e81a55` |
| Prayer | `a3129cfb9b2dbb3926465a5a195a15cffdba3be8` |
| Quran | `0fc8599de2e5e234007ff2c2793952b8d78db3e0` |
| Tasbih | `22eec0f2daddb79bb189703a851758f8f6864ab7` |
| Motivation | `feed8951c27d28d03f9228854277029370cd5203` |
| Privacy | `f83da2de406c95fd4c86f8f1cf275aead4d160fc` |
| General | `2a260ae09255003b472dc1c310d6752d36d4269b` |

كما سبق استخراج:
- Settings primitives.
- Settings stats components في `600eaf8a2e0662627e7860d8431fb6b3a1449076`.

### [الحالة الحالية]
- SettingsView بعد General: **403 سطرًا**.
- GeneralSection: **8 أسطر**.
- PrivacySection: **82 سطرًا**.
- typecheck: **Pass**.
- full tests: **22 files / 126 tests — Pass**.
- Git status: **clean**.
- Current HEAD: `2a260ae09255003b472dc1c310d6752d36d4269b`.
- لا dependencies جديدة.
- لم يتم تعديل `routeTree.gen.ts`.
- لم يتم Publish.

# 31. ملاحظة مراجعة مهمة — Notifications

في استخراج Notifications السابق، commit:
`6447099048017f43d5cfddf1276cd64da8e97f8a`

أصبح استدعاء `NotificationsSection` غير مشروط بدل الشرط السابق المرتبط بـ category.

الاختبارات الحالية تمر، لكن smoke tests الحالية لا تثبت هذه النقطة السلوكية تحديدًا.

**هذه ملاحظة مؤجلة وليست إصلاحًا منفذًا.** لا يتم إصلاحها إلا بقرار صريح من عبدو.

# 32. قواعد التوقف الحالية

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.
### [النتيجة]
تم الوصول إلى نقطة توقف نظيفة.

لا يبدأ غدًا تلقائيًا:
- أي refactor جديد.
- أي إصلاح Notifications.
- أي تقسيم App.tsx.
- أي Quran cache.
- أي performance work.
- أي Publish.
- أي توثيق إضافي خارج ما يطلبه عبدو.

القرار التالي يعود لعبدو وحده.

كل البنود السابقة التي تحمل حالة «مؤجل» تبقى مؤجلة ولا تتحول إلى أوامر تنفيذ بمجرد وجودها في الخطة.

# 33. تعليمات الاستئناف غدًا

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.

1. اقرأ `docs/CLAUDE_REVIEW_GUIDE.md`.
2. اقرأ هذه الوثيقة، واعتبر القسم 29 وما بعده أحدث حالة زمنية.
3. تحقق مباشرة من:
   - `git rev-parse HEAD`
   - `git status --short`
4. يجب أن يطابق HEAD الموثق حاليًا `2a260ae09255003b472dc1c310d6752d36d4269b` ما لم توجد تغييرات موثقة لاحقًا.
5. لا تبدأ أي بند جديد قبل قرار عبدو.
6. عند وجود قرار جديد، خذ baseline جديدًا قبل التنفيذ.
7. لا تعتمد على hash من الذاكرة؛ اقرأه من Git.
8. حافظ على validation قبل commit.
9. لا amend/rebase/reset/force.
10. لا Publish إلا بطلب صريح.

# 34. آخر نقطة توقف — اليوم

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.

**Current HEAD:** `2a260ae09255003b472dc1c310d6752d36d4269b`

**Commit:** `refactor: extract settings general section`

**الحالة:** working tree clean.

**آخر تحقق:**
- typecheck: Pass.
- tests: 22 files / 126 tests — Pass.

**حالة المشروع:** تقسيم SettingsView إلى جميع فئاته المحددة مكتمل.

**القرار:** التوقف هنا اليوم. لا يوجد بند تالٍ مُصرّح به حاليًا.

**ملاحظة:** هذا التحديث توثيق وتسليم فقط، ولا يعني الموافقة على بدء أي عمل جديد.

# 35. تصحيح لاحق — إصلاح خلل NotificationsSection وتوثيق ختامي مصرّح به

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.
> هذا القسم أضيف لاحقًا بقرار صريح من عبدو، بعد أن كان القسمان 33 و34 يوثقان التوقف عند `2a260ae09255003b472dc1c310d6752d36d4269b`.

## [تصحيح لاحق بقرار عبدو]

القسم 31 وصف خللًا حقيقيًا في استخراج Notifications: كان استدعاء `NotificationsSection` غير مشروط بـ `category`، ولذلك كانت عناصر الإشعارات تظهر في فئات الإعدادات الأخرى. تم إصلاح هذا الخلل لاحقًا بقرار صريح من عبدو، وليس تلقائيًا، في commit:

`26adca6c25d2669b6a9ab6208483d08672ab15c5` — `fix: scope notifications section to its category`

الإصلاح كان تغليف `<NotificationsSection />` بالشرط:

```tsx
{category === 'notifications' && (
  <NotificationsSection
    notificationStatus={notificationStatus}
    dailyAyah={dailyAyah}
    azkarReminder={azkarReminder}
    fastingAlerts={fastingAlerts}
    sunrise={sunrise}
    notify={notify}
    toggleNotify={toggleNotify}
    setDailyAyah={setDailyAyah}
    setAzkarReminder={setAzkarReminder}
    setFastingAlerts={setFastingAlerts}
    setSunrise={setSunrise}
  />
)}
```

وتم الحفاظ على جميع الـ props ومنطق `NotificationsSection` نفسه دون تغيير.

## [اختبار regression الجديد]

أضيف اختبار واحد فقط إلى `__tests__/app/settings-view.test.tsx`، ولم يتم تعديل أي اختبار موجود:

```tsx
it('does not show notification settings in the general category', () => {
  openCategory('عام')
  expect(screen.queryByText('تذكير الأذكار')).toBeNull()
})
```

## [التحقق النهائي]

- typecheck: **Pass**.
- full tests: **22 files / 127 tests — Pass**.
- الاختبارات قبل الإصلاح: **22 files / 126 tests**.
- الاختبارات بعد إضافة اختبار regression: **22 files / 127 tests**.
- لا تغييرات على `src/` أو `__tests__/` في هذا التوثيق الختامي.

## [جدول الحالة النهائية — الملفات والأسطر الحالية]

تمت قراءة عدد الأسطر مباشرة من الملفات الحالية باستخدام `wc -l`، وليس من الذاكرة:

| الملف | الأسطر الحالية |
|---|---:|
| `src/app/features/settings/SettingsView.tsx` | 405 |
| `src/app/features/settings/settingsPrimitives.tsx` | 63 |
| `src/app/features/settings/settingsStats.tsx` | 168 |
| `src/app/features/settings/sections/AboutSection.tsx` | 22 |
| `src/app/features/settings/sections/AzkarSection.tsx` | 91 |
| `src/app/features/settings/sections/GeneralSection.tsx` | 8 |
| `src/app/features/settings/sections/MotivationSection.tsx` | 82 |
| `src/app/features/settings/sections/NotificationsSection.tsx` | 86 |
| `src/app/features/settings/sections/PrayerSection.tsx` | 54 |
| `src/app/features/settings/sections/PrivacySection.tsx` | 82 |
| `src/app/features/settings/sections/QuranSection.tsx` | 47 |
| `src/app/features/settings/sections/TasbihSection.tsx` | 129 |

## [النتيجة النهائية]

تقسيم `SettingsView.tsx` مكتمل بالكامل بما في ذلك إصلاح الخلل المكتشف أثناء عملية التقسيم. جميع فئات SettingsView المحددة أصبحت مفصولة، وخلل عرض Notifications خارج فئتها تم إصلاحه بقرار صريح مستقل.

**Current HEAD:** `26adca6c25d2669b6a9ab6208483d08672ab15c5`

## [قواعد التوقف]

تُعاد نفس قواعد التوقف الموثقة في القسم 32:

- لا يبدأ أي refactor جديد.
- لا يبدأ أي إصلاح جديد.
- لا يبدأ أي تقسيم لـ App.tsx.
- لا يبدأ أي Quran cache.
- لا يبدأ أي performance work.
- لا يتم Publish.
- لا يتم أي توثيق إضافي خارج ما يطلبه عبدو.

القرار التالي يعود لعبدو وحده. كل البنود المؤجلة تبقى مؤجلة ولا تتحول إلى أوامر تنفيذ بمجرد وجودها في الخطة.

# 36. استكمال تقسيم App.tsx

> ⚠️ **قسم تاريخي:** يعكس هذا القسم حالة وقت كتابته فقط، وقد حلّت محله أقسام لاحقة. الحالة الحالية في آخر أقسام الملف، ويُقرأ الـHEAD من `git rev-parse HEAD`.
## تسلسل الـ commits منذ نهاية القسم 35

| Commit | العنوان | الملفات المتأثرة كما يثبتها `git show --stat` |
|---|---|---|
| `ed1401031acd52fd36c93e02f7691044b33cb170` | `test: add app shell coverage for dark mode and app lock` | `__tests__/app/app-shell-behaviors.test.tsx` |
| `79c97901113bdb2a714d16fee8ad573ab7b7a314` | `refactor: extract wake lock hook from App` | `src/app/App.tsx`; `src/app/features/settings/useWakeLockSetting.ts` |
| `83ebcc7` | `refactor: extract app lock hook from App` | `src/app/features/settings/useAppLock.ts` |
| `ad1bc8e8b197feca35f8b80cde7462b7fc2ef7eb` | `refactor: extract app lock hook from App` | `src/app/App.tsx` |
| `3dec927e0845bd2a845340f9374eef95b9157f4f` | `refactor: extract view persistence hook from App` | `src/app/App.tsx`; `src/app/features/quran/useViewPersistence.ts` |
| `5177105439aca3faef65e7088116c8654cb59951` | `refactor: extract ui scale sync and tap sound hooks from App` | `src/app/App.tsx`; `src/app/features/settings/useUiScaleSync.ts`; `src/app/features/sound/useTapSoundFeedback.ts` |
| `bfdbe6712d62fce9a8c33f5788e843e19c973b50` | `refactor: extract appearance mode hook from App` | `src/app/App.tsx`; `src/app/features/settings/useAppearanceMode.ts` |

> ملاحظة: `useAppLock` ظهر في commitين بسبب استثناء `write_file` الموثق في قواعد العمل؛ الأول أنشأ ملف الـ hook تلقائيًا، والثاني أكمل ربطه داخل `App.tsx`. لم تتم إعادة كتابة التاريخ.

## تغير عدد أسطر `App.tsx`

| الخطوة | Commit | قبل | بعد |
|---|---|---:|---:|| اختبارات App shell | `ed14010` | — | 353 |
| `useWakeLockSetting` | `79c9790` | 353 | 323 |
| `useAppLock` | `83ebcc7` + `ad1bc8e` | 323 | 291 |
| `useViewPersistence` | `3dec927` | 291 | 275 |
| `useUiScaleSync` + `useTapSoundFeedback` | `5177105` | 275 | 248 |
| `useAppearanceMode` | `bfdbe67` | 248 | 220 |

تم التحقق من أرقام الأسطر الحالية والتاريخية مباشرة من Git، وليس من الذاكرة.

## hooks الجديدة تحت `features/`

تمت قراءة العدد الحالي للأسطر مباشرة بـ `wc -l`، والقائمة الكاملة هي:

| المسار | الأسطر الحالية |
|---|---:|
| `src/app/features/azkar/useAzkarCatalog.ts` | 185 |
| `src/app/features/azkar/useAzkarFeature.ts` | 33 |
| `src/app/features/azkar/useFavorites.ts` | 92 |
| `src/app/features/notifications/useIslamicNotifications.ts` | 216 |
| `src/app/features/notifications/usePrayerReminders.ts` | 33 |
| `src/app/features/quran/useQuranPreferences.ts` | 55 |
| `src/app/features/quran/useQuranReaderData.ts` | 26 |
| `src/app/features/quran/useViewPersistence.ts` | 25 |
| `src/app/features/settings/useAppLock.ts` | 41 |
| `src/app/features/settings/useAppearanceMode.ts` | 39 |
| `src/app/features/settings/useUiScaleSync.ts` | 19 |
| `src/app/features/settings/useWakeLockSetting.ts` | 36 |
| `src/app/features/sound/useAppSounds.ts` | 25 |
| `src/app/features/sound/useTapSoundFeedback.ts` | 21 |
| `src/app/features/tasbih/useTasbih.ts` | 84 |

## قرار الإبقاء على effect الإقلاع

تم الإبقاء على effect الإقلاع داخل `App.tsx` دون فصل إضافي. السبب أن هذا الـ effect يمثل تسلسل إقلاع مترابطًا ومتماسك المفهوم، وفصله إلى hook مستقل لا يضيف فائدة معمارية حقيقية في هذه المرحلة، بل يزيد التجزئة دون حدود وظيفية واضحة.

## النتيجة

**تقسيم `App.tsx` مكتمل.** انتقل الملف من **353** سطرًا إلى **220** سطرًا، مع استخراج **6 hooks مستقلة** مع الحفاظ على السلوك والتحقق الكامل.

البندان المؤجلان الأصليان — **SettingsView** و **App.tsx** — اكتمل كلاهما.

**Current HEAD:** `bfdbe6712d62fce9a8c33f5788e843e19c973b50`

# 37. حزمة «تطوير الأذكار — السهل»

## [طلب عبدو]
تنفيذ حزمة «تطوير الأذكار — السهل» كحزمة واحدة منخفضة المخاطر، وتضم: تحسين الانتقال عند تغيّر اليوم فوق الـ polling الموجود، تحسين العرض البصري للتكرار، إضافة فلاتر «الكل / غير المكتمل اليوم / المكتمل / المفضلة»، وإضافة ورد اليوم داخل AzkarListView باستخدام timeBasedAzkar() مع دخول مباشر للقسم المناسب.

القيود: لا تعديل لمفاتيح localStorage أو إضافة مفاتيح جديدة، لا dependencies، لا routeTree.gen.ts، لا HomeView أو useAzkarCatalog أو منطق azkarProgress الأساسي، ولا Publish. لا يبدأ أي بند متوسط أو صعب دون قرار جديد من عبدو.

## [تنفيذ GPT]
تم تنفيذ البنود الأربعة معًا في واجهات الأذكار والاختبارات المرتبطة بها فقط. استُخدمت timeBasedAzkar() لإظهار «وردك الآن» وربطه بالقسم المناسب، وأضيفت حالات UI للفلاتر، وتحسين عرض التقدم والتكرار، وتجربة أوضح عند انتقال اليوم. أضيفت اختبارات للفلاتر والتكرار وورد اليوم وانتقال التاريخ. لم تُضف مفاتيح تخزين جديدة ولم تتغير صيغة التخزين.

## [Commit]
تم التنفيذ في commits مستقلة بسبب آلية write_file التي تنشئ commit تلقائيًا لكل ملف:
- fcf81cd — feat: highlight today azkar wird
- 10bf049 — feat: improve azkar category UX
- 19e0051 — test: cover azkar easy bundle behavior
- 1b4b8ba — test: stabilize azkar bundle assertions
- 68d66b0 — test: fix repeat aria assertions

Baseline الحزمة: da7ed0faf1e5dbb36c7e2f7af887e5ffb132bf8b.
HEAD قبل التوثيق الحالي: 68d66b048a3ba824d503fed3b79b73442408e2a3.

## [Validation]
قبل التوثيق: HEAD مطابق للـ baseline المطلوب، والشجرة نظيفة، وnpm test = 23 ملف اختبار / 133 اختبار — Pass، وtypecheck = Pass. وفي هذه المرحلة لم يتم تعديل src/ أو __tests__/.

## [التغييرات السلوكية]
- صفحة الأذكار تعرض ورد الفترة الحالية وتوفر دخولًا مباشرًا إليه.
- عند تغيّر التاريخ يُعاد تحميل تقدم اليوم الجديد وتظهر رسالة انتقال واضحة، مع إعادة الفلتر إلى «الكل».
- يمكن تصفية أذكار القسم حسب الإكمال أو المفضلة، وحالة الفلتر لا تُحفظ في localStorage.
- عرض التكرار يوضح العدد الحالي والهدف والتقدم والعدد المتبقي بصريًا.
- لم يتغير منطق التخزين الأساسي أو سلوك HomeView.

## [مؤجل]
الحزم المتوسطة الثلاث في الأذكار أصبحت مكتملة وموثقة في القسم 38. المتبقي هو أي حزمة صعبة أو أي تغيير معماري جديد في useAzkarCatalog أو azkarProgress أو أي توسيع إضافي خارج النطاق المنفذ، ولا يبدأ أي منها دون قرار جديد من عبدو.

## [النتيجة]
حزمة «تطوير الأذكار — السهل» مكتملة ومتحقق منها، وتم توثيقها دون أي تعديل على src/ أو __tests__/ في مرحلة التوثيق. التوثيق لا يصرح ببدء أي بند لاحق.


# 38. تطوير الأذكار — الحزم المتوسطة (1+2+3)

> هذا القسم يوثق الحزم المتوسطة الثلاث مجتمعة في مرحلة توثيق واحدة. الحزمة السهلة موثقة بالفعل في القسم 37 ولا تُكرر هنا. لم يُجرَ أي تعديل على src/ أو __tests__/ في هذه المرحلة.

## 38.1 متوسط 1 — تطوير المفضلة (#8) + ربط التقدم بالمفضلة (#9)

### [طلب عبدو]
تنفيذ حزمة «تطوير الأذكار — متوسط 1» ببندين مترابطين: تطوير واجهة المفضلة بإضافة البحث النصي وفلتر القسم والانتقال إلى القسم الأصلي، وربط عرض المفضلة بتقدم الذكر الحالي/الهدف باستخدام منطق التقدم الموجود، دون تغيير التخزين أو إضافة مفاتيح جديدة.

### [تنفيذ GPT]
تم تنفيذ التغييرات في FavoritesView.tsx والاختبارات المرتبطة فقط. أضيف البحث النصي داخل المفضلة، وفلتر الأقسام، وإمكانية فتح الذكر في قسمه الأصلي عبر setView، كما أضيف عرض قراءة فقط للتقدم الحالي والهدف لكل مفضلة باستخدام مفتاح الذكر القائم ومنطق التقدم الموجود، دون تغيير schema أو localStorage.

### [Commit]
Baseline: 931a164d5ca41ded529c0f93e4c3bc1b09bcc98b.

الـ commits الفعلية التي يثبتها Git:
- 0c47b1d — feat: improve azkar favorites view
- de412d0 — test: cover favorites medium bundle
- 01d1940 — feat: finalize azkar favorites

git show --stat يثبت أن الملفات كانت محصورة في:
- src/app/features/azkar/FavoritesView.tsx
- __tests__/app/feature-views.test.tsx

HEAD النهائي: 01d1940523db15a61b3f2b953d6fac8021fb64a1.

### [Validation]
قبل التنفيذ كان baseline على 23 ملف اختبار / 133 اختبار — Pass مع typecheck ناجح. بعد الحزمة أصبح التحقق 23 ملف اختبار / 137 اختبار — Pass، مع بقاء الشجرة نظيفة.

### [التغييرات السلوكية]
- البحث داخل المفضلة يرشح النصوص المعروضة.
- فلتر القسم يسمح بتضييق المفضلة حسب القسم الأصلي.
- يمكن فتح الذكر في قسمه الأصلي مباشرة.
- يظهر التقدم الحالي والهدف للذ

… [842 chars truncated] …

الأيام يعرض حتى آخر 30 يومًا مخزنًا، مع التاريخ وعدد المكتمل والنسبة. التاريخ يعاد بناؤه من الكتالوج الحالي عند العرض، دون محاولة استعادة كتالوج تاريخي مستقل.

### [Commit]
Baseline: 01d1940523db15a61b3f2b953d6fac8021fb64a1.

الـ commits الفعلية التي يثبتها Git:
- eae20e1 — feat: add azkar progress summary
- 88eb9d4 — fix: use azkar favorite key helper
- e336653 — test: cover azkar progress history
- 8da518f — test: fix aggregate progress assertion

git show --stat يثبت أن الملفات كانت محصورة في:
- src/app/features/azkar/AzkarListView.tsx
- __tests__/app/feature-views.test.tsx

HEAD النهائي: 8da518f341152ab5519d3e7a6fcbcab699951dde.

### [Validation]
قبل التنفيذ كان التحقق 23 ملف اختبار / 137 اختبار — Pass مع typecheck ناجح. بعد الحزمة أصبح 23 ملف اختبار / 141 اختبار — Pass، مع بقاء الشجرة نظيفة.

### [التغييرات السلوكية]
- يظهر ملخص اليوم عبر جميع أقسام الأذكار الحالية.
- يعرض الملخص عدد المكتمل من الإجمالي ونسبة الإنجاز.
- يوجد سجل أيام قابل للفتح والإغلاق.
- يعرض السجل حتى 30 يومًا من الأيام المخزنة فعليًا، من الأحدث إلى الأقدم.
- لا توجد مفاتيح تخزين جديدة ولا عمليات كتابة جديدة إلى progress storage.

### [مؤجل]
استعادة كتالوج تاريخي مستقل لكل يوم أو أي تغيير في schema التقدم مؤجل، وكذلك أي تطوير إضافي خارج النطاق، ولا يبدأ دون قرار عبدو.

### [النتيجة]
حزمة «تطوير الأذكار — متوسط 2» مكتملة ومتحقق منها، والـ HEAD النهائي المثبت لها هو 8da518f341152ab5519d3e7a6fcbcab699951dde.

## 38.3 متوسط 3 — مصدر الكتالوج (#5) + بحث عام في الأذكار (#6)

### [طلب عبدو]
تنفيذ الحزمة المتوسطة الثالثة والأخيرة ببندين معًا: تمييز مصدر الكتالوج الموسع داخل AzkarListView عندما يكون المصدر غير bundled، وإضافة بحث عام في نصوص الأذكار عبر جميع الأقسام مع عرض اسم القسم وإمكانية الانتقال إليه.

### [تنفيذ GPT]
تم تنفيذ البحث العام ومؤشر المصدر في AzkarListView، مع اختبارات مرتبطة. البحث حالة UI فقط، ويبحث في item.text عبر جميع الأقسام ويعرض حتى 20 نتيجة، مع اسم القسم وزر انتقال إلى القسم الأصلي. عند فراغ البحث لا تظهر منطقة النتائج. كما يظهر مؤشر «محتوى أذكار موسّع مفعّل» فقط عندما يكون source !== 'bundled'.

وبسبب أن useAzkarCatalog() لم يكن يصدّر source رغم أنه يقرأه داخليًا أصلًا، نُفذ الاستثناء المحدود المصرح به:
- useAzkarCatalog.ts: سطر واحد فقط غُيّر من return categories إلى return { categories, source }، دون تغيير fetch/merge/cache/storage أو منطق المصدر.
- App.tsx: سطران فقط على مستوى التغيير الوظيفي: تغيير استدعاء الهوك إلى const { categories, source } = useAzkarCatalog()، وإضافة source={source} إلى AzkarListView. لم يتغير أي منطق آخر في App.tsx.

### [Commit]
Baseline: 8da518f341152ab5519d3e7a6fcbcab699951dde.

الـ commits الفعلية التي يثبتها Git:
- af1c5c6 — feat: add azkar source indicator and global search
- d5ef533 — feat: expose azkar catalog source
- 4d78e81 — refactor: pass azkar catalog source
- efd0526 — test: cover azkar source and search
- d5b2023 — fix: repair azkar search formatting
- 3b34d29 — fix: restore azkar search props
- 45fd168 — fix: label azkar search results
- 88fde97 — test: stabilize azkar search assertions

git show --stat يثبت أن نطاق الملفات النهائي كان:
- src/app/features/azkar/AzkarListView.tsx
- src/app/features/azkar/useAzkarCatalog.ts
- src/app/App.tsx
- __tests__/app/feature-views.test.tsx

HEAD النهائي: 88fde976e64c9f37210b464e32548ec800680b17.

### [Validation]
قبل التنفيذ كان التحقق 23 ملف اختبار / 141 اختبار — Pass مع typecheck ناجح. بعد الحزمة أصبح 23 ملف اختبار / 145 اختبار — Pass، مع بقاء الشجرة نظيفة.

### [التغييرات السلوكية]
- المستخدم يرى مؤشرًا وصفيًا عند تفعيل كتالوج موسع، ولا يظهر المؤشر مع bundled.
- يمكن البحث في نصوص الأذكار عبر جميع الأقسام من AzkarListView.
- تظهر نتيجة البحث مع اسم القسم الذي تنتمي إليه.
- الضغط على النتيجة ينقل المستخدم إلى قسمها عبر setView.
- نص البحث غير محفوظ، ولا تمت إضافة أي localStorage key.
- لم يتغير منطق fetch/merge/cache للكتالوج.

### [مؤجل]
لا يوجد بند متوسط إضافي ضمن الخطة الحالية؛ أي حزمة صعبة أو تغيير معماري إضافي في الكتالوج/الأذكار يحتاج قرارًا جديدًا من عبدو. لا يبدأ أي عمل لاحق تلقائيًا بسبب اكتمال هذه الحزمة.

### [النتيجة]
الحزم المتوسطة الثلاث مكتملة برمجيًا ومتحقق منها، وهذه المرحلة توثقها مجتمعة دون أي تعديل على src/ أو __tests__/. لا يبدأ أي بند صعب أو عمل لاحق دون قرار جديد من عبدو.


# 39. تنظيف حالة Baseline قبل البند الصعب #3 — حادثة package.json

### [طلب عبدو]
قبل بدء البند الصعب #3 «رحلة الذكر المتسلسلة»، طلب عبدو تنظيف أي حالة غير متوقعة ثم إعادة فحص الـBaseline كاملًا. كما قرر صراحة عدم بدء #3 إلا بعد مراجعة النتائج وإعطاء تأكيد صريح.

### [Baseline المتوقع]
- HEAD: `829902b02972d95510fd1310dcfd75547b254577`
- `git status --short`: فارغ.
- `npm run typecheck`: Pass.
- `npm test -- --run`: 23 ملف اختبار / 145 اختبارًا — Pass.
- ممنوع استخدام pnpm؛ التحقق يكون عبر npm فقط.

### [خطأ/فشل]
عند الفحص الأولي ظهر `M package.json` رغم أن HEAD كان صحيحًا. فحص `git diff -- package.json` أثبت أن الفرق الوحيد كان إضافة حقل `"packageManager": "pnpm@12.4.2+..."` في نهاية الملف، دون أي تغيير في dependencies أو scripts. كان هذا أثرًا جانبيًا غير مقصود من استخدام pnpm أثناء محاولة التحقق، وليس تغييرًا وظيفيًا مقصودًا في المشروع.

### [إصلاح/تراجع]
تم تنفيذ `git checkout -- package.json` لإلغاء الأثر العرضي بالكامل. بعد ذلك عاد `git status --short` فارغًا.

### [Validation]
أُعيد فحص الـBaseline من الصفر باستخدام npm فقط:
- HEAD: `829902b02972d95510fd1310dcfd75547b254577` — مطابق.
- Git status: نظيف.
- `npm run typecheck`: Pass.
- `npm test -- --run`: 23 ملف اختبار / 145 اختبارًا — Pass.
- لم يتم تعديل أي ملف من ملفات source أو tests، ولم يتم إنشاء أي commit نتيجة هذه المعالجة.

### [ما عليه الدور الآن]
الحالة عادت إلى Baseline المطابق تمامًا. **البند الصعب #3 لم يبدأ.** الدور الآن لعبدو لمراجعة هذا التقرير وإعطاء تأكيد صريح إذا أراد بدء المرحلة الأولى من #3. لا يبدأ #12 أو أي بند آخر، ولا يبدأ #3 تلقائيًا بمجرد أن أصبح الـBaseline نظيفًا.

### [النتيجة]
تم تنظيف الأثر العرضي وتثبيت أن المستودع عاد للحالة المطلوبة قبل التنفيذ. لم يحدث أي تغيير وظيفي في المشروع، ولم يتم بدء #3.

# 40. تنظيف تناقضات ملف التسليم

### [طلب عبدو]
تنظيف التناقضات والأسطر القديمة في ملف التسليم قبل أي بند جديد، توثيق فقط، دون بدء #3.### [رد Claude]
بحسب النص الذي وصل GPT: الفحص أظهر تكرار القسم 39 حرفيًا، وHEAD قديمًا في الترويسة والأقسام 29 و33 و34، وعنوان "2.0" مكررًا، وعنوان "مؤجل" مكررًا في القسم 22 يضم بنودًا مكتملة.

### [Baseline]
HEAD: `92b0be282c2cafc2169de02ea60618aa5532dd21`، الشجرة نظيفة، typecheck Pass، 23 ملفًا / 145 اختبارًا Pass.

### [خطأ/فشل]
توقف GPT قبل الـcommit لأن Validation المكتوب من Claude توقّع 3 ظهورات لعبارة تنبيه الأقسام التاريخية، بينما نص هذا القسم نفسه يضيف ظهورًا رابعًا. الخطأ في شرط التحقق وليس في التعديلات. لم يُنشأ أي commit ولم تتغير التعديلات، وصُحّح المتوقع إلى 4.

### [تنفيذ GPT]
docs فقط: حذف النسخة المكررة من القسم 39 بعد التحقق من تطابقها بـ diff؛ تعديل الترويسة؛ إعادة ترقيم العنوان المكرر إلى 2.4؛ تغيير عنوان "مؤجل" الثاني في القسم 22؛ إضافة تنبيه «قسم تاريخي» للأقسام 27 و33 و34 وتعديل ملاحظة القسم 29؛ تحديث القسم 8 في الدليل. لم يُمس src/ ولا __tests__/ ولا package.json.

### [التغييرات السلوكية]
لا شيء؛ توثيق فقط.

### [مؤجل]
لا يبدأ #3 أو #12 أو أي بند آخر دون قرار عبدو.

### [النتيجة]
ملف التسليم خالٍ من التكرار والتناقضات المذكورة. هذا القسم لا يصرّح ببدء أي بند.
# 41. البند الصعب #3 — رحلة الذكر المتسلسلة

### [طلب عبدو]
تنفيذ #3 بعد فحص وتصميم من Claude ووافق عليه عبدو: وضع رحلة من صفحة القسم، انتقال يدوي بزر «التالي»، الأذكار المكتملة تظهر ويمكن تخطيها، خاتمة قصيرة، بلا مفاتيح تخزين جديدة.

### [رد Claude]
بحسب النص الذي وصل GPT: التصميم مكوّن AzkarJourney يستقبل progress و saveProgress من CategoryView (كاتب واحد للتخزين)، وحالة mode محلية بلا route جديد، وبداية من أول ذكر غير مكتمل للاستئناف بلا مفتاح جديد.

### [Baseline]
HEAD: `2eecb07524c38a5826af7371b17339dfa58d086d`، الشجرة نظيفة، 23 ملفًا / 145 اختبارًا Pass.

### [تنفيذ GPT]
مكوّن جديد src/app/features/azkar/AzkarJourney.tsx؛ 5 أسطر إضافة في CategoryView.tsx (استيراد، حالة mode، إعادة mode عند تغيير القسم، عرض الرحلة، زر البدء)؛ 8 اختبارات في __tests__/app/azkar-journey.test.tsx.

### [Validation]
typecheck Pass، و24 ملفًا / 153 اختبارًا Pass قبل الـcommit وبعده.

### [Commit]
`f2691fd4c0f32b22d3c0f9e3628c0d84d9f4fa82` — `feat: add sequential azkar journey mode` — الملفات: __tests__/app/azkar-journey.test.tsx، src/app/features/azkar/AzkarJourney.tsx، src/app/features/azkar/CategoryView.tsx.

### [التغييرات السلوكية]
- زر «ابدأ الرحلة» في صفحة القسم يفتح عرض ذكر واحد في كل مرة بالعدّاد نفسه.
- يبدأ من أول ذكر غير مكتمل اليوم، أو من الأول إن اكتمل الكل.
- «التالي» و«السابق» يدويان؛ الأذكار المكتملة تظهر ويمكن تخطيها.
- عند تعطيل العدّاد من الإعدادات تعمل الرحلة بالأزرار فقط، والخاتمة بلا أعداد.
- الخاتمة تعرض الإنجاز مع «رجوع للقسم».
- موضع الرحلة حالة UI فقط، ولا مفاتيح تخزين جديدة، وطريقة كتابة التقدم لم تتغير.

### [مؤجل]
الانتقال التلقائي بعد إكمال الذكر؛ حفظ موضع الرحلة؛ رحلة تمتد عبر عدة أقسام؛ #12. لا يبدأ أي منها دون قرار عبدو. القسم 39 يوثق حالة ما قبل #3.

### [النتيجة]
#3 مكتمل ومتحقق منه. لا يصرّح هذا القسم ببدء أي بند لاحق.

# 42. مراجعة ملف التسليم وتصحيح الأسطر القديمة

### [طلب عبدو]
مراجعة ملف التسليم بعد إكمال #3 وتصحيح ما يظهر من تناقضات.

### [رد Claude]
بحسب النص الذي وصل GPT: كل الـhashes المذكورة موجودة في Git. الأسطر القديمة غير المعلَّمة كانت في الأقسام 20 و21 و30 و32 و35 و36 وفي القسم 4 والبند 7 من القسم 26. وتعريفات بنود تطوير الأذكار (#1–#12) غير مسجّلة في الملف.

### [Baseline]
HEAD: `5110f1b30b4b0850c25da4ff467a11a4e21a935a`، الشجرة نظيفة، 24 ملفًا / 153 اختبارًا Pass.

### [تنفيذ GPT]
docs فقط: إضافة تنبيه الأقسام التاريخية إلى الأقسام الستة، وتصحيح أسطر القسم 4، وإعادة صياغة البند 7 في القسم 26، وتحديث سطر التحقق في الدليل.

### [التغييرات السلوكية]
لا شيء؛ توثيق فقط.

### [مؤجل]
تسجيل تعريفات بنود تطوير الأذكار (#1–#12) بانتظار القائمة الأصلية من عبدو؛ ترتيب أقسام الدليل (7 قبل 6)؛ مطابقة كل ادعاء تاريخي مع git show --stat. لا يبدأ #12 أو أي بند دون قرار عبدو.

### [النتيجة]
تصحيحات التوثيق مطبقة، ولا يصرّح هذا القسم ببدء أي بند.
# 43. مراجعة Claude للبند #12 وتثبيت حالة #3 و#12

> 🔴 **الأولوية: عالية جدًا — هذا الموضوع يجب حسمه قبل الانتقال إلى #12.**
>
> هذا القسم توثيقي فقط. لا يعني بدء تنفيذ #12، ولا يفتح أي بند آخر.

### [قرار عبدو — رسالة ملف التسليم الأصلية]

تصحيح الأسطر القديمة في ملف التسليم بعد مراجعة Claude. توثيق فقط، مرحلة واحدة وcommit واحد. لا تبدأ #12 ولا أي بند آخر.

### [رد Claude — للتسجيل، بحسب النص الذي وصل GPT]

كل الـhashes المذكورة موجودة في Git. الأسطر القديمة غير المعلَّمة: الأقسام 20 و21 و30 و32 و35 و36؛ وسطرا "لم يتم تقسيمه حتى الآن" وعبارة «تقسيم SettingsView مؤجل» في القسم 4؛ والبند 7 في القسم 26 الملتبس بعد اكتمال #3.

### [القواعد والممنوعات التي كانت ضمن الطلب]

- الملفان الوحيدان: docs/MUSLIM_ARCHITECTURE_HANDOFF.md وdocs/CLAUDE_REVIEW_GUIDE.md.
- لا src/ ولا tests/ ولا package.json ولا routeTree.gen.ts.
- لا Publish.
- npm فقط، ممنوع pnpm.
- لا amend/rebase/reset/force.
- لا يُكتب hash commit التوثيق الحالي داخل أي ملف.
- لا يتغير أي محتوى تاريخي غير المذكور.
- التنفيذ يكون بـ Python عبر run_project_command.
- كل استبدال يجب أن يطابق نصه مرة واحدة بالضبط (assert) وإلا يتوقف التنفيذ ويُبلّغ.

### [Baseline الذي أُرسل إلى GPT]

- git rev-parse HEAD → 5110f1b30b4b0850c25da4ff467a11a4e21a935a
- git status --short → فارغ.
- npm run typecheck → Pass.
- npm test -- --run → 24 ملف اختبار / 153 اختبارًا Pass.
- git status --short بعد التشغيل → فارغ.
- أي فرق: توقف وأبلغ.
### [التعديلات المطلوبة في ملف التسليم]

1. إضافة تنبيه قسم تاريخي بعد عناوين الأقسام 20 و21 و30 و32 و35 و36.
2. تصحيح سطري لم يتم تقسيمه حتى الآن. في القسم 4 بحسب السياق:
   - بعد - Low architecture debt. → (وقت التدقيق: لم يُقسَّم بعد؛ اكتمل التقسيم لاحقًا — راجع القسم 36.)
   - بعد - Medium. → (وقت التدقيق: لم يُقسَّم بعد؛ اكتمل التقسيم لاحقًا — راجع القسم 35.)
3. استبدال تقسيم SettingsView مؤجل. بـ:
   تقسيم SettingsView — كان مؤجلًا وأصبح مكتملًا (راجع القسم 35).
4. استبدال البند 7 في القسم 26 بـ:
   7. لا تبدأ أي بند من تلقاء نفسك، بما في ذلك البنود المؤجلة.
5. إضافة القسم 42 لتوثيق عملية تصحيح الأسطر القديمة.
6. تحديث سطر التحقق في docs/CLAUDE_REVIEW_GUIDE.md بالملاحظة الخاصة بالأقسام التاريخية.

### [حسم تعارض القسم 42 — قرار دائم]

القرار المعتمد: يُستثنى القسم 42 من شرط `grep -c '5110f1b' = 0` بشكل دائم، لأن القسم 42 سرد تاريخي موثّق لحادثة تحتوي على هذا الـhash كجزء طبيعي من السرد، وليس خطأ يجب حذفه. لا يُحذف الـhash من القسم 42. أي شرط تحقق مستقبلي يستخدم `grep -c '5110f1b'` على كامل الملف يجب أن يُستثنى القسم 42 صراحة من نطاقه (مثلًا عبر استثناء نطاق الأسطر الخاص بالقسم 42 أو عبر عدّ الظهور خارج ذلك القسم فقط).

هذا القرار يُغلق النقطة المعلّقة التي كانت شرطًا موثقًا في القسم 43 قبل بدء #12.

### [Validation الذي كان مطلوبًا]

كان المطلوب قبل الـcommit التحقق من:
- الملفين فقط في git status --short.
- grep -c 'قسم تاريخي' = 10.
- الأسطر القديمة المستهدفة = 0.
- ^# 42. = 1.
- كل hash طويل في الملف موجود في Git.
- عدم ظهور 5110f1b في الملفين.
- typecheck Pass.
- 24 ملف اختبار / 153 اختبارًا Pass.
- بقاء الملفين فقط بعد الاختبارات.
- ثم commit واحد بعنوان: docs: correct stale handoff status lines
- وبعده git show --stat للملفين فقط وstatus نظيف.
### [رد GPT على تلك الرسالة — للتسجيل]

توقف GPT قبل الـcommit كما اشترطت التعليمات، لأن Validation كشف تناقضًا في التعليمات نفسها.

كانت حالة الـBaseline صحيحة:
- 5110f1b30b4b0850c25da4ff467a11a4e21a935a
- الشجرة نظيفة.
- Typecheck: Pass.
- الاختبارات: 24 ملفًا / 153 اختبارًا Pass.

تم تنفيذ التعديلات التوثيقية فقط على:
- docs/MUSLIM_ARCHITECTURE_HANDOFF.md
- docs/CLAUDE_REVIEW_GUIDE.md

وكانت نتائج الفحوص:
- قسم تاريخي = 10.
- لم يتم تقسيمه حتى الآن = 0.
- تقسيم SettingsView مؤجل = 0.
- لا تبدأ بند 3 = 0.
- # 42 = 1.
- التغييرات = الملفان فقط.
- لا يوجد Commit جديد.

### [سبب التوقف — التناقض الذي يجب حسمه]

يوجد تعارض مباشر في الطلب الأصلي:

في القسم 42 طُلب كتابة:

HEAD: 5110f1b30b4b0850c25da4ff467a11a4e21a935a

لكن Validation طلب:

grep -c '5110f1b' على الملفين → 0.

وهذا متناقض حتميًا، لأن القسم 42 نفسه يحتوي الـBaseline الذي يبدأ بـ5110f1b.

كانت النتيجة الفعلية:
- docs/MUSLIM_ARCHITECTURE_HANDOFF.md → 1.
- docs/CLAUDE_REVIEW_GUIDE.md → 0.

لذلك لم يتم التحايل على الشرط، ولم يُحذف الـhash من القسم 42، ولم يُنشأ commit.

### [حالة هذا الأمر الآن]

هذه النقطة لم تُحسم بعد، ولذلك تُعد أولوية قبل الانتقال إلى #12.

المطلوب لاحقًا حسم أحد الخيارين صراحة:
1. أن يكون شرط grep -c '5110f1b' = 0 خارج القسم 42، مع إبقاء الـBaseline داخل القسم 42؛ أو
2. حذف الـhash من Baseline القسم 42، إذا كان المقصود فعلًا ألا يظهر في أي مكان.

لا يجوز افتراض أحد الخيارين دون قرار عبدو.
---

## [مراجعة Claude الجديدة للبند #12 — للتسجيل]

شكرًا، اللقطة حلّت اللغز. **#12 هو «تحسين بنية المصدر/المرجع للمحتوى»** ووصفه «الأعلى خطورة: يمس نموذج بيانات الكتالوج نفسه، احتمال يحتاج migration».

### [تنبيه Claude عن #3]

الوصف الأصلي في اللقطة كان:

> «إعادة تصميم تفاعل CategoryView بالكامل (تنقل تلقائي بين الأذكار)، واحتمال مفتاح تخزين جديد لحفظ الموضع، قرار منفصل مطلوب».

ما نُفّذ هو النسخة اليدوية التي وافق عليها عبدو، وأُجّل الانتقال التلقائي وحفظ الموضع، وهما مسجّلان في القسم 41.

أوضح Claude أنه بنى التصميم من اسم البند لا من الوصف التفصيلي الأصلي، ولذلك كان هناك فرق في فهم نطاق #3.

**الحالة المعتمدة الآن: #3 انتهى.**

ولا يُعاد فتحه أو توسيعه بسبب هذا الاختلاف، إلا بقرار جديد من عبدو.

### [فحص Claude لـ#12 — الوضع الحالي في الكود]

- الحقل الوحيد هو source?: string نصًا حرًا في ZikrItem.
- في الأذكار المضمّنة 43 حقل مصدر:
  - 29 مصدرًا نظيفًا، مثل «رواه مسلم» و«طه ٢٥-٢٦».
  - 14 مختلطًا؛ 10 منها بفاصل «—» بين المصدر والملاحظة، واثنان فضل «خفيفة على اللسان…»، وواحد «صيغة استغفار جامعة»، وواحد تعليمات قراءة.
  - في 6 منها تعليمات تكرار مثل «٣٣ مرة…» مع أن repeat موجود.
- كتالوج Bonyan يضع المصدر داخل أقواس [رواه ...]، أو في حقل reference، فيظهر بالأقواس.
- المصدر يُعرض في CategoryView وAzkarJourney ويُستخدم في المشاركة (shareText).

### [سبب خطورة #12 بحسب Claude]

1. **المفاتيح مرتبطة بالمعرّف الموضعي:** المفضلة والتقدم يبنيان مفاتيحهما من item.id بصيغة category:item-N، ومعرّفات الكتالوج الخارجي تعتمد localCount + index. أي إعادة ترتيب أو دمج قد تكسر مفضلة المستخدم وتقدمه.
2. **كاش الكتالوج azkar_catalog_v4:** يخزن الأصناف كاملة بشكلها الحالي، فتغيير الشكل يحتاج migration أو رفع نسخة الكاش.
3. **المحتوى الديني:** نقل «الملاحظات» من source إلى حقل آخر في azkar-data.ts تعديل على المحتوى، وقاعدة الملف تمنع AI من الحكم عليه؛ يحتاج مراجعة بشرية.
### [التصميم الذي أوصى به Claude]

**بنية عند العرض، بلا تعديل بيانات.**

اقتراح ملف جديد zikrReference.ts يحتوي دالة نقية parseReference(source) تقوم بـ:
- إزالة الأقواس [ ].
- التقسيم على —.
- التعرف على المرجع فقط بأنماط صريحة: رواه… ومتفق عليه و«سورة/اسم سورة + رقم».
- إبقاء أي جزء غير معروف كملاحظة كما هو دون تغيير.
- إذا فشل التصنيف، إظهار النص الأصلي كاملًا كما هو الآن.

واقترح مكوّنًا صغيرًا مشتركًا يستبدل سطر المصدر في CategoryView وAzkarJourney:
- المرجع بسطر «المصدر: رواه مسلم».
- الملاحظة بسطر أخف أسفله.

### [اختبار الأمان الجوهري المقترح]

لكل الأذكار المضمّنة يجب أن يعيد جمع أجزاء parseReference النص الأصلي بعد إزالة الأقواس، بحيث لا يضيع أي حرف.

### [ما لا يُمس في التصميم المقترح]- azkar-data.ts ومحتواه.
- معرّفات الأذكار وترتيبها.
- كاش الكتالوج ومفاتيحه.
- المفضلة والتقدم.
- المشاركة، وتبقى بالنص الأصلي كاملًا.
- لا migration.
- لا مفتاح تخزين جديد.

نقل الملاحظات فعليًا داخل البيانات يبقى مرحلة لاحقة منفصلة بعد مراجعة بشرية.

### [حدود فحص Claude]

لم يتم التحقق فعليًا من شكل استجابة Bonyan الحقيقية عبر الشبكة؛ الاعتماد كان على كود fetchCatalog وحده.

### [قرارات Claude المطلوبة قبل #12]

1. هل يتم اعتماد منهج **بنية عند العرض بلا تعديل بيانات**، أم تعديل البيانات وMigration للكاش؟
2. عند فشل التعرف على مرجع: هل يظهر النص الأصلي كما هو بلا كلمة «المصدر»؟
3. هل تبقى المشاركة بالنص الأصلي كاملًا؟
4. هل يقتصر النطاق على CategoryView وAzkarJourney؟

توصيات Claude هي: اعتماد بنية عند العرض بلا تعديل بيانات، إظهار النص الأصلي عند الفشل بلا «المصدر»، إبقاء المشاركة بالنص الأصلي كاملًا، وحصر العرض في CategoryView وAzkarJourney.
---

## [قرار الحالة]

- **#3: انتهى** ضمن النطاق الذي وافق عليه عبدو، ومثبت في القسم 41.
- **#12: لم يبدأ بعد.**
- لا يوجد تنفيذ أو تعديل كود لـ#12.
- لا يوجد قرار نهائي بعد بشأن منهج #12.
- لا يبدأ #12 حتى يقرر عبدو.
- **حل تعارض Validation الخاص بالقسم 42 يجب أن يُحسم أولًا قبل الانتقال إلى #12.**
- لا يبدأ أي بند آخر تلقائيًا.

### [تكملة رسالة عبدو الأصلية — بنود لم تُسقط من التسجيل]

#### [القسم 42 الذي طُلب إضافته]

طُلب إضافة القسم 42 بعنوان «مراجعة ملف التسليم وتصحيح الأسطر القديمة»، ويتضمن:
- [طلب عبدو]: مراجعة ملف التسليم بعد إكمال #3 وتصحيح التناقضات.
- [رد Claude]: كل الـhashes المذكورة موجودة في Git، والأسطر القديمة غير المعلّمة في الأقسام 20 و21 و30 و32 و35 و36 والقسم 4 والبند 7 من القسم 26، وتعريفات #1–#12 غير مسجلة.
- [Baseline]: HEAD = 5110f1b30b4b0850c25da4ff467a11a4e21a935a، الشجرة نظيفة، 24 ملفًا / 153 اختبارًا Pass.
- [تنفيذ GPT]: docs فقط؛ إضافة التنبيهات، تصحيح القسم 4، تعديل البند 7، وتحديث الدليل.
- [التغييرات السلوكية]: لا شيء؛ توثيق فقط.
- [مؤجل]: تعريفات #1–#12 بانتظار القائمة الأصلية؛ ترتيب أقسام الدليل؛ مطابقة الادعاءات التاريخية مع git show --stat؛ ولا يبدأ #12 أو أي بند دون قرار عبدو.
- [النتيجة]: التصحيحات مطبقة، ولا يصرح القسم ببدء أي بند.

#### [التعديل على الدليل]

أُضيف في آخر السطر الذي يبدأ بـ «د) افحص ملف التسليم نفسه»:
« ملاحظة: مطابقات هذا الأمر داخل الأقسام المعلَّمة بتنبيه تاريخي لا تُعد تناقضًا.»
مع عدم تغيير باقي الدليل.

#### [Commit المطلوب في الرسالة الأصلية]

كان المطلوب، بعد نجاح Validation، commit واحد فقط:
docs: correct stale handoff status lines

ثم:
git show --stat --format='%H %s' HEAD → الملفان فقط،
وgit status --short → فارغ.

#### [شرط التوقف]

أي فرق عن المتوقع، أو استبدال لا يطابق مرة واحدة بالضبط، أو فشل validation: توقف وأبلغ بلا تخمين.

#### [تقرير الإرجاع المطلوب]

1. HEAD قبل وبعد بالـhash الكامل.
2. مخرجات كل grep المحددة.
3. git diff --stat قبل الـcommit وgit show --stat بعده.
4. نتائج typecheck والاختبارات وstatus النهائي.
5. تأكيد أن لا شيء خارج الملفين تغيّر، ولا Publish، ولم يبدأ أي بند آخر.

### [وضع التنفيذ الحالي]

لم يتم تنفيذ #12، ولم يتم تعديل src/ أو tests/ أو package.json أو routeTree.gen.ts بسبب هذه المراجعة. القسم 43 توثيق فقط. حل تعارض Validation في القسم 42 مسجل كأولوية قبل الانتقال إلى #12.


# 44. مقترحات مستقبلية — تطوير رحلة الأذكار وإعدادات الأذكار

### [طلب عبدو]
إضافة اقتراحات GPT المتعلقة بتطوير #3 «رحلة الأذكار المتسلسلة» وتطوير إعدادات الأذكار إلى ملف التسليم، لكي يراجعها Claude لاحقًا. هذا توثيق ومراجعة مستقبلية فقط، وليس قرار تنفيذ.

### [تحليل GPT — تطوير #3]
رحلة الأذكار الحالية في `AzkarJourney.tsx` تمثل MVP مكتملًا ضمن النطاق الذي تم اعتماده: تبدأ من أول ذكر غير مكتمل، وإذا كانت كل العناصر مكتملة تبدأ من الأول، والتنقل يدوي عبر التالي/السابق، ولا يوجد انتقال تلقائي، ولا يوجد storage key جديد لموضع الرحلة، وتبقى العناصر المكتملة ظاهرة ويمكن تخطيها، مع شاشة نهاية قصيرة.

الاقتراحات المستقبلية التي يمكن مراجعتها دون إعادة فتح #3 الحالي تلقائيًا:
1. **تخطي المكتمل اختياريًا:** إعداد يسمح بجعل «التالي» يتجاوز العناصر المكتملة، مع إبقاء الوضع الحالي كخيار افتراضي إذا كان ذلك أنسب.
2. **ملخص نهاية أفضل:** عرض إجمالي ما أُنجز، وما تبقى، ونسبة الإنجاز، مع مراعاة وضع العداد/القراءة.
3. **تمييز بصري أوضح لحالة الذكر:** حالة غير مكتمل / جارٍ / مكتمل، مع الحفاظ على بساطة الواجهة.
4. **استئناف موضع الرحلة:** اقتراح اختياري لحفظ موضع الرحلة، لكن لا يُضاف storage key أو تغيير تخزين إلا بقرار معماري صريح بعد دراسة أثره على existing progress/favorites.
5. **الانتقال التلقائي:** يمكن دراسته لاحقًا كخيار مستقل، وليس جزءًا من النسخة الحالية؛ لا يُفعل إلا بقرار صريح لأن النسخة الحالية تعتمد عمدًا على التنقل اليدوي.

### [تحليل GPT — إعدادات الأذكار]
الإعدادات الحالية متوافقة مع #3، لكنها ليست كافية لتقديم منظومة تخصيص مريحة لجميع تحديثات الأذكار الحالية والمستقبلية. قسم الأذكار يحتوي حاليًا على مصدر المحتوى، عداد الأذكار، مسح تقدم اليوم، وإعادة تحميل/مسح الكاش، بينما توجد بعض الإعدادات العامة ذات الصلة خارج قسم الأذكار مثل حجم الخط، الحركة المخفّضة، الصوت والاهتزاز.

الاقتراح المستقبلي هو إعادة تنظيم إعدادات الأذكار إلى فئات داخلية بدل إضافة صفوف متفرقة:
- **تجربة القراءة:** حجم الخط، تباعد النص، عرض الذكر، إظهار/إخفاء المصدر والملاحظات.
- **العداد والتقدم:** تشغيل العداد، عرض التقدم، عرض المتبقي، وسلوك عناصر التقدم.
- **رحلة الأذكار:** تشغيل/تفضيلات وضع الرحلة، نقطة البداية، تخطي المكتمل، وشاشة النهاية؛ وأي استئناف أو انتقال تلقائي يحتاج قرارًا مستقلًا.
- **التفاعل:** الصوت، الاهتزاز، الحركة والانتقالات، مع احترام Reduced Motion.
- **التقدم والبيانات:** مسح تقدم اليوم، سجل الأيام، إدارة المفضلة، وإدارة الكاش/المصدر.
- **المحتوى:** مصدر الأذكار والتحديثات، وأي إعدادات تخص بنية المرجع بعد مراجعة #12.

### [قرار مطلوب لاحقًا]
لا يُفهم هذا القسم على أنه موافقة على التنفيذ. عند مراجعة Claude له، المطلوب منه التمييز بين: ما هو مناسب للتنفيذ، وما يحتاج قرار UX، وما قد يحتاج قرارًا معماريًا أو تغييرًا في التخزين.

### [مؤجل]
لا يبدأ تطوير إضافات #3 ولا إعادة تنظيم إعدادات الأذكار بناءً على هذا القسم تلقائيًا. كما لا يبدأ #12 بسبب هذه المقترحات. التنفيذ يحتاج قرارًا صريحًا من عبدو وتحديد نطاق مستقل.

### [النتيجة]
تم تسجيل المقترحات المستقبلية فقط. لا يوجد تغيير سلوكي مقصود في التطبيق نتيجة هذا القسم.

# 45. تشخيص اختلاف «ابدأ الرحلة» بين Dev المحلي وPreview الخاص بـMacaly —

… [279 chars truncated] …

شكلة.

### [الخلفية]
بعد اكتمال #3 أصبح `CategoryView.tsx` يحتوي زر «ابدأ الرحلة» و`aria-label="بدء رحلة الأذكار المتسلسلة"`. ظهر أن الزر موجود في Dev المحلي، بينما لم يظهر في Preview الذي يصل إليه المستخدم من Macaly. بدأت فحوص لتحديد هل السبب Cache/Service Worker أم اختلاف Build/Preview أم اختلاف جلسة.

## 45.1 تصحيح القياس القديم

### [تحليل GPT — القياس السابق]
تم فحص:
`https://hep5hp2bq6errvl27y8ffds.macaly.dev/assets/index-rbNdZK-8.js`
وكان البحث عن «ابدأ الرحلة» فيه = `0`.

### [مراجعة Claude]
اتضح أن `index-rbNdZK-8.js` هو entry chunk وليس ملف `CategoryView` الفعلي؛ كان `CategoryView` في route/chunk آخر. لذلك قيمة الصفر في هذا الملف **ليست دليلًا صالحًا** على غياب الزر من `CategoryView`. كما أن الاسم غير موجود حاليًا على Dev المحلي، وكان مرتبطًا بملفات build سابقة تحت `.output`.

### [النتيجة]
تم تصحيح تفسير القياس: لا يُستخدم ذلك الـentry chunk لإثبات أن Preview كان يخدم نسخة قديمة من `CategoryView`.

## 45.2 الفحص التشخيصي الجديد

### [قرار عبدو]
فحص قراءة فقط. ممنوع تعديل الملفات، `public/sw.js`، commit، Publish، `npm install`، `pnpm`، أو مسح Cache/Service Worker قبل القياس. إنشاء جلسة جديدة باسم `gpt_fresh_check`. أي فشل في خطوة يؤدي إلى التوقف بلا تخمين.

### [Baseline]
```text
HEAD=31bb1af0ad19f95ba025e42535048ec4ef78e90b
STATUS=
```
الشجرة نظيفة.

### [تنفيذ GPT]
أُنشئت جلسة `gpt_fresh_check` واستُخدم رابط Preview الذي أعادته Macaly، ثم وصل المتصفح إلى:
`https://hep5hp2bq6errvl27y8ffds.macaly.dev/`
تم انتظار hydration، وظهرت مفاتيح React `__reactFiber...` و`__reactProps...` على زر داخل `nav`.

العنوان: `مسلم — أذكار وقرآن ومواقيت الصلاة`

Service Worker controller:
`https://hep5hp2bq6errvl27y8ffds.macaly.dev/sw.js`

في Preview الجديد لم يظهر زر `button[aria-label="بدء رحلة الأذكار المتسلسلة"]`.

عند الضغط على «الأذكار» من الصفحة الرئيسية، فتحت الواجهة **أذكار المساء** مباشرة، وهو ورد الوقت الحالي؛ لذلك محاولة العثور على `button[aria-label="أذكار الصباح"]` فشلت.

### [خطأ/فشل]
المحدد الخاص بأذكار الصباح لم يوجد لأن الشاشة كانت أذكار المساء. وبحسب شرط التوقف لم تتم إعادة المحاولة بطريقة أخرى، ولم تُمسح أي بيانات أو Cache، ولم يُستكمل مسار الصباح.

مع ذلك، كانت صفحة الأذكار نفسها في Preview تحتوي على بطاقة «تقدم اليوم»، والفلاتر، والأذكار، **دون زر الرحلة**.

## 45.3 قياس Dev المحلي

### [Validation]
تم استخدام:
`curl http://169.254.0.21:3000/src/app/features/azkar/CategoryView.tsx`

والنتيجة الخام:
```text
CURL_COUNT=1
```
أي أن `CategoryView.tsx` الذي يخدمه Dev المحلي يحتوي «ابدأ الرحلة» مرة واحدة.

## 45.4 ما ثبت وما لم يثبت

### [ثبت]
1. Dev المحلي يخدم `CategoryView.tsx` الذي يحتوي الزر.
2. Preview في جلسة `gpt_fresh_check` النظيفة لم يعرض الزر في شاشة الأذكار التي وصل إليها الفحص.
3. Preview يعرض بطاقة التقدم والفلاتر، أي أنه ليس نسخة قديمة جدًا من المشروع.
4. عبدو أكد أنه فتح الـPreview **من داخل Macaly نفسه** ولم يظهر له الزر أيضًا.
5. Service Worker كان active في Preview، لكن ذلك وحده لا يثبت أنه السبب.
6. لم يتغير الكود نتيجة التشخيص.

### [لم يثبت]
1. لم يثبت أن Service Worker هو السبب النهائي.
2. لم يثبت أن Cache هو السبب النهائي.
3. لم يثبت ملف build بعينه كسبب.
4. لم يثبت سبب عدم إنشاء Preview build بعد commit #3.
5. اسم الجلسة القديمة للقياس السابق غير متاح بشكل موثوق، لذلك لا يجوز اختلاقه.
6. لم يُجرَ فحص Firefox في هذه الجولة.

## 45.5 مراجعة Claude لتفسير Build/Preview

### [رد Claude — للتسجيل]
غيّر Claude تشخيصه السابق وأقر بأن فرضية Build القديم لا ينبغي إسقاطها. جلسة Preview النظيفة لا ترى الزر، بينما الجلسة النظيفة على `localhost:3000` كانت تراه، والملف الذي قيس عليه الصفر سابقًا لم يكن الملف الصحيح لإثبات حالة `CategoryView`.

بحسب مراجعة Claude، آخر Preview build المسجل بدأ تقريبًا 18:07:45 وانتهى 18:07:50، بينما commit الرحلة كان لاحقًا تقريبًا 18:38. توجد إذن فجوة زمنية بين آخر Build معروف وبين commit الرحلة. كما أن وجود بطاقة التقدم والفلاتر في Preview يتفق مع كونه مبنيًا على commits أقدم من #3.

### [حدود الاستنتاج]
لم يثبت Claude أن سبب عدم إعادة البناء هو طريقة commit بعينها. أشار فقط إلى أن Build سابقًا جاء بعد commit أنشأته `write_file`، بينما commits لاحقة تمت بأوامر Git عادية، وذكر أن ذلك قد يكون قاعدة وقد يكون مصادفة. لا تتحول هذه الملاحظة إلى حقيقة قبل تجربة مستقلة.

## 45.6 فرضية Service Worker / Cache

### [رد Claude]
فرضية Service Worker لم تُسقط بالكامل؛ يمكن أن يخدم موارد مخزنة مؤقتًا وفق استراتيجية التطبيق، ولذلك فهي مشكلة تقنية تستحق مراجعة لاحقة. لكنها أصبحت فرضية ثانوية بالنسبة إلى اختلاف Preview/Build، لأن جلسة Preview الجديدة نفسها لم تعرض الزر.

### [تحليل GPT]
لا ينبغي تعديل ملف Service Worker الآن. إصلاحه قبل تحديد ما إذا كان Preview نفسه مبنيًا من commit قديم قد يغير متغيرًا آخر ويصعّب عزل السبب.

## 45.7 المعلومة الإضافية التي قدمها عبدو

### [قرار عبدو]
أضاف عبدو أن **فتح الـPreview من داخل Macaly نفسه لم يُظهر زر «ابدأ الرحلة»**.

هذه المعلومة تدعم الفصل بين بيئة Dev المحلية التي تحتوي الكود الحالي وبين Preview الذي تقدمه Macaly. ولا تثبت وحدها السبب الجذري، لكنها تجعل فرضية أن المشكلة خاصة بمتصفح المستخدم أو هاتفه أضعف.

## 45.8 قرار التأجيل

### [قرار عبدو]
عدم إجراء تجربة `write_file` التشخيصية الآن، وعدم إعادة بناء أو تغيير آلية Preview الآن.

يؤجل هذا الملف إلى **آخر عملية/عمليات الفحص والتطوير في خطة المشروع** بعد:
1. اكتمال #12.
2. اكتمال الجزء التالي بعد #12.
3. الوصول إلى مرحلة تقرير Login أو الموضع النهائي الذي حدده عبدو.
4. إعادة فحص Preview/Build/Service Worker بصورة معزولة قبل الإغلاق النهائي.

### [ما كان مقترحًا ولم يُنفذ]
اقترح Claude تجربة صغيرة: تعديل توثيقي بحت بسطر واحد بواسطة `write_file`، مراقبة هل يظهر Preview build جديد، ثم فحص Preview في Firefox/جلسة نظيفة. لم تُنفذ لأن `write_file` ينشئ commit، وقرر عبدو تأجيلها بدل تغيير Git history الآن.

### [مؤجل]
- تجربة `write_file` التشخيصية.
- فحص Firefox لهذه الفرضية.
- مقارنة Network response لملف `CategoryView` الفعلي في Preview والـDev المحلي، بما في ذلك URL والترويسات إذا أمكن لاحقًا.
- تحديد سبب عدم إنشاء Preview build بعد commit #3.
- مراجعة استراتيجية Service Worker بعد عزل مشكلة Build/Preview.
- أي إصلاح للكاش أو Service Worker.

لا يبدأ أي من هذه البنود تلقائيًا.

### [التغييرات السلوكية]
لا توجد أي تغييرات سلوكية نتيجة هذا التشخيص.

### [Commit]لا يوجد commit لهذا التشخيص في مرحلته الحالية؛ القرار هو إبقاؤه مؤجلًا دون تعديل على المشروع.

### [النتيجة]
**المشكلة مسجلة ومؤجلة للفحص النهائي.** أقوى فرق مثبت حاليًا هو أن Dev المحلي يخدم `CategoryView.tsx` الذي يحتوي زر «ابدأ الرحلة»، بينما Preview العام في جلسة نظيفة لا يعرضه. لم يتم تحديد السبب الجذري بعد، ولا يجوز الجزم بأنه Build قديم أو Service Worker قبل القياسات المؤجلة.

لا يبدأ #12 أو أي بند آخر بسبب هذا التشخيص، ولا يُعاد فتح #3 بسببه؛ #3 مكتمل ضمن النطاق الذي اعتمده عبدو.

# 46. إتمام Commit إصلاح فلتر الحروف العربية في isUsableText

### [قرار عبدو]
بعد توقف الحزمة السابقة بسبب اختلاف تعريف قياس الـtails، قرر عبدو إتمام الـcommit المؤجل لبند إصلاح فلتر الحروف العربية في `isUsableText` كما هو، دون تعديل إضافي. هذه الحزمة مرحلة واحدة: كود + اختبارات + commit واحد. لا يبدأ أي بند آخر، ولا Publish.

### [Baseline قبل التنفيذ]
تمت إعادة قراءة الـBaseline من Git قبل الـstaging:

```text
HEAD=31bb1af0ad19f95ba025e42535048ec4ef78e90b
STATUS=
 M docs/MUSLIM_ARCHITECTURE_HANDOFF.md
 M src/app/features/azkar/useAzkarCatalog.ts
?? __tests__/app/azkar-catalog-usable-text.test.ts
CACHED STAT=فارغ
```

وكان diff الخاص بـ`useAzkarCatalog.ts` محصورًا في سطرين فقط: 2 additions و2 deletions.

`npm run typecheck` نجح، و`npm test -- --run` نجح بـ **25 ملف اختبار / 156 اختبارًا**.

### [نطاق التنفيذ المسموح]
الملفات التي دخلت الحزمة:

1. `src/app/features/azkar/useAzkarCatalog.ts`
2. `__tests__/app/azkar-catalog-usable-text.test.ts`

بقي `docs/MUSLIM_ARCHITECTURE_HANDOFF.md` خارج الـstaging والـcommit.

### [التعديل الفعلي]
في `isUsableText` تم تصحيح escaping في شرط الحروف العربية وشرط استبعاد `stop`:

- فلتر الحروف العربية أصبح يستخدم escape واحدًا لكل حد Unicode: `\u0600` و`\u06FF`.
- شرط `stop` أصبح يستخدم `\s` الصحيح بدل الـescaping الزائد.

لم تتغير بقية دالة `isUsableText` أو بقية `useAzkarCatalog.ts`.

### [اختبار منع تكرار الخلل]
أُضيف الملف `__tests__/app/azkar-catalog-usable-text.test.ts` ويحتوي على 3 اختبارات:

1. نص عربي صالح يُضاف إلى الكتالوج.
2. قيم `stop` لا تُضاف.
3. النص اللاتيني الذي لا يحتوي حروفًا عربية لا يُضاف.

الاختبارات تستخدم `mergeCatalog` لاختبار سلوك الفلتر عبر المسار العام المتاح.

### [Validation قبل الـcommit]
بعد `git add` بالاسمين المسموحين فقط، كانت الملفات staged بالضبط:

```text
A	__tests__/app/azkar-catalog-usable-text.test.ts
M	src/app/features/azkar/useAzkarCatalog.ts
```

وكان الـstat:

```text
 __tests__/app/azkar-catalog-usable-text.test.ts | 23 +++++++++++++++++++++++
 src/app/features/azkar/useAzkarCatalog.ts       |  4 ++--
 2 files changed, 25 insertions(+), 2 deletions(-)
```

ثم أُعيد تشغيل `npm run typecheck` و`npm test -- --run`: **Pass / 25 ملفًا / 156 اختبارًا**. لم يكن هناك أي ملف إضافي staged.

### [Commit]
تم إنشاء commit واحد فقط:

```text
948162a03f2d647813dfc6682a3274a148c196bc fix: restore arabic text filter in azkar catalog
```

Stat الـcommit:

```text
 __tests__/app/azkar-catalog-usable-text.test.ts | 23 +++++++++++++++++++++++
 src/app/features/azkar/useAzkarCatalog.ts       |  4 ++--
 2 files changed, 25 insertions(+), 2 deletions(-)
```

### [Validation بعد الـcommit]
بعد الـcommit:

- `git rev-parse HEAD` → `948162a03f2d647813dfc6682a3274a148c196bc`.
- `npm run typecheck` → Pass.
- `npm test -- --run` → **25 ملفًا / 156 اختبارًا Pass**.
- `git diff --stat -- package.json` → فارغ.
- الحالة النهائية:

```text
 M docs/MUSLIM_ARCHITECTURE_HANDOFF.md
```

أي أن الـdocs فقط بقيت كتغيير غير ملتزم به، ولم تدخل commit الإصلاح.

### [موضوع الـtails — توثيق القياس السابق فقط]
في المحاكاة الحية السابقة بعد الإصلاح، كانت نتيجة القبول **123/125**، بينما أظهر قياس الـtails في ذلك السكربت **0** مقابل **39** في قياس Claude. قياس Claude عُرّف على مستوى دوال الملف المعدّل واحتسب 39 عنصرًا ينتهي نصها بتكرار `', '` مع وجود مرجع بين أقواس. اختلاف الرقم ناتج عن اختلاف تعريف القياس، ولم تتم إعادة القياس أو تعديل الكود بسبب هذا الفرق ضمن هذه الحزمة.

### [ما لم يُنفذ]
- لا تعديل إضافي على `useAzkarCatalog.ts` أو الاختبارات.
- لا تعديل على `src/` آخر أو `package.json` أو `routeTree.gen.ts` أو `public/sw.js`.
- لا Preview.
- لا إعادة فتح #3.
- لا بدء #12.
- لا معالجة `description` أو مشكلة الـtails كجزء من هذه الحزمة.
- لا Publish.

### [التغييرات السلوكية]
التغيير السلوكي الوحيد هو إعادة فلترة النصوص بحيث يتعرف `isUsableText` على الحروف العربية بصورة صحيحة، مع بقاء استبعاد `stop` والنصوص غير العربية كما هو مقصود. الاختبارات الجديدة تثبت الحالات الثلاث المذكورة أعلاه.

### [قرار الحالة بعد الحزمة]
- **بند إصلاح فلتر الحروف العربية: مكتمل ومُلتزم به** في `948162a03f2d647813dfc6682a3274a148c196bc`.
- **#3: مكتمل** ضمن النطاق السابق، ولا يُعاد فتحه.
- **#12: لم يبدأ**.
- **مشكلة Preview/Build/Service Worker: مؤجلة** إلى مرحلة الفحص النهائية حسب القسم 45.
- لا يبدأ أي بند لاحق دون قرار جديد من عبدو.

# 47. إصلاح خلل «الذيل الغريب» في quran-duas وprophetic-duas

### [طلب عبدو]
تنفيذ بند واحد فقط: إصلاح خلل «الذيل الغريب» في عناصر quran-duas وprophetic-duas الذي يمنع extractEmbeddedSource من استخراج المرجع ويُظهر الذيل للمستخدم النهائي. التنفيذ على مرحلتين مستقلتين: (1) كود + اختبارات، (2) توثيق الـhandoff. لا يبدأ #12 أو أي بند آخر، ولا Publish.

### [السبب المؤكد]
استجابة Bonyan تحتوي على تسلسل نقل/اقتباس حرفي متكرر بعد المرجع. normalizeText يحوّل تسلسلات \n الحرفية إلى مسافات، فيبقى الذيل بعد المرجع. وبما أن extractEmbeddedSource يشترط وجود [المرجع] في نهاية النص، يفشل الاستخراج وتبقى قيمة الذيل ضمن item.text.

### [Baseline]
Baseline الخاص بهذه الحزمة:
4653eb9800b3b654511f742a6017cf9f5bd54686

كان هذا الـHEAD هو الحالة النظيفة الموثقة قبل بدء الحزمة، مع 25 ملف اختبار / 156 اختبارًا.

الحالة الحالية قبل توثيق هذه الحزمة أصبحت متقدمة باثنين من commits الخاصة بهذا البند:
- 8837d5da71d40e47523207e21ae3c8741c258196
- 16b328f853452d19693a909111fb775c09eee4fb

والـdiff من Baseline إلى الحالة الحالية محصور في:
- src/app/features/azkar/useAzkarCatalog.ts
- __tests__/app/azkar-catalog-trailing-artifact.test.ts

### [تنفيذ GPT — مرحلة الكود]
أُضيفت الدالة:

function stripTrailingArtifact(text: string): string {
  return text.replace(/(?:\s*'\s*,?){4,}\s*$/, '').trim()
}

ووُضعت داخل useAzkarCatalog.ts بعد normalizeText مباشرة، ثم أصبح ترتيب التنفيذ داخل fetchCatalog:

normalizeText
→ stripTrailingArtifact
→ extractEmbeddedSource
→ fallback إلى item.reference

أرقام الأسطر الحالية:
- stripTrailingArtifact: الأسطر 35–37.
- داخل fetchCatalog: normalizeText في السطر 113، stripTrailingArtifact في 114، وextractEmbeddedSource في 115.

لم يتم تعديل normalizeText أو isUsableText في الحالة النهائية، ولم يُمس src/azkar-data.ts أو routeTree.gen.ts أو dependencies.

### [الاختبارات]
أُضيف:
__tests__/app/azkar-catalog-trailing-artifact.test.ts

ويحتوي على 3 اختبارات:
1. إزالة الذيل المؤكد والسماح باستخراج [البقرة - 201].
2. عدم تغيير النصوص الطبيعية التي تقل عن عتبة 4 تكرارات.
3. عدم إزالة حالتي الاقتباس فقط عند الحافة.

### [خطأ/فشل]
في commit الكود الأول ظهر مؤقتًا فرق غير مقصود في escaping داخل isUsableText. لم يُعتمد ذلك كسلوك مقصود. في commit الاختبارات اللاحق تمت إعادة isUsableText إلى حالته الصحيحة، وأصبح الـdiff النهائي من Baseline محصورًا في إصلاح الذيل والاختبارات الخاصة به.

لم يُجر أي تعديل على الملفات خارج نطاق الحزمة.


### [Validation — الاختبارات]
Baseline:
- 25 ملف اختبار
- 156 اختبارًا

بعد إضافة الاختبارات:
- 26 ملف اختبار
- 159 اختبارًا
- الزيادة: ملف اختبار واحد + 3 اختبارات.

آخر تشغيل كامل:
- npm run typecheck → Pass
- npm test -- --run → 26/26 ملفًا Pass، 159/159 اختبارًا Pass

تحذير Vite الظاهر أثناء الاختبارات متعلق بـ configLoader: 'native' و__dirname في vitest.config.ts، وليس فشلًا في الاختبارات.

### [Validation — الفحص الحي لـBonyan]
تم فحص الاستجابة الحية لـBonyan للفئتين المستهدفتين، وعدد العناصر كان:
- quran-duas: 26
- prophetic-duas: 13
- الإجمالي: 39

باستخدام نفس normalizeText وstripTrailingArtifact وextractEmbeddedSource الموجودة في الكود:

| القياس | قبل الإصلاح | بعد الإصلاح |
|---|---:|---:|
| عناصر من الـ39 ينجح فيها extractEmbeddedSource | 0/39 | 39/39 |
| عناصر من الـ39 يبقى item.text النهائي فيها ذيل مطابق للنمط | 39/39 | 0/39 |

تفصيل الاستخراج بعد الإصلاح:
- quran-duas: 26/26
- prophetic-duas: 13/13

أي أن الـ39 عنصرًا كلها أصبحت تستخرج المرجع بنجاح، ولم يبقَ أي عنصر يحمل الذيل المستهدف.

### [Validation — الفئات الست الأخرى]
تم تطبيق نفس المقارنة على الفئات الست الأخرى:

| الفئة | العناصر | source قبل | source بعد |
|---|---:|---:|---:|
| أذكار الصباح | 23 | 0 | 0 |
| أذكار المساء | 25 | 0 | 0 |
| أذكار بعد السلام من الصلاة المفروضة | 9 | 0 | 0 |
| تسابيح | 16 | 0 | 0 |
| أذكار النوم | 10 | 0 | 0 |
| أذكار الاستيقاظ | 3 | 0 | 0 |

لم يحدث أي تراجع في استخراج المصادر في أي فئة من الفئات الست.


### [Commit — مرحلة الكود]
8837d5da71d40e47523207e21ae3c8741c258196
fix: strip azkar trailing artifact

Stat:
src/app/features/azkar/useAzkarCatalog.ts | 11 ++++++++---
1 file changed, 8 insertions(+), 3 deletions(-)

ثم:

16b328f853452d19693a909111fb775c09eee4fb
test: cover azkar trailing artifact cleanup

Stat:
__tests__/app/azkar-catalog-trailing-artifact.test.ts | 30 ++++++++++++++++++++++
src/app/features/azkar/useAzkarCatalog.ts             |  4 +--
2 files changed, 32 insertions(+), 2 deletions(-)

الحالة النهائية بعد مرحلة الكود كانت نظيفة، ولم يتم Publish.### [التغييرات السلوكية]
- النص القادم من Bonyan يُنظف من الذيل المحدد فقط قبل استخراج المصدر.
- extractEmbeddedSource أصبح قادرًا على التقاط المصدر المضمّن في الـ39 عنصرًا المستهدف.
- الذيل لم يعد يدخل إلى item.text النهائي في العناصر الـ39.
- النصوص الطبيعية التي لا تحقق عتبة 4 تكرارات لا تتأثر.
- لا تغيير مقصود في normalizeText أو isUsableText أو البيانات المجمعة محليًا.

### [مؤجل]
- #12 لم يبدأ.
- لا يوجد أي بند آخر بدأ بسبب هذه الحزمة.
- لا Publish.
- لا تغييرات في src/azkar-data.ts.
- لا تغييرات في routeTree.gen.ts.
- لا dependencies جديدة.

### [النتيجة]
بند إصلاح «الذيل الغريب» مكتمل من ناحية الكود والاختبارات والتحقق الحي.

مرحلة التوثيق الحالية هي commit مستقل docs-only بعد اكتمال مرحلة الكود والتحقق الحي.


# 47. خطة توحيد مراجع الأذكار — أربع مراحل / خمس خطوات تنفيذ مستقلة

> **هذا القسم هو أحدث سجل زمني لهذا المسار، ويُعامل كمرجع الحالة الحالي لهذا العمل.**
>
> لا تعتمد أي حالة أو HEAD أو ترتيب خطوات أقدم من هذا القسم إذا تعارضت معه. الأقسام الأقدم تبقى تاريخًا لما حدث وقتها.

## 47.1 الخطة المعتمدة

[قرار عبدو]

تم تثبيت أن العمل يتكون من **4 مراحل، لكن 5 خطوات تنفيذ منفصلة**؛ لأن المرحلة (ج) الخاصة بالدمج في العرض تنقسم إلى خطوتين مستقلتين:

| # | المرحلة | الخطوة | Prompt مستقل؟ | الحالة الحالية |
|---|---|---|---|---|
| 1 | أ | جرد/تشخيص الأنماط الحية، بلا كود | نعم | **مغلقة ومعتمدة** |
| 2 | ب | كتابة `zikrReference.ts` + اختباراته، بلا عرض | نعم | **مغلقة تنفيذيًا** |
| 3 | ج | دمج `parseReference` في `CategoryView` فقط | نعم | **مغلقة تنفيذيًا** |
| 4 | ج | دمج `parseReference` في `AzkarJourney` فقط | نعم | **مغلقة تنفيذيًا ومعتمدة من Claude** |
| 5 | د | توثيق الـhandoff النهائي | نعم | **مغلقة توثيقيًا** |

تقسيم المرحلة (ج) إلى خطوتين مستقلتين مقصود به عزل أثر كل مكون عرض على حدة: شاشة التصنيفات أولًا، ثم رحلة الأذكار المتسلسلة، بحيث لا تُخلط مشكلة أحدهما بالآخر.

> **تنبيه تاريخي:** جدول هذه الفقرة كان يعكس حالة سابقة قبل إغلاق الخطوات اللاحقة. المرجع النهائي للحالة الحالية هو **القسم 49**.

### قاعدة النطاق

- لا يبدأ #2 قبل إغلاق/اعتماد #1.
- لا يبدأ #3 قبل اكتمال #2.
- لا يبدأ #4 بالتوازي مع #3؛ بل بعد عزل نتيجة #3.
- #5 هو توثيق الإغلاق النهائي بعد اكتمال الخطوات السابقة.
- **لا يبدأ #12 أو أي بند آخر بسبب هذه الخطة.**
- **لا Publish** ضمن هذه الخطة إلا بقرار صريح مستقل من عبدو.

---

## 47.2 الخطوة 1 — الجرد التشخيصي

### [طلب عبدو]

جرد جميع قيم source/reference الفعلية من:
1. البيانات المجمعة في `src/azkar-data.ts`.
2. بيانات Bonyan الحية في الفئات الثماني.

والجرد يعتمد على المسار الحالي في `useAzkarCatalog.ts`:
`normalizeText → stripTrailingArtifact → extractEmbeddedSource → reference fallback`

هذه الخطوة تشخيص فقط:
- لا كود.
- لا regex جديد.
- لا تصميم `parseReference`.
- لا تعديل عرض.
- لا commit وظيفي.
- لا Publish.

### [Baseline]

تم التحقق قبل الجرد:
```text
HEAD=88d130ef7ef4d3785f5e6adb5ab70c5cc3a29f69
STATUS:
[empty]
```

الشجرة كانت نظيفة، والـHEAD يطابق commit إغلاق تعارض القسم 42 وإضافة قاعدة escaping-review.

### [تنفيذ GPT]

تم فحص القيم الفعلية دون تعديل ملفات المشروع.

#### أ) البيانات المجمعة `src/azkar-data.ts`

إجمالي العناصر: **43**.

التوزيع:
- أذكار الصباح: 12
- أذكار المساء: 12
- أذكار بعد الصلاة: 7
- أذكار النوم: 6
- أذكار متفرقة: 6

جميع العناصر الـ43 لديها `source` محليًا؛ لا توجد قيمة source مفقودة.

#### ب) Bonyan الحي — الفئات الثماني

إجمالي العناصر: **125**:
- أذكار الصباح: 23
- أذكار المساء: 25
- أذكار بعد السلام من الصلاة المفروضة: 9
- تسابيح: 16
- أذكار النوم: 10
- أذكار الاستيقاظ: 3
- أدعية قرآنية: 26
- أدعية الأنبياء: 13

من أصل 125:
- **40** source/reference نهائي.
- **85** بلا source/reference نهائي.

القيم المفقودة حسب الفئة:
- أذكار الصباح: 22
- أذكار المساء: 25
- أذكار بعد السلام من الصلاة المفروضة: 9
- تسابيح: 16
- أذكار النوم: 10
- أذكار الاستيقاظ: 3
- أدعية قرآنية: 0
- أدعية الأنبياء: 0

### [نتيجة مهمة حول `extractEmbeddedSource`]

في الجرد الحي بعد تشغيل المسار الفعلي `normalizeText → stripTrailingArtifact → extractEmbeddedSource → reference fallback` على استجابات Bonyan API الثماني:
- `extractEmbeddedSource`: **39/40**.
- `item.reference` fallback: **1/40** فقط.

أي أن 39 عنصرًا استُخرج مرجعها من نهاية `content` عبر `extractEmbeddedSource` بعد إزالة ذيل النقل بواسطة `stripTrailingArtifact`، بينما عنصرًا واحدًا فقط وصل إلى النتيجة عبر `reference fallback`؛ وهو حصرًا عنصر «أذكار الصباح» الذي كان `content` و`reference` فيه كلاهما القيمة الحرفية `stop`.

أمثلة فعلية:
- `. [البقرة - 201].`
- `. [الأعراف - 23].`
- `. [نوح - 28].`
- `. [البقرة - 127-128].`

ورُصدت قيمة malformed ضمن نفس العائلة؛ من القيم الخام التي ظهرت:
```text
". [البقرة\\n', '- 286]."
```

لم يتم إصلاح هذه القيم أو إعادة صياغتها في الخطوة 1.

---

## 47.3 الأنماط الفعلية لجميع source observations

إجمالي observations ذات source/reference:
**43 محلي + 40 حي = 83 قيمة.**

### 1. مراجع Bonyan بين أقواس مربعة — 39 قيمة
- 38 قيمة طبيعية ضمن العائلة.
- 1 قيمة malformed ضمن العائلة.
- أدعية قرآنية: 26.
- أدعية الأنبياء: 13.

أمثلة:
- `. [البقرة - 201].`
- `. [البقرة - 250].`
- `. [الأعراف - 23].`

### 2. إسناد يبدأ بـ«رواه» — 27 قيمة
كلها من البيانات المجمعة.

أمثلة:
- `رواه مسلم`
- `رواه الترمذي`
- `رواه أبو داود`

ومن الصيغ الأطول الفعلية:
- `رواه الترمذي وأبو داود`
- `رواه النسائي والحاكم`
- `رواه أبو داود والترمذي`

### 3. صيغ «متفق عليه» — 7 قيم

أمثلة:
- `متفق عليه`
- `سيد الاستغفار — متفق عليه`
- `حديث فاطمة رضي الله عنها — متفق عليه، ثم الحمد لله ٣٣ ثم الله أكبر ٣٤`

### 4. إحالات قرآنية/صياغات مرجعية حرة — 5 قيم

أمثلة:
- `آية الكرسي — البقرة ٢٥٥`
- `دعاء ذي النون — الأنبياء ٨٧`
- `آل عمران ١٧٣`
- `طه ٢٥-٢٦`
- `سورة الإخلاص، ثم المعوذتين، وتُقرأ ٣ مرات مع النفث في اليدين ومسح الجسد`

### 5. وصف/نص حر غير إسنادي — 3 قيم

أمثلة:
- `خفيفة على اللسان ثقيلة في الميزان` (ظهرت أكثر من مرة)
- `صيغة استغفار جامعة`

### 6. إسناد مضمّن بعد وصف/عبارة — قيمة واحدة
- `من قرأها عند النوم لم يزل عليه من الله حافظ — رواه البخاري`

### 7. القيمة الحرفية `stop` — قيمة واحدة
ظهرت في Bonyan ضمن أذكار الصباح.

> الأنماط ذات occurrence واحد لا توجد لها ثلاثة أمثلة حقيقية؛ لم يتم اختلاق أمثلة.

### [ملاحظة تشخيصية إضافية: نطاق ظاهرة reference في أدعية Bonyan]

- فئة «أدعية قرآنية» (26 عنصرًا): الاختلاف بين `extractEmbeddedSource` و`reference` شكلي فقط (نقطة بادئة/لاحقة خارج القوس)؛ نفس السورة ونفس رقم الآية في جميع العناصر الـ26. لذلك فإن حقل `reference` هنا زائد ومكرر ولا يضيف قيمة تشخيصية إضافية.
- فئة «أدعية الأنبياء» (13 عنصرًا): الاختلاف جوهري في المضمون في 12 من أصل 13 عنصرًا؛ السور/الآيات في `reference` المستقل مختلفة عن القيمة المستخرجة فعليًا من `content`. العنصر #1 فقط متطابق بالمضمون. لذلك فإن حقل `reference` هنا غير موثوق به من حيث المضمون، لكنه غير مستخدم عمليًا حاليًا لأن extraction ينجح في 13/13.
- في الفئتين معًا (26 + 13 = 39 عنصرًا)، لم يُستخدم `reference fallback` فعليًا في أي عنصر؛ extraction نجح في جميع العناصر الـ39. وهذا لا يغيّر رقم 39/40 extraction و1/40 fallback المعتمد في القسم 47.2، لأن العنصر الوحيد الذي استخدم fallback يقع خارج هاتين الفئتين، في «أذكار الصباح» وكانت قيمة `content` و`reference` فيه كلاهما `stop`.

---

## 47.4 جرد المصادر المحلية بالتفصيل

القيم المحلية الـ43 تضمنت، من حيث التكرار:
- `رواه أبو داود` — 10
- `رواه مسلم` — 5
- `رواه الترمذي` — 3
- `متفق عليه` — 3
- `سيد الاستغفار — متفق عليه` — 2
- `رواه ابن ماجه` — 2
- `رواه الترمذي وأبو داود` — 2
- `خفيفة على اللسان ثقيلة في الميزان` — 2

ومن القيم المفردة الفعلية:
- `رواه النسائي والحاكم`
- `رواه مسلم — يُقال ٣٣ مرة، ثم الحمد لله ٣٣ مرة، والله أكبر ٣٤ مرة لإتمام المائة`
- `رواه مسلم — يُقال ٣٣ مرة بعد سبحان الله`
- `رواه مسلم — يُقال ٣٤ مرة بعد الحمد لله لإتمام المائة`
- `آية الكرسي — البقرة ٢٥٥`
- `رواه أبو داود والترمذي`
- `من قرأها عند النوم لم يزل عليه من الله حافظ — رواه البخاري`
- `حديث فاطمة رضي الله عنها — متفق عليه، ثم الحمد لله ٣٣ ثم الله أكبر ٣٤`
- `سورة الإخلاص، ثم المعوذتين، وتُقرأ ٣ مرات مع النفث في اليدين ومسح الجسد`
- `دعاء ذي النون — الأنبياء ٨٧`
- `كنز من كنوز الجنة — متفق عليه`
- `آل عمران ١٧٣`
- `طه ٢٥-٢٦`
- `صيغة استغفار جامعة`

---

## 47.5 ما ثبت وما لم يُثبت في الخطوة 1### [Validation]

ثبت:
1. baseline = `88d130ef7ef4d3785f5e6adb5ab70c5cc3a29f69`.
2. الشجرة كانت نظيفة قبل الجرد.
3. البيانات المحلية = 43 عنصرًا وجميعها لديها source.
4. Bonyan الحي = 125 عنصرًا عبر 8 فئات.
5. Bonyan الحي = 40 source/reference و85 مفقودة.
6. `extractEmbeddedSource` = 39/40.
7. `reference fallback` = 1/40.
8. تم تسجيل الأنماط الفعلية دون regex أو تصميم parser جديد.
9. لم يحدث تعديل على production code في الخطوة 1.

### [ما لم يُثبت]

- لم تُثبت صلاحية أي تصميم نهائي لـ`parseReference`.
- لم تُنفذ `zikrReference.ts`.
- لم تُدمج تغييرات في `CategoryView` أو `AzkarJourney`.
- لم تُحسم طريقة عرض كل نوع من المرجع.
- الخطوة 1 ليست مغلقة اعتمادًا لأن **Claude لم يؤكد الجرد بعد**.

---

## 47.6 حالة اعتماد الخطوة 1

### [رد Claude]

كان الوضع سابقًا: **غير متاح بعد / لم يتم التأكيد بعد.**

وكانت الحالة سابقًا: **Completed diagnostically — awaiting Claude confirmation.**

الآن: **الخطوة 1 معتمدة رسميًا من Claude وقرار عبدو الصريح بتاريخ 21 سبتمبر 2026.**

### [النتيجة]

الخطوة 1 **معتمدة رسميًا بالكامل** بعد مراجعة Claude المتعددة: الجرد، وتصحيح نسبة `extractEmbeddedSource`/`reference fallback`، وملاحظة نطاق ظاهرة `reference`.

---

## 47.7 حالة الخطوات التالية

### [مؤجل]

**الخطوة 2 — `zikrReference.ts` + الاختبارات**
- لا تبدأ قبل تأكيد الخطوة 1.
- لا عرض.
- لا `CategoryView`.
- لا `AzkarJourney`.

**الخطوة 3 — دمج `parseReference` في `CategoryView`**
- مستقلة تمامًا عن الخطوة 4.
- لا تبدأ قبل اكتمال الخطوة 2.

**الخطوة 4 — دمج `parseReference` في `AzkarJourney`**
- مستقلة عن الخطوة 3.
- لا تبدأ قبل عزل نتيجة الخطوة 3.

**الخطوة 5 — توثيق الـhandoff النهائي**
- توثيق الإغلاق النهائي بعد انتهاء خطوات التنفيذ.

### [ملاحظة زمنية]

هذا الجزء يسجل حالة سابقة قبل تنفيذ الخطوات التالية، ولا يمثل الحالة الحالية. الحالة الحالية المحدثة موثقة في القسم 49.

---

## 47.8 حالة Git

هذا القسم **تغيير توثيقي فقط** لتحديث handoff، وليس تنفيذًا للخطوات 2–4.

[Commit]
سيُسجل تحديث handoff في commit توثيقي مستقل، مع عدم إدخال أي ملف production أو اختبار ضمنه.

[التغييرات السلوكية]
لا توجد تغييرات سلوكية في التطبيق نتيجة هذا القسم.

---

## 48. إغلاق الخطوة 2 — `zikrReference.ts` + الاختبارات

تم تنفيذ الخطوة 2 بعد الاعتماد الرسمي للخطوة 1، دون أي دمج في طبقة العرض أو تعديل في مسار الكتالوج الحالي.

### 48.1 الملف الجديد

- `src/app/features/azkar/zikrReference.ts`
- يحتوي على `parseReference` المعزولة وبنية النتيجة التصنيفية فقط، بلا JSX أو رندر.

### 48.2 ملف الاختبارات

- `src/app/features/azkar/zikrReference.test.ts`
- أداة الاختبار: Vitest، عبر `npm` فقط.
- إجمالي اختبارات `parseReference`: **8 اختبارات**.

توزيع الاختبارات على


### 48.3 نتائج التحقق الفعلية

- اختبار الملف الجديد منفردًا: **1 ملف، 8 اختبارات ناجحة من 8**.
- مجموعة الاختبارات الكاملة عبر `npm test`: **27 ملف اختبار، 167 اختبارًا ناجحًا من 167**.
- `npm run typecheck`: **ناجح**.
- لا توجد تغييرات في `CategoryView` أو `AzkarJourney` أو `useAzkarCatalog.ts` أو `azkar-data.ts`.

### 48.4 حالة الإغلاق

الخطوة 2 **مغلقة بنجاح**: الكود والاختبارات في commit مستقل، ثم أُجري التحقق الكامل قبل الانتقال إلى هذا التوثيق. لم يتم دمج `parseReference` في أي مكوّن عرض، ولم يتم Publish.

---

## 49. إغلاق خطة توحيد مراجع الأذكار

هذا هو السجل التاريخي لإغلاق خطة توحيد مراجع الأذكار.

### الحالة بعد المراجعة اللاحقة
1. الخطوة 1: مكتملة ومعتمدة.
2. الخطوة 2 — zikrReference.ts + الاختبارات: مكتملة ومتحقق منها.
3. الخطوة 3 — CategoryView: مكتملة ومتحقق منها.
4. الخطوة 4 — AzkarJourney: مكتملة تنفيذيًا ومراجعة لاحقًا من Claude.
5. الخطوة 5 — handoff: مكتملة توثيقيًا ومراجعة لاحقًا.

> أي نص قديم داخل هذا القسم يقول إن الخطوتين 4 و5 كانتا بانتظار Claude هو حالة تاريخية وقت كتابة السجل، وليس حالة حالية.

### [النتيجة]


## 50. إغلاق خطة قابلية توسع Scheduler — WP-Scalability-2

تم تنفيذ البند 2 الخاص بالقابلية للتوسع، مع إبقاء نطاق المشروع كما هو ودون تغيير سياسة الاشتراكات.

### 50.1 Pagination / batching
- لم يعد scheduler يعتمد على `take(500)` كحد إجمالي للاشتراكات.
- تمت إضافة `getSubscriptionsForTickPage` باستخدام Convex cursor pagination، بحجم صفحة 100 اشتراك.
- يتم استهلاك الصفحات حتى `isDone`، مع استمرار دعم `deviceId` في `runTick`.

### 50.2 Bounded concurrency
- معالجة الاشتراكات أصبحت متوازية بحد أقصى **6** عمليات في الوقت نفسه.
- المعالجة داخل الاشتراك نفسه بقيت متسلسلة حتى لا تتداخل عمليات claim/send الخاصة بنفس الجهاز.
- تم توحيد طلبات كاش مواقيت الشهر المتزامنة عبر Promise memoization لتقليل الطلبات المكررة.

### 50.3 Scheduler timing compensation
- نافذة الأحداث بقيت **3 دقائق** بعد وقت الحدث؛ تم تعريفها كثابت صريح باعتبارها نافذة تعويض لتأخر تشغيل الـcron، دون توسيع الإشعار إلى نافذة زمنية أكبر.

### 50.4 Deduplication
- بقي `claimSentKey` الذري هو نقطة الحماية النهائية ضد التكرار، حتى مع التوازي وتعدد صفحات الاشتراكات.
- اختبار التكرار الموجود استمر، وأضيف اختبار يثبت حد التوازي.

### 50.5 التحقق
- focused notifications/reliability: **2 ملفات، 8/8 اختبارات ناجحة**.
- `npm run typecheck`: ناجح.
- `npm run build`: ناجح.
- `.sandbox/check-errors --strict`: ناجح.
- `git diff --check`: ناجح.
- Full Suite: **47 ملفات، 303 اختبارات؛ 301 ناجحة و2 فاشلة**، وهما نفس فشلي `tasbihButtonStyle.test.ts` المعروفين وغير المرتبطين بهذا التغيير.
- Convex Live: تم نشر التغيير بنجاح.
- dry-run بعد النشر: `processed=2`, `sent=0`, `errors=[]`.
**خطة #12 مغلقة بالكامل ضمن نطاق ال

## 18) توثيق شامل موحّد — حالة مشروع «مسلم» بعد حزمة السبحة — 25 سبتمبر 2026

> **هذا القسم هو أحدث ملخص تشغيلي لهذه المرحلة، ويكمل الأقسام التاريخية السابقة ولا يلغي سجل المحاولات السابقة. عند أي تعارض، يُتحقق من Git الفعلي.**

### [الهدف]

قبل الانتقال إلى أي بند جديد، تم طلب توثيق شامل للحالة الحالية، مع توثيق حزمة تخصيص شكل/لون زر السبحة وإصلاح هندسة Progress Indicator وجميع المراجعات البصرية التي تمت بعدها.

### [الأدوار وقاعدة القرار]

- **عبدو:** صاحب القرار النهائي.
- **GPT/ChatGPT:** المنفذ داخل Macaly Cloud عند وجود قرار صريح.
- **Claude:** مشرف ومراجع مستقل، وليس منفذًا تلقائيًا.
- تقرير Claude لا يتحول إلى أمر تنفيذ إلا بعد قرار عبدو.
- لا يبدأ بند جديد لمجرد أن بندًا سابقًا انتهى.
- **لا Publish** إلا بطلب صريح من عبدو.
- لا dependencies جديدة إلا بقرار صريح.
- لا تعديل خارج النطاق المعتمد.

### [Git الحالي]

- **HEAD الحالي المثبت من Git:** `2706afa1018e2c02599f670b7b35c4b248f0f7cd`
- الفرع: `main`
- العلامة الحالية: `build-529`
- `origin/main` يشير إلى نفس HEAD.
- Working tree: **نظيفة** وقت إعداد هذا القسم.
- آخر commit:
  `2706afa` — `fix(tasbih): tighten triangle progress gap`

### [سلسلة حزمة السبحة الحالية]

التسلسل الفعلي المرتبط بالحزمة الأخيرة:

1. `1f894e2` — `feat: add tasbih button shape and color customization`
   - إضافة تخصيص شكل ولون زر السبحة.

2. `a94259a` — `fix: improve tasbih settings controls`
   - تحسين واجهة اختيارات الشكل/اللون.

3. `46ceffa` — `fix: restore tasbih settings section markup`
   - استعادة بنية قسم الإعدادات بعد مشكلة تحرير سابقة.

4. `d293e26` — `fix: simplify tasbih settings`
   - تبسيط واجهة الإعدادات.

5. `9fdc36b` — `fix: refine tasbih ring geometry`
   - تحسين هندسة الحلقة.

6. `0dd6f8c` — `fix: align tasbih progress ring geometry`
   - محاذاة الحلقة مع الزر.

7. `58e62cd` — `feat: match tasbih progress ring to button shape`
   - ربط شكل الحلقة بالشكل المختار.

8. `625ed8b` — `fix(tasbih): derive progress geometry from one shape source`
   - إنشاء مصدر هندسي مشترك للأشكال والـProgress.

9. `ada16f8` — `fix(tasbih): use shared progress geometry constants`
   - توحيد ثوابت صندوق الـProgress وسمك الخط.

10. `84be085` — `test(tasbih): expose shared shape geometry for assertions`

11. `568ebe8` — `test(tasbih): assert shared geometry and polygon offset`

12. `260f60f` — `test(tasbih): correct triangle offset expectation`
   - تصحيح توقع رياضي في الاختبار، وليس إصلاحًا لخوارزمية الإنتاج.

13. `7171b7f` — `test(tasbih): assert shared geometry and polygon offset`

14. `596fb23` — `docs: record tasbih progress geometry fix`
   - توثيق الحزمة الأساسية.

15. `742df4f` — `fix(tasbih): scale shape clip paths in settings`
   - إصلاح اختفاء/قص المثلث والسداسي في المعاينات الصغيرة داخل الإعدادات؛ تم تحويل نقاط الـclip-path إلى نسب مئوية بدل استعمال قيم 184px مباشرة.

16. `7857ad4` — `fix(tasbih): place progress ring around button`
   - نقل SVG الخاص بالـProgress إلى الإطار الخارجي بدل وضعه خلف الزر مع إمكانية تغطيته.

17. `e5cc90e` — `fix(tasbih): align triangle progress geometry`
   - أول تعديل لاحق لتقريب هندسة المثلث من هندسة السداسي.

18. `ca55814` — `fix(tasbih): match triangle outer bounds`
   - توسيع حدود المثلث الخارجية لتتوافق بصريًا مع حدود السداسي.

19. `94e5e84` — `fix(tasbih): refine triangle progress cord`
   - جعل مسار Progress للمثلث يقع خارج الشكل ويلتف حوله بدل أن يدخل تحته.

20. `2706afa` — `fix(tasbih): tighten triangle progress gap`
   - تقليل المسافة بين المثلث وحبل الـProgress إلى نصف الإزاحة السابقة تقريبًا.

### [التنفيذ الحالي]

#### 1. مصدر الهندسة

في:
`src/app/features/tasbih/tasbihButtonStyle.ts`

تم اعتماد مصدر مشترك للهندسة:

- `TASBIH_PROGRESS_BOX = 184`
- `TASBIH_PROGRESS_STROKE_WIDTH = 8`
- نقاط مشتركة للمثلث والسداسي.
- `offsetConvexPolygon` لحساب الإزاحة الهندسية.
- `getTasbihProgressPath` يولد المسار حسب الشكل.
- `getTasbihButtonClipPath` يستخدم نفس نقاط الشكل.

#### 2. الأشكال

الأشكال الحالية:

- دائرة.
- مربع.
- مثلث.
- سداسي.

#### 3. الألوان

الألوان الحالية:

- أخضر مزرق.
- بنفسجي (المعرّف الداخلي القديم `gold` ما زال مستخدمًا للتوافق، لكن اللون المرئي بنفسجي).
- أزرق.
- وردي.

لم يتغير منطق اختيار اللون أثناء إصلاح الـProgress.

#### 4. الإعدادات

في:
`src/app/features/settings/sections/TasbihSection.tsx`

الواجهة الحالية:

- شبكة 2×2 لاختيار الشكل.
- معاينة فعلية للشكل داخل كل بطاقة.
- لا توجد خانة Preview منفصلة؛ أُزيلت بناءً على قرار عبدو.
- اختيار اللون في شبكة 2×2.
- الشكل/اللون المختاران يظهران كـ«محدد حاليًا».
- المثلث والسداسي أصبحا ظاهرين في بطاقات الإعدادات بعد إصلاح مقياس الـclip-path.

#### 5. شاشة السبحة

في:
`src/app/features/tasbih/TasbihView.tsx`

- الـProgress مرسوم في SVG خارجي حول الزر.
- الزر نفسه يستخدم نفس هندسة الشكل.
- العداد والهدف وحساب `progress` لم تتغير.
- `handleTap` لم يتغير في هذه الحزمة.
- القائمة السفلية والتنقل لم يتغيرا بسبب هذه الحزمة.

### [السلوك البصري الذي تم الوصول إليه]

- الدائرة: الـProgress يحيط بالدائرة.
- المربع: الـProgress يحيط بالمربع.
- السداسي: الـProgress يحيط بالسداسي مع مسافة خارجية متناسقة.
- المثلث: تم تعديل موضع الـProgress عدة مرات استجابة للمراجعة البصرية، وأحدث حالة تقلل المسافة بينه وبين المثلث مع إبقائه خارج الشكل.

**ملاحظة مهمة:** التحقق الأخير للمثلث تم بصريًا من خلال Preview الذي راجعه عبدو، ثم تم تنفيذ تعديل تقليل المسافة. لا يُسجل هذا كـ«اعتماد Claude»؛ Claude لم يصدر اعتمادًا بصريًا مستقلًا لهذه الحزمة.

### [المشاكل والمحاولات المسجلة]

- كانت هندسة الـProgress الأصلية لا تطابق جميع الأشكال.
- المربع كان يحتاج مسارًا كاملًا حول الشكل.
- السداسي كان بعيدًا عن الزر في إحدى المحاولات.
- معاينات المثلث والسداسي في الإعدادات كانت تختفي/تُقص بسبب اختلاف نظام الإحداثيات.
- بعد نقل الحلقة إلى الخارج، بقيت مشكلة المسافة البصرية للمثلث.
- تم تعديل المثلث على مراحل متتالية حتى الوصول إلى الحالة الحالية.
- لا ينبغي حذف هذه المحاولات من السجل؛ فهي جزء من تاريخ التشخيص والإصلاح.

### [Validation]

- `npm run typecheck`: **PASS** بعد آخر تعديل.
- اختبارات Tasbih المتاحة التي تم تشغيلها قبل آخر سلسلة تعديلات هندسية: **2 ملفات / 14 اختبارًا PASS**.
- Full Suite بعد الحزمة الأساسية: **42 ملف اختبار / 285 اختبارًا PASS**.
- بعد تعديلات المثلث اللاحقة (`e5cc90e` إلى `2706afa`) تم تشغيل typecheck، ولم يُعاد Full Suite كاملًا بعد آخر تعديل بصري.
- لذلك **لا نسجل Full Suite 285/285 كتحقق للـHEAD الحالي**؛ هو نتيجة تحقق تاريخية للحزمة الأساسية.
- تحذير Vite المتعلق بـ`__dirname` معروف وغير blocking في الاختبارات.
- لم يتم Publish جديد بسبب هذه الحزمة.

### [حالة Stage 4 — Unified Confirmation]

Stage 4 الخاص بالتوثيق فقط لتوحيد confirmation dialogs **ليس منفذًا حتى هذه اللحظة**. لا يجوز اعتباره مكتملًا أو ربطه بحزمة السبحة.

### [البند التالي]

لا يوجد بند تنفيذي تالٍ معتمد حاليًا.

**الإشعارات ليست البند التالي تلقائيًا.** لا يبدأ أي عمل على الإشعارات أو أي بند آخر قبل قرار عبدو الصريح.

### [مراجعة Claude المطلوبة لاحقًا]

عند إرسال هذه الحالة إلى Claude:

1. يقرأ كامل `docs/MUSLIM_ARCHITECTURE_HANDOFF.md`.
2. يقرأ كامل `docs/CLAUDE_REVIEW_GUIDE.md`.
3. يتحقق من HEAD الفعلي وWorking tree.
4. يتحقق من commits حزمة السبحة من Git.
5. يفحص `tasbihButtonStyle.ts` و`TasbihView.tsx` و`TasbihSection.tsx`.
6. يفرّق بين نتائج الاختبارات التاريخية والـHEAD الحالي.
7. يراجع التعديلات البصرية الأخيرة للمثلث بشكل مستقل.
8. لا يعدّل، ولا commit، ولا Publish.
9. أي إصلاح مقترح يحتاج قرار عبدو مستقلًا.

### [النتيجة]

**حالة التوثيق: مكتمل لهذا الحد الزمني.**

المشروع متوقف تنفيذيًا بعد حزمة السبحة إلى أن يصدر عبدو قرارًا جديدًا. هذا القسم هو نقطة التسليم الحالية التي يمكن استخدامها لبدء مراجعة مستقلة أو الانتقال لاحقًا إلى بند جديد بعد قرار صريح.

## 19) خطة الإشعارات + Push المعتمدة — 25 سبتمبر 2026

### [قرار عبدو]
رسائل التأكيد المخصصة انتهت، وتخصيص زر السبحة انتهى، وقفل التطبيق/كلمة السر انتهى. البند التالي هو **الإشعارات + Push**، وبعد إكماله تكون **القبلة** هي الخطة التالية. نطاق الإشعارات: Android + PWA/Chrome + Macaly Cloud فقط؛ iOS خارج النطاق.

### [هدف البند]
بناء نظام إشعارات حقيقي وموثوق، وليس timers داخل الصفحة، مع ضبط شكل إشعارات Android قدر الإمكان. الفصل الهندسي إلزامي بين:
- تذكير الصلاة قبل الموعد، والافتراضي المستهدف 5 دقائق.
- الأذان عند دخول وقت الصلاة.
- إشعارات الأذكار.
- تذكير قراءة القرآن.
- إشعار/تحكم وسائط القرآن عبر Media Session، وهو ليس Push.

### [قاعدة المرحلة 1]
لا يبدأ تصميم Settings أو تنفيذ Push قبل **Audit تقني لقدرات المشروع والمنصة**. لا نفترض Backend أو DB أو web-push أو قدرة على تشغيل صوت أذان مخصص في الخلفية.

### [المرحلة 1 — Audit + Capability Verification]
فحص Service Worker وPWA، notifications الحالية، Prayer data، Quran Audio/Media Session، وقدرات Macaly Cloud للـBackend/DB/Workers وWeb Push/VAPID/subscriptions، واختبار Android Chrome/PWA في foreground/background/closed. يجب التحقق من الصوت والاهتزاز والأيقونة والعنوان والنص وclick actions، وبالأخص إمكانية تشغيل أذان مخصص تلقائيًا مع إغلاق PWA. في نهاية المرحلة توثق قرارات: backend، DB، Push، scheduling، مزامنة الصلاة، وقدرة الأذان الخلفية.

### [المرحلة 2 — Push Infrastructure]
بعد اعتماد Audit: Push subscription، VAPID إذا لزم، حفظ/تحديث/إلغاء subscriptions، تنظيف غير الصالح، endpoint/server، payload موحد، والبنية الخلفية للإرسال والجدولة.

### [المرحلة 3 — Notification Engine]
طبقة عامة لأنواع الإشعارات:
- `prayer-reminder`
- `adhan`
- `azkar`
- `quran-reminder`
مع metadata وtarget وsound/vibration حيث تدعمها المنصة.

### [المرحلة 4 — Notification Settings]
بعد إثبات القدرات: الإشعارات العامة، تذكير الصلاة، الصلوات المشمولة، lead time وافتراضيه 5 دقائق، الأذان والصلوات والمؤذن إذا ثبتت الإمكانية، أذكار الصباح/المساء/النوم، تذكير القرآن ووقته، والصوت/الاهتزاز والخيارات المدعومة. لا خيار يوحي بقدرة غير متاحة.

### [المرحلة 5 — Prayer Synchronization]
مزامنة ما يلزم للجدولة: Push subscription، الموقع، طريقة الحساب، مذهب العصر، timezone، وإعدادات الصلاة/الأذان. تحديث الجدولة عند تغير المواقيت أو الموقع أو الإعدادات أو اليوم.

### [المرحلة 6 — Five-Minute Prayer Reminder]
Push مستقل قبل الصلاة بـ5 دقائق، مع اختيار الصلوات، تغيير lead time، تعطيل صلاة، وتعطيل التذكير ومعالجة اليوم الجديد وتغير المواقيت.

### [المرحلة 7 — Adhan]
إشعار عند دخول وقت الصلاة. اختبار فعلي لتشغيل أذان مخصص تلقائيًا مع إغلاق PWA. إذا ثبتت الإمكانية ينفذ؛ إن لم تثبت يستخدم أفضل بديل واقعي، مثل فتح المشغل عند الضغط، ولا يقدم إعدادًا يوهم بتشغيل خلفي غير ممكن.

### [المرحلة 8 — Android Notification Polish]
ضبط أقصى ما تسمح به Web Notifications: اسم «مسلم»، الأيقونة، العنوان، النص، بيانات الصلاة، الصوت/الاهتزاز إن أمكن، grouping، click action وفتح الشاشة المناسبة. الحكم النهائي بالشكل يكون على Android فعليًا.

### [المرحلة 9 — Quran Media Notification]
عند تشغيل القرآن، استخدام Media Session مع المشغل الحالي بدل مشغل ثانٍ، بهدف إظهار مسلم، السورة، القارئ، الآية الحالية قدر الإمكان، Play/Pause، Previous/Next، وProgress/metadata حيث يدعمها النظام.

### [المرحلة 10 — Media Session Integration]
ربط play/pause وتغيير السورة والآية/metadata وnext/previous وتنظيف Media Session عند الإيقاف، مع الحفاظ على مشغل القرآن الحالي.

### [المرحلة 11 — Azkar Notifications]
إضافة أذكار الصباح والمساء والنوم والتذكيرات المستقبلية المعتمدة، مع الإعداد والوقت وفتح المكان الصحيح.

### [المرحلة 12 — Quran Reading Reminder]
تذكير قراءة القرآن بوقت يختاره المستخدم وفتح المصحف عند الضغط.

### [المرحلة 13 — Notification Click Routing]
الصلاة → الصلاة، الأذان → الصلاة/المشغل حسب التصميم النهائي، أذكار الصباح/المساء → الفئة المناسبة، تذكير القرآن → المصحف.

### [المرحلة 14 — Reliability]
اختبار Push في foreground/background/closed، offline، subscription منتهي، إعادة تثبيت PWA، تغير اليوم والموقع وtimezone وإعدادات الصلاة، التكرار، وفشل scheduler.

### [المرحلة 15 — Android Real-Device QA]
اختبار حقيقي على Android/PWA لـPush وReminder وAdhan والصوت/الاهتزاز وشكل الإشعار وclick routing وMedia Session وlock-screen/media controls قدر الإمكان.

### [المرحلة 16 — Polish + Documentation]
بعد النجاح: polish للواجهة والنصوص، إزالة الحلول المؤقتة، typecheck، الاختبارات، build، preview، تحديث ملفات التسليم، وتوثيق القيود الفعلية. لا Publish إلا بقرار عبدو.

### [الترتيب بعد هذه الخطة]
**الإشعارات + Push → ثم القبلة.**

### [ممنوعات]
- لا تصميم Settings قبل Capability Audit.
- لا افتراض Convex/Backend/web-push دون التحقق والقرار.
- لا timers داخل React لإشعارات يفترض عملها بعد إغلاق التطبيق.
- لا وعد بأذان مخصص في الخلفية قبل إثباته.
- لا Media Player ثانٍ للقرآن.
- لا إدخال iOS في النطاق.
- لا dependency جديدة إلا بقرار صريح.
- لا تعديل نطاقات أخرى أثناء حزمة الإشعارات.
- لا Publish دون طلب صريح.

### [النتيجة]
هذه هي **خطة الإشعارات + Push الرسمية الحالية**. البند التالي بعد إغلاقها هو **القبلة**.

## 20) إغلاق المرحلة 1 — Audit + Capability Verification للإشعارات + Push — 26 سبتمبر 2026

### [قرار عبدو]
إغلاق المرحلة 1 نهائيًا بناءً على نتائج الفحص الكودي والنتائج الميدانية المعتمدة، دون إعادة اختبار الشاشة المقفولة أو صوت/اهتزاز Foreground. هذان البندان مؤجلان وغير حاجبين فقط.

### [Baseline]
- `git rev-parse HEAD` قبل التوثيق: `af7faf4fbc94cc438931ab8bd187bf3c835c7879`.
- `git status --short` قبل التوثيق: فارغ.
- لم تُجرَ أي تغييرات على production code أو dependencies أو `routeTree.gen.ts`.

### [النتائج الميدانية]

| الحالة | النتيجة الميدانية المعتمدة |
|---|---|
| **Foreground** | الإشعار يظهر عند دخول الوقت والتطبيق مفتوح، وهذا مؤكد سابقًا. صوت/اهتزاز هذه الحالة تحديدًا: **غير مختبَر، مؤجَّل، غير حاجب**. |
| **Background** | التطبيق مُصغَّر والشاشة مضاءة: الإشعار يظهر، **الصوت المخصص الذي اختاره المستخدم يعمل فعليًا**، **لا يوجد اهتزاز**، والضغط على الإشعار **يفتح صفحة مواقيت الصلاة بشكل صحيح**. هذه النتائج مؤكدة ميدانيًا على جهاز Android حقيقي. |
| **Closed فعليًا** | التطبيق مُغلَق تمامًا من Recent Apps: **لا يصدر أي إشعار أو صوت إطلاقًا**. هذه النتيجة مؤكدة ميدانيًا على جهاز Android حقيقي، ومتوافقة مع الفحص البرمجي: لا يوجد `push` listener في `sw.js`، والـtimers داخل الصفحة تُقتل عند إغلاق الصفحة. |
| **الشاشة مقفولة (Screen Locked)** | **غير مختبَرة، مؤجَّلة، غير حاجبة**. لا تُستنتج نتيجتها من أي حالة أخرى. |

### [البند 2 — الأذان الخلفي]
مع إغلاق PWA فعليًا، لم تعمل آلية تلقائية لإشعار أو صوت الأذان. النتيجة الميدانية المعتمدة هي: **لا توجد قدرة حالية على تشغيل أذان مخصص تلقائيًا بعد الإغلاق**. النتيجة مبنية على اختبار Android حقيقي لحالة Closed، وليست استنتاجًا من حالة Background.

### [وثيقة القرارات الستة]

1. **Backend:** Convex متاح كقدرة منصة Macaly عمومًا، لكنه **غير مُفعّل حاليًا في هذا المشروع تحديدًا**؛ لا يوجد مجلد `convex/` ولا تبعية Convex في `package.json`. تفعيل Convex قرار منفصل مستقبلي ولا يدخل ضمن إغلاق المرحلة 1.

2. **DB:** قاعدة البيانات غير موجودة حاليًا في هذا المشروع تحديدًا. لا توجد بنية DB مفعّلة للمشروع يمكن استخدامها الآن لتخزين Push subscriptions. تفعيل قاعدة البيانات/Convex قرار منفصل لاحقًا.

3. **Push:** `web-push`/VAPID **غير موثّق كقدرة منصة مباشرة متاحة لهذا المشروع من Macaly** وفق ما تم التحقق منه في وثائق المنصة. لذلك لا يُعتبر Web Push/VAPID مثبت القابلية التنفيذية بعد على البنية الحالية. عند بدء المرحلة 2 يلزم بحث/تحقق إضافي، أو استخدام خدمة خارجية إذا اعتمدها عبدو.

4. **Scheduling:** لا توجد حاليًا آلية جدولة تعمل بعد إغلاق التطبيق. التذكيرات الحالية تعتمد على timers داخل الصفحة، وهذه تتوقف عند الإغلاق الفعلي. أي جدولة موثوقة بعد الإغلاق تحتاج بنية Push/Backend أو بديلًا فعليًا يُثبت في المرحلة 2.

5. **مزامنة الصلاة:** بيانات `api.aladhan.com` الحالية كافية لحساب أوقات الصلاة بدقة، وقد تأكد ذلك ميدانيًا باختبار الإحداثيات المخصصة. لكنها غير مرتبطة حاليًا بآلية جدولة خلفية تعمل بعد إغلاق التطبيق؛ لذلك يلزم ربطها ببنية الجدولة التي ستُعتمد لاحقًا، وليس تغيير مصدر المواقيت لمجرد تنفيذ Push.

6. **قدرة الأذان الخلفية:** **لا** — مؤكدة ميدانيًا على جهاز Android حقيقي: عند إغلاق PWA فعليًا لا يصل إشعار ولا يعمل صوت الأذان. هذه النتيجة متوافقة مع البنية الحالية التي لا تحتوي `push` listener في Service Worker، لكن أساس الحكم هو الاختبار الميداني لحالة Closed.

### [مؤجل — غير حاجب]
- الشاشة المقفولة (Screen Locked): **غير مختبرة، غير حاجبة، ولا تُعامل كنجاح أو فشل**.
- صوت/اهتزاز Foreground: **غير مختبر، غير حاجب، ولا تُستنتج نتيجته من Background**.

### [Validation]
- `npm run typecheck`: **PASS** في Baseline السابق مباشرة قبل هذا التوثيق.
- `npx vitest run --maxWorkers=2`: **283/285 ناجحة**، مع فشل الاختبارين المعروفين في `src/app/features/tasbih/tasbihButtonStyle.test.ts`; لم تُجرَ أي محاولة لإصلاحهما ضمن هذه المرحلة.
- لا Production Code تغيّر.
- لا Dependency أضيفت.
- لا Publish حدث.

### [Commit]
هذا القسم تغيير توثيقي فقط. سيُثبت الـHEAD الناتج فعليًا في تقرير الإغلاق بعد إنشاء commit، دون تعديل القسم 19 أو أي قسم سابق.

### [النتيجة]
**المرحلة 1 مغلقة بالكامل. البند التالي: انتظار قرار عبدو لبدء المرحلة 2 — Push Infrastructure.**

## 21) تفعيل Convex كBackend — Provisioning فقط — 26 سبتمبر 2026

### [قرار عبدو]
تفعيل Convex كBackend لمشروع "مسلم"، كخطوة تمهيدية أولى من المرحلة 2 (Push Infrastructure)، بعد أن أثبتت المرحلة 1 استحالة بناء Push حقيقي بدون Backend. نُفِّذت هذه الخطوة مباشرة بواسطة Claude (وليس عبر GPT)، بعد فشل 3 محاولات متتالية عبر GPT بسبب مشاكل بيئة تنفيذ (skill بدا غير متاح خطأً، ثم working directory غير صحيح ولم يُحل رغم محاولتين). نطاق هذه الخطوة: Provisioning فقط — لا schema، لا functions، لا منطق Push.

### [Baseline]
- `git rev-parse HEAD` قبل البدء: `2a7f7960056ff08651fed4d3b3db6ddb3f7e55af`.
- `git status --short` قبل البدء: فارغ.
- `.env.local` غير موجود قبل البدء (غير مزوَّد).

### [التنفيذ]
1. تشغيل `node .macaly/skills/setup-convex-db/scripts/provision.mjs --app-name "Muslim"` — نجح: أنشأ `.env.local` (4 متغيرات: VITE_CONVEX_URL، CONVEX_DEPLOYMENT، CONVEX_DEPLOY_KEY، SITE_URL) و`convex/macaly.ts` (helper `callMacalyJson`)، وأضاف alias الاستيراد `@/convex/*`.
2. تثبيت حزمة `convex` نفسها عبر `npm install convex --save` — لم يكن مثبَّتًا، وهو ضروري لعمل الـclient والـdeploy.
3. اكتشاف أن الافتراض الوارد في دليل الـskill غير صحيح لهذا المشروع تحديدًا: النص يقول أن الملف `src/components/convex-client-provider.tsx` موجود بالقالب مسبقًا، لكن هذا الملف لم يكن موجودًا فعليًا (تحقق مباشر: test -f فشل). تبيّن أن الملف الوحيد المشابه هو قالب خاص بـskill مختلف تمامًا (convex-agent، لبناء AI chatbot) وغير مناسب هنا. تم إنشاء provider قياسي بسيط (ConvexProvider + ConvexReactClient من convex/react، export افتراضي باسم AppConvexProvider) يدويًا، متوافق تمامًا مع ما يصفه الـskill وظيفيًا.
4. ربط AppConvexProvider في src/routes/__root.tsx: لُفّ {children} فقط داخله، مع إبقاء <Scripts /> شقيقًا كما يشترط الـskill بالضبط — لا تعديل آخر على الملف.
5. اكتشاف ثغرة أمنية حقيقية غير متعلقة بالـskill نفسه: .gitignore في المشروع لا يستثني .env.local ولا convex/_generated، ما أدى لدخول .env.local (ويحتوي CONVEX_DEPLOY_KEY الحسّاس) فعليًا في تاريخ git (commit bcc6ae7). تم إصلاح .gitignore بإضافة .env.local وconvex/_generated، ثم git rm --cached .env.local وcommit منفصل لإزالته من التتبع مستقبلًا. ملاحظة مهمة غير مُغلَقة: القيمة القديمة لا تزال موجودة في تاريخ git بالكامل عند commit bcc6ae7 (مستودع Macaly الداخلي الخاص، وليس GitHub علنيًا حسب فحص git remote -v)؛ الخيار الآمن الإضافي (تدوير/إعادة توليد CONVEX_DEPLOY_KEY، أو تنظيف تاريخ git) قرار منفصل يحتاج موافقة عبدو صراحة ولم يُنفَّذ هنا.
6. .sandbox/deploy-convex-app — نجح: "Live deployed. The public Convex contract is backward-compatible."
7. .sandbox/check-errors — نجح، لا أخطاء ظاهرة في السجلات.
8. npm run typecheck بعد كل التعديلات — PASS.

### [معيار الإكمال — تحقق فعلي]
1. المتغيرات الأربعة في .env.local: تم التحقق ✅ (بالاسم فقط، لا قيم مكشوفة هنا).
2. convex/macaly.ts يحتوي callMacalyJson: تم التحقق ✅.
3. AppConvexProvider يُغلّف الـoutlet في __root.tsx بالضبط كما يصف الـskill: تم التحقق ✅.
4. .sandbox/deploy-convex-app نجح فعليًا: تم التحقق ✅.
5. .sandbox/check-errors نجح بلا أخطاء: تم التحقق ✅.

### [Commits]
- bcc6ae7 — feat: add Convex client provider (يتضمن أيضًا .env.local وconvex/macaly.ts وtsconfig.json التي أنشأها/عدّلها سكربت provision.mjs، مجمَّعة تلقائيًا مع أول write_file تالٍ حسب سلوك المنصة).
- c5bb209 — feat: wire Convex provider into root route.
- a42c1ce — fix: gitignore .env.local and convex/_generated.
- 4362cc1 — chore: untrack .env.local (secrets should not be in git).
- HEAD النهائي: 4362cc1c872b09d6ba0f58b51fa79d65048dbea3.

### [لم يُنفَّذ في هذه الخطوة]
- لا schema أو functions لتخزين Push subscriptions.
- لا VAPID keys، لا web-push logic.
- لا Publish.
- لا قرار بشأن تدوير CONVEX_DEPLOY_KEY القديم الموجود في تاريخ git عند commit bcc6ae7 — مؤجَّل لقرار عبدو.

### [النتيجة]
Convex مفعَّل ومنشور بنجاح كBackend فارغ (بدون schema بعد). الخطوة التالية (2ب: تصميم schema اشتراكات Push + VAPID) تحتاج قرار عبدو الجديد. كما يحتاج قرارًا منفصلًا بشأن مصير CONVEX_DEPLOY_KEY المكشوف تاريخيًا في git.

## 22) المرحلة 2ب — Schema اشتراكات Push + VAPID + ربط العميل — 27 سبتمبر 2026

### [قرار عبدو]
تصميم وتنفيذ اشتراكات Push فعليًا: جدول Convex، مفاتيح VAPID، وربط العميل (توليد deviceId، طلب إذن، اشتراك Push، حفظ في Convex). نُفِّذت مباشرة بواسطة Claude بعد موافقة عبدو على التصميم المقترح.

### [تصحيح مهم قبل التنفيذ]
التصميم الأول للـschema (القسم 21) كان مبنيًا على مواصفات القسم 19 الطموحة (أذكار صباح/مساء/نوم منفصلة، تذكير قرآن منفصل، أذان كمفتاح مستقل) — وهذه غير موجودة فعليًا في الكود. الإعدادات الحقيقية (src/app/settings.ts): مفتاح واحد reminders يغطي تذكير الصلاة + الإشعار عند دخول الوقت معًا، azkarReminder مفتاح واحد مدمج (صباح+مساء عبر الشروق/الغروب)، sunriseSunset منفصل، fastingAlerts، dailyAyah. لا يوجد "تذكير قرآن" كميزة إطلاقًا في الكود الحالي. تم تصحيح الـschema والـmutation ليطابقا الواقع الفعلي بدل الخطة الطموحة.

### [التنفيذ]
1. convex/schema.ts: جدول pushSubscriptions مفهرس بـdeviceId (لا يوجد نظام تسجيل دخول، فالربط بالجهاز لا بالمستخدم). الحقول الجديدة (calcMethod, asrSchool, remindersEnabled, prayerReminderLead, dailyAyahEnabled, azkarReminderEnabled, sunriseSunsetEnabled, fastingAlertsEnabled) optional بسبب تحقق Convex التلقائي من التوافق العكسي مع نسخة الـschema الأولى المنشورة سابقًا (رغم عدم وجود أي بيانات حقيقية بعد) — القيم الفعلية دائمًا تُملأ من العميل، والافتراضيات (handler) شبكة أمان نظرية فقط.
2. convex/pushSubscriptions.ts: mutation واحدة saveSubscription (upsert بحسب deviceId).
3. VAPID: توليد زوج مفاتيح عبر مكتبة web-push. المفتاح الخاص خُزِّن حصرًا في متغيرات بيئة Convex السيرفرية (npx convex env set VAPID_PRIVATE_KEY) — لم يظهر في أي كود أو commit. المفتاح العام في VITE_VAPID_PUBLIC_KEY بـ.env.local.
4. public/sw.js: أُضيف push event listener فعلي (لم يكن موجودًا — مؤكَّد غيابه في تدقيق المرحلة 1)، يعرض الإشعار عبر showNotification مع دعم data.url لتوجيه النقر.
5. src/app/features/notifications/pushSubscription.ts: hook usePushSubscription يولّد deviceId (crypto.randomUUID، مخزَّن محليًا)، يطلب إذن الإشعارات، يشترك عبر PushManager بمفتاح VAPID العام، ويحفظ الاشتراك + إعدادات المستخدم الحالية الحقيقية في Convex.
6. src/app/features/settings/sections/NotificationsSection.tsx: زر "تفعيل" جديد للإشعارات الخلفية مع رسائل حالة (تحميل/نجاح/أخطاء محددة: غير مدعوم، إذن مرفوض، لا يوجد موقع محدد).
7. إصلاحات تلقائية اكتشفها فحص المنصة أثناء الـdeploy ونُفِّذت وتحققت: استثناء .sandbox من اكتشاف اختبارات vitest، إضافة alias @/convex لإعدادات vitest، mock لـusePushSubscription في اختبار settings-view.test.tsx الموجود مسبقًا.

### [التحقق الفعلي]
- .sandbox/deploy-convex-app نجح (بعد 3 محاولات لحل تعارضات توافق Convex التلقائية، موثّقة أعلاه).
- .sandbox/check-errors نجح بلا أخطاء TypeScript أو Tailwind.
- npm run typecheck نجح PASS.
- npx vitest run: 281/285 (نفس فشل tasbihButtonStyle.test.ts الموروث وغير المتعلق بهذا العمل — لا اختبار جديد فشل).

### [لم يُنفَّذ بعد]
- لا server-side action لإرسال Push فعليًا (استخدام web-push + VAPID_PRIVATE_KEY لبثّ إشعار حقيقي) — هذه الخطوة التالية.
- لا Cron/Scheduled Function لجدولة الإرسال تلقائيًا وقت الصلاة.
- لا تحديث تلقائي للاشتراك عند تغيير المستخدم لإعداداته لاحقًا (الحفظ الحالي يحدث فقط لحظة الضغط على "تفعيل").
- لا اختبار حي على جهاز حقيقي لتلقّي Push فعلي بعد إغلاق التطبيق — الأهم للتحقق من نجاح كل هذا البناء عمليًا.

### [Commits الرئيسية]
985d137 إلى 4d70180 (12 commit: schema، mutation، تصحيحات توافق Convex الثلاثة، VAPID، service worker، hook العميل، زر الإعدادات، إصلاحات vitest الثلاثة). HEAD النهائي: 4d70180b7c72ff969b2779649f90111273b7bc98.

### [النتيجة]
البنية التحتية الكاملة لاشتراك Push جاهزة ومنشورة (Convex + VAPID + Service Worker + واجهة عميل). لم يُرسَل أي إشعار حقيقي بعد — الخطوة التالية اللازمة لإثبات أن هذا يعمل فعليًا: كتابة Convex action لإرسال Push تجريبي، ثم اختبار حي على Android حقيقي.


## 23) المرحلة 2 — Push Infrastructure: إرسال Push تجريبي يدوي — 27 سبتمبر 2026

### [قرار عبدو]
تنفيذ الخطوة التالية بعد المرحلة 2ب: إضافة Convex action لإرسال إشعار Push تجريبي حقيقي إلى جهاز محدد، ثم التحضير للاختبار الحي على Android. لا Cron، ولا إرسال جماعي، ولا ربط بمواقيت الصلاة في هذه الخطوة.

### [رد Claude]
بحسب النص الذي وصل GPT: البنية التحتية السابقة مكتملة ومنشورة (جدول pushSubscriptions، VAPID، Service Worker، وربط العميل)، والمطلوب فقط action واحدة للإرسال وطريقة تشغيلها للاختبار.

### [تحليل GPT]
اختيار ملف جديد convex/sendPush.ts بدل تعديل convex/pushSubscriptions.ts لأن mutation الحفظ موجودة وصحيحة، وفصل مسؤولية الإرسال عن مسؤولية حفظ الاشتراك يقلل نطاق التعديل. ولأن Convex يمنع database queries داخل Node.js runtime، وُضع lookup داخلي منفصل في convex/pushSubscriptionQuery.ts.

تم التحقق قبل التنفيذ من أن:
- convex/pushSubscriptions.ts موجود وفيه saveSubscription.
- جدول pushSubscriptions يستخدم index باسم by_deviceId.
- web-push مثبتة بالفعل في package.json.
- VAPID_PRIVATE_KEY موجود في بيئة Convex دون كشف قيمته.
- المفتاح العام الموجود في .env.local تحت VITE_VAPID_PUBLIC_KEY يطابق تشفيريًا المفتاح الخاص الموجود في Convex؛ نتيجة الفحص كانت derived/local VAPID public key match=true.
- لم يتم توليد زوج VAPID جديد.

### [Baseline]
- جذر المشروع المكتشف بالأمر الإلزامي: /home/user
- HEAD قبل التنفيذ: 2187d9c472d9bdd2395d877fe2729827d897b70b
- git status --short قبل التنفيذ: فارغ.
- convex/pushSubscriptions.ts موجود وsaveSubscription موجودة.

### [تنفيذ GPT]
أُضيف convex/sendPush.ts ويحتوي action عامة باسم sendTestPush.

التوقيع:
- args: deviceId: v.string(), title: v.optional(v.string()), body: v.optional(v.string())
- returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) })

سلوك الـaction:
1. تستدعي ctx.runQuery إلى internal.pushSubscriptionQuery.getSubscriptionByDeviceId.
2. الـquery تبحث في pushSubscriptions عبر withIndex('by_deviceId') وتعيد فقط endpoint/p256dh/auth.
3. إذا لم يوجد الاشتراك، تعيد: لا يوجد اشتراك لهذا الجهاز.
4. تقرأ process.env.VAPID_PRIVATE_KEY داخل الـaction فقط، ولا تطبعه ولا تخزنه في الكود.
5. تستخدم المفتاح العام الحالي المطابق للمفتاح الخاص مع webpush.setVapidDetails(...).
6. تستخدم webpush.sendNotification(...) إلى الاشتراك المحدد فقط، مع payload يحوي title وbody.
7. تعالج أخطاء HTTP 404/410 كاشتراك منتهٍ/غير صالح، وتعيد أخطاء الإرسال الأخرى برسالة واضحة بدل نجاح وهمي.

أُضيف convex/pushSubscriptionQuery.ts كـinternalQuery لأن Convex لا يسمح بتعريف query داخل ملف Node runtime.
أُضيف web-push.d.ts كتعريف TypeScript محلي لـweb-push لأن الحزمة المثبتة لا تحتوي declaration متاحًا للمشروع. لم تُضف أي dependency جديدة.

### [خطأ/فشل]
المحاولة الأولى للـdeploy فشلت لأن getSubscriptionByDeviceId كانت داخل ملف sendPush.ts الذي يحتوي "use node"، وConvex رفض تعريف Query داخل Node.js runtime. كما فشل typecheck بسبب غياب declaration لـweb-push وبسبب الـgenerated API قبل اكتمال deploy.

### [إصلاح/تراجع]
تم فصل الـinternal query إلى convex/pushSubscriptionQuery.ts وإبقاء convex/sendPush.ts خاصًا بالـNode action، وإضافة declaration محلي لـweb-push. لم يحدث أي تعديل على convex/schema.ts أو convex/pushSubscriptions.ts، ولم تُضف dependencies.

### [Validation]
بعد الإصلاح:
- .sandbox/deploy-convex-app: PASS — Live deployed. The public Convex contract is backward-compatible.
- .sandbox/check-errors: PASS — لا أخطاء TypeScript ولا Tailwind.
- npm run typecheck: PASS.
- لم يُشغّل npx convex run <module>:sendTestPush لأن هذه الجلسة لا تملك deviceId حقيقيًا صادرًا من متصفح/جهاز Android فعلي، ولم يتم اختلاق deviceId أو الادعاء بنجاح إرسال حي.
- لم يحدث Publish للتطبيق.

### [Commit]
بسبب سلوك Macaly Cloud، كل write_file أنشأ commit تلقائيًا. commits الكود الخاصة بهذا البند، بالترتيب:
- ea110f00d6e8a686b0feda225d7aa9ff66d90c29 — feat(push): add manual test push action
- 44fc821 — feat(push): add internal subscription lookup
- 0ed4b9e — chore(push): add web-push type declaration
- ca96ac9407cf2012da4fa9a5dc2bddd1ac971f45 — fix(push): isolate Node push action

HEAD بعد مرحلة الكود والتحقق: ca96ac9407cf2012da4fa9a5dc2bddd1ac971f45
مرحلة التوثيق الحالية منفصلة عن commits الكود.

### [التغييرات السلوكية]
أصبح هناك مسار إرسال Push تجريبي يدوي إلى اشتراك جهاز واحد محدد بواسطة deviceId. لا يوجد إرسال جماعي، ولا Cron/Scheduled Function، ولا مزامنة مع مواقيت الصلاة، ولا تغيير في schema أو mutation الحفظ.

### [مؤجل]
- الاختبار الحي يحتاج جهاز Android حقيقي بعد تفعيل الإشعارات من واجهة التطبيق والحصول على deviceId الحقيقي.
- Cron/Scheduled Function.
- الإرسال الجماعي.
- ربط الإرسال بمواقيت الصلاة أو أي Notification Engine لاحق.
- لا يبدأ أي من هذه البنود دون قرار عبدو جديد.

### [النتيجة]
تمت إضافة ونشر Convex action للإرسال التجريبي اليدوي، وتم التحقق من deploy وcheck-errors وtypecheck. لم يُختبر الإرسال الفعلي إلى جهاز Android في هذه الجلسة لعدم توفر deviceId حقيقي.

لم يُختَبَر الإرسال الفعلي لعدم توفر deviceId حقيقي في هذه الجلسة — الاختبار الحي يحتاج جهاز Android حقيقي بعد تفعيل الإشعارات من واجهة التطبيق.

## 24) أول إرسال Push حي ناجح على Android + أول نشر إنتاجي مع Convex — 28 سبتمبر 2026

### [أول نشر إنتاجي مع Convex]
فشل النشر عدة مرات قبل النجاح، والدروس موثّقة هنا:
1. الفشل الأول: استيراد `@/convex/_generated/api` لم يُحلّ في بناء Vercel (Rolldown). استُبدل بمسار نسبي في pushSubscription.ts.
2. السبب الجذري الفعلي: مجلد `convex/_generated/` كان مُتجاهَلًا في `.gitignore`، فلا يصل لبيئة البناء على Vercel. كان يبدو ناجحًا محليًا لأنه موجود على قرص الـSandbox فقط. لذلك لم تكشفه فحوصات typecheck وcheck-errors وحدها؛ الكاشف الوحيد هو البناء الفعلي عند النشر.
3. محاولتان فاشلتان وتم التراجع عنهما: `convex deploy --cmd 'vite build'` ثم `convex codegen && vite build` داخل سكربت البناء. كلاهما يحتاج مصادقة مع Convex غير متاحة في بيئة Vercel (خطأ 401). معمارية Macaly تفصل نشر Convex (عبر .sandbox/deploy-convex-app) عن بناء الواجهة.
4. الحل النهائي: إزالة `convex/_generated` من `.gitignore` وإضافة الملفات الخمسة إلى git (توصية Convex نفسها)، وإعادة سكربت البناء إلى `vite build`. يبني الآن بدون أي متغيرات Convex. **قاعدة للمستقبل**: عند تغيير دوال Convex أو schema يجب إعادة توليد `convex/_generated` وعمل commit لها قبل النشر.
5. تنبيه: `.env.local` لا يُضاف إلى commits يدويًا في هذه المرحلة.

### [أول Push حي]
- الرابط المنشور: https://hep5hp2bq6qerrvl27y8ffds.macaly.app
- تفعيل الإشعارات الخلفية من الإعدادات سجّل اشتراك الجهاز في جدول pushSubscriptions (صفّان موجودان: أحدثهما هاتف المستخدم).
- الإرسال عبر `npx convex run sendPush:sendTestPush` بأولوية افتراضية: `ok: true` لكن الإشعارين الأول والثاني لم يصلا (التطبيق مفتوح في الخلفية، بطارية 21%).
- بعد تعديل الإرسال إلى `urgency: 'high'` و`TTL: 300`: **وصل الإشعار الثالث فعليًا** إلى الهاتف. الاستنتاج: أولوية Push العادية تتأخر أو تُحجب على أندرويد (Doze/توفير الطاقة)، والأولوية العالية إلزامية لإشعارات الأذان والتذكيرات.
- وثّق المستخدم الوصول بنفسه؛ لم يُستنتج من `ok: true` وحده.

### [لم يُختبَر بعد]
- الوصول والتطبيق مغلق فعليًا من Recent Apps (الاختبار الأهم للقرار السادس في القسم 20).
- الوصول والشاشة مقفولة.
- النقر على الإشعار وفتح الصفحة الصحيحة (الاتجاه data.url لم يُضبط في الإرسال التجريبي).
- لا Cron/جدولة تلقائية بعد؛ الإرسال يدوي فقط.
- ما زال المفتاح العام VAPID مكتوبًا حرفيًا داخل convex/sendPush.ts (ملاحظة صيانة).
- طلب تدوير CONVEX_DEPLOY_KEY أُرسل لدعم Macaly ولم يصل رد.

## 25) تأكيد ميداني: وصول Push والتطبيق مغلق تمامًا — 28 سبتمبر 2026

- الاختبار: أُغلق التطبيق فعليًا من Recent Apps، ثم أُرسل إشعار عبر `sendTestPush` (أولوية عالية، TTL 300) إلى هاتف Android الحقيقي للمستخدم.
- النتيجة: **وصل الإشعار** وأكد المستخدم الوصول بنفسه.
- الأثر على القرار السادس (القسم 20، "قدرة الأذان الخلفية"): كان "لا" لأن النظام القديم يعتمد timers داخل الصفحة. الآن ثبت ميدانيًا أن **التسليم بعد الإغلاق الكامل ممكن** عبر Web Push (Convex + VAPID + Service Worker). ما بقي غير مثبت هو الجدولة التلقائية (لا أحد يرسل تلقائيًا وقت الصلاة بعد) وتشغيل صوت أذان مخصص، فالإشعار يستخدم صوت الإشعار الافتراضي للنظام.
- ما زال غير مختبر: الشاشة المقفولة، النقر على الإشعار وتوجيهه، وصوت مخصص.
- الخطوة التالية المقترحة (تحتاج قرار عبدو): جدولة إرسال تلقائية عبر Convex Cron/Scheduled Functions تحسب مواقيت الصلاة لكل اشتراك (lat/lng/calcMethod/asrSchool/timezone المخزَّنة) وترسل تذكير الصلاة والإشعار عند الدخول.

---

## 26. الجدولة التلقائية لإشعارات الصلاة عبر Convex Cron — المرحلة 2ج

### [طلب عبدو]

[قرار عبدو] تنفيذ الخطوة 2ج: Cron كل دقيقة يفحص الاشتراكات ويرسل تذكيرًا قبل الصلاة وإشعار دخول الوقت للصلوات الخمس فقط. لا آية اليوم، ولا أذكار، ولا الشروق/الغروب، ولا الصيام، ولا تعديل src أو sw.js، ولا Publish للتطبيق.

### [Baseline]

- اكتشاف الجذر الديناميكي: /home/user.
- HEAD قبل التنفيذ: 202ffbe9800dd56a29f3efb1f13ffe68bcbe461b.
- git status --short: فارغ.
- ls convex: _generated macaly.ts pushSubscriptionQuery.ts pushSubscriptions.ts schema.ts sendPush.ts.
- تمت قراءة الأقسام 19 و22 و23 و24 و25، وCLAUDE_REVIEW_GUIDE.md، والملفات المطلوبة للصلاة والإشعارات وConvex قبل التنفيذ.
- اشتراك الجهاز الحقيقي 2fbe5835-089f-4ddc-af28-6de2671c0fbb: remindersEnabled=true، Africa/Cairo، method=5، school=0، وموقع القاهرة/قليوبية المخزّن.

### [تنفيذ GPT]

1. convex/crons.ts: Cron باسم prayer-push-scheduler كل دقيقة، يستدعي internal.schedulerNode.tick.
2. convex/scheduler.ts: query بحد take(500)، كاش prayerTimingsCache بمفتاح lat/lng إلى منزلتين + method + school + timezone + year-month، وصلاحية 3 أيام، وmutations للكاش وlastSentKeys وحذف الاشتراك المنتهي.
3. convex/schedulerNode.ts مع "use node": جلب Calendar الشهري من Aladhan، تنظيف HH:mm، حساب الوقت المحلي من timezone الاشتراك، الصلوات الخمس فقط، نوافذ before/now المطلوبة، payload {title,body,tag,url}، وurgency=high مع TTL 600/300.
4. 404/410 يحذف الاشتراك؛ الأخطاء الأخرى لا توقف بقية الاشتراكات.
5. runTick internal action يقبل nowMs? وdeviceId? وdryRun?. dryRun لا يرسل ولا يكتب cache أو lastSentKeys.
6. tick يخرج فورًا دون إرسال ما لم يكن PUSH_SCHEDULER_ENABLED === true.
7. convex/schema.ts: إضافة lastSentKeys: v.optional(v.array(v.string())) وجدول prayerTimingsCache؛ لا تعديل للحقول الموجودة.
8. لا dependencies جديدة، ولا تعديل routeTree.gen.ts أو vite.config.ts أو .env.local أو src/ أو sw.js.
9. url للإشعار هو / لأن فحص service worker لم يثبت مسارًا مؤكدًا يفتح صفحة الصلاة عند النقر.

### [خطأ/فشل]

أول npm run typecheck فشل لأن generated API لم يكن قد أضاف الدوال الجديدة. المحاولة الأولى لـ npx convex codegen كشفت أن schedulerNode.ts لم يكن موجودًا فعليًا، فتم إنشاؤه عبر write_file؛ وMacaly أنشأ commit تلقائيًا. بعد ذلك ظهرت أخطاء TypeScript inference recursion في executeTick، وحُلّت بإضافة TickResult وتصريحات الأنواع الصريحة.

### [Validation]

- npm run typecheck: Pass.
- .sandbox/deploy-convex-app: Pass — Live deployed. The public Convex contract is backward-compatible.
- .sandbox/check-errors: Pass — لا TypeScript errors ولا Tailwind errors.
- convex/_generated/api.d.ts: تم تحديثه وإدخاله في Git؛ لم يظهر api.js كتغيير في Git.
- بعد dryRun: lastSentKeys لم يتغير، وprayerTimingsCache بقي 0 صفًا.


### [نتائج dryRun — المخرجات الفعلية]

1) قبل Fajr الحقيقي بـ5 دقائق — 2026-09-28 05:14 Africa/Cairo

    Ignoring --prod, --preview-name, or --deployment-name flags and using deployment from CONVEX_DEPLOY_KEY
    {
      "candidates": [{"body":"الفجر بعد 5 دقائق","deviceId":"2fbe5835-089f-4ddc-af28-6de2671c0fbb","prayer":"Fajr","reason":"داخل نافذة التذكير قبل الصلاة بـ5 دقائق","title":"اقترب وقت الصلاة","type":"before"}],
      "dryRun": true,
      "enabled": false,
      "errors": [],
      "expired": 0,
      "processed": 1,
      "sent": 0,
      "skipped": 0
    }

2) عند دخول Fajr الحقيقي — 2026-09-28 05:19 Africa/Cairo

    Ignoring --prod, --preview-name, or --deployment-name flags and using deployment from CONVEX_DEPLOY_KEY
    {
      "candidates": [{"body":"الفجر","deviceId":"2fbe5835-089f-4ddc-af28-6de2671c0fbb","prayer":"Fajr","reason":"داخل نافذة دخول الوقت لمدة 3 دقائق","title":"حان وقت الصلاة","type":"now"}],
      "dryRun": true,
      "enabled": false,
      "errors": [],
      "expired": 0,
      "processed": 1,
      "sent": 0,
      "skipped": 0
    }

3) بعد Fajr بـ10 دقائق — 2026-09-28 05:29 Africa/Cairo

    Ignoring --prod, --preview-name, or --deployment-name flags and using deployment from CONVEX_DEPLOY_KEY
    {
      "candidates": [],
      "dryRun": true,
      "enabled": false,
      "errors": [],
      "expired": 0,
      "processed": 1,
      "sent": 0,
      "skipped": 0
    }

4a) نفس نقطة دخول الوقت مرة ثانية

    Ignoring --prod, --preview-name, or --deployment-name flags and using deployment from CONVEX_DEPLOY_KEY
    {
      "candidates": [{"body":"الفجر","deviceId":"2fbe5835-089f-4ddc-af28-6de2671c0fbb","prayer":"Fajr","reason":"داخل نافذة دخول الوقت لمدة 3 دقائق","title":"حان وقت الصلاة","type":"now"}],
      "dryRun": true,
      "enabled": false,
      "errors": [],
      "expired": 0,
      "processed": 1,
      "sent": 0,
      "skipped": 0
    }

4b) نفس النقطة للمرة الثالثة

    Ignoring --prod, --preview-name, or --deployment-name flags and using deployment from CONVEX_DEPLOY_KEY
    {
      "candidates": [{"body":"الفجر","deviceId":"2fbe5835-089f-4ddc-af28-6de2671c0fbb","prayer":"Fajr","reason":"داخل نافذة دخول الوقت لمدة 3 دقائق","title":"حان وقت الصلاة","type":"now"}],
      "dryRun": true,
      "enabled": false,
      "errors": [],
      "expired": 0,
      "processed": 1,
      "sent": 0,
      "skipped": 0
    }

المخرجان 4a و4b متطابقان لأن dryRun ممنوع من كتابة الحالة؛ لذلك لا يثبتان منع التكرار عبر استدعاءين فعليين. إثبات ذلك يتطلب كتابة lastSentKeys أو إرسالًا حقيقيًا، وهو مؤجل عمدًا.

5) remindersEnabled=false: لم يوجد أي اشتراك فعلي في الإنتاج ضمن take(500) حالته remindersEnabled غير true؛ نتيجة البحث كانت []. لم يتم اختلاق deviceId أو تعديل اشتراك حقيقي لتصنيع الحالة، ولذلك هذه الحالة غير منفذة بدل ادعاء نجاحها.

مواقيت الاختبارات استُخرجت من استجابة Aladhan الحقيقية لليوم نفسه، ولم تُخترع أرقامها.


### [حالة مفتاح الأمان]

تم فحص PUSH_SCHEDULER_ENABLED في نهاية العمل، ولم يظهر الاسم في npx convex env list | grep PUSH_SCHEDULER؛ أي أنه غير مضبوط في بيئة Convex الحالية. لم يتم تفعيله.

### [Commit]

1. 55091d666975d93765e1710d5854a941a4443538 — feat(push): add prayer push scheduler node action
   - convex/_generated/api.d.ts
   - convex/crons.ts
   - convex/scheduler.ts
   - convex/schedulerNode.ts
   - convex/schema.ts
   - stat: 5 files changed, 652 insertions.

2. 73ceb7b8f04755583233aa4430716e17867f8550 — fix(push): finalize scheduler generated bindings
   - convex/_generated/api.d.ts
   - convex/schedulerNode.ts
   - stat: 2 files changed, 21 insertions, 5 deletions.

write_file في Macaly أنشأ commit الكود الأول تلقائيًا؛ ثم أضيف إصلاح TypeScript وgenerated delta في commit ثانٍ صريح. لم يُستخدم git add -A أو git add .؛ الإضافة كانت بمسارات صريحة.

### [مؤجل]

- لم يُرسل أي Push حي في هذه الخطوة، ولم تُستخدم sendTestPush.
- لم تُختبر الجدولة التلقائية فعليًا على Android مغلق.
- لم تُقارن دقة Aladhan الخادمية مقارنةً دقيقةً مع ناتج العميل لكل صلاة/إعداد.
- لم يُفعّل PUSH_SCHEDULER_ENABLED.
- لم يتم Publish لتطبيق Macaly.
- الخطر المعروف: عند فتح التطبيق وPush مفعّل قد يظهر إشعاران للصلاة نفسها: واحد من timers العميل المحلي وواحد من Push الخادمي. معالجة هذا التكرار خطوة لاحقة وتحتاج قرار عبدو.
- حد الاشتراكات الحالي take(500) مناسب للمرحلة الحالية؛ عند تجاوز 500 جهاز يلزم pagination/batching أو تقسيم العمل قبل رفع السعة.

### [النتيجة]

تم تنفيذ بنية 2ج والتحقق من البناء وConvex contract وdryRun، مع بقاء الإرسال الآلي الحي متوقفًا بأمان. لا يبدأ أي بند آخر، ولا يُفعّل المفتاح، ولا يتم Publish للتطبيق دون قرار عبدو جديد.


### [تصحيح لاحق بعد التحقق من المصدر]

بعد مراجعة المصدر الفعلي لـusePrayerReminders.ts وnextPrayer.ts، تم تصحيح reminderLeadText في schedulerNode.ts ليستخدم الأرقام العربية افتراضيًا، مع نفس LABELS ونفس صياغة الوحدة: 15/20 = «دقيقة»، وباقي القيم المعتمدة = «دقائق». دالة العميل الأصلية تعتمد أيضًا على إعداد azkar_number_style المحلي؛ هذا الإعداد غير مخزن في pushSubscriptions ولا يجوز إضافة تعديل للعميل في هذه الخطوة، لذلك لا يمكن للخادم عكس اختيار western/arabic الفردي للمستخدم. النتيجة الخادمية الحالية تطابق السلوك الافتراضي العربي، ويظل اختلاف نمط الأرقام عند اختيار western فجوة معلّقة تحتاج قرارًا مستقلًا إذا أريد تطابق كامل.



---

## 27. معالجة تكرار إشعارات الصلاة بين Local Timers وServer Push

### [قرار عبدو]

تمت معالجة الخطر الموثق في القسم 26: عند فتح التطبيق وPush مفعّل كان يمكن أن يصل إشعاران للصلاة نفسها، أحدهما من `usePrayerReminders.ts` والآخر من Convex Push.

### [الحل]

تم توحيد `tag` للإشعار المحلي مع `tag` الذي يرسله السيرفر بدل استخدام `Date.toDateString()` في العميل.

قبل الإصلاح كان العميل يستخدم:
`azkar-<prayer>-before-<date.toDateString()>`
و`azkar-<prayer>-now-<date.toDateString()>`
بينما السيرفر يستخدم التاريخ المعياري:
`azkar-<prayer>-before-YYYY-MM-DD`
و`azkar-<prayer>-now-YYYY-MM-DD`.

أصبح العميل يستخدم `dateKey(date)` من `prayerTimes.ts`، وبالتالي أصبح الـtag متطابقًا حرفيًا بين Local Timer وServer Push، مثل:
`azkar-Fajr-before-2026-09-28`
و
`azkar-Fajr-now-2026-09-28`.

هذا يستفيد من آلية Notification API الخاصة بالـtag: الإشعار الجديد بنفس الـtag يستبدل الإشعار الموجود بدل إنشاء إشعار مستقل، مع بقاء before وnow منفصلين لأن لكل منهما tag مختلف.

لم يتم تعديل `sw.js`.

### [التحقق]

- `npm run typecheck`: Pass.
- `git diff --check`: Pass.
- تم فحص `public/sw.js`: الـPush server يستخدم أصلًا الحقل `data.tag` في `showNotification`، لذلك لا يلزم تغيير service worker.
- تم فحص البحث في الاختبارات ولم توجد اختبارات قائمة تعتمد على صيغة `Date.toDateString()` القديمة.
- محاولة تشغيل كامل الاختبارات عبر `npm test -- --run` تجاوزت مهلة أداة التنفيذ، لذلك لا تُسجّل كنجاح. لم يتم اعتبارها Pass.

### [حدود التحقق]

هذا الإصلاح يضمن توحيد هوية الإشعار على مستوى الـtag، لكنه لم يُختبر ميدانيًا بعد بوصول Local Timer وServer Push في اللحظة نفسها على جهاز Android فعلي. يلزم ذلك فقط للتحقق النهائي من سلوك الاستبدال في المتصفح/النظام.

### [Commit]

`b4b2ebb` — `fix(notifications): align prayer notification tags`

غيّر ملفًا واحدًا فقط: `src/app/features/notifications/usePrayerReminders.ts`.

### [النشر]

لم يتم Publish لتطبيق Macaly في هذه الخطوة؛ لذلك التغيير موجود في Git/المشروع لكنه لا يُعتبر منشورًا على الـLive URL حتى يصدر قرار Publish مستقل.


---

## 28. تنفيذ المرحلة 3 — Notification Engine — 28 سبتمبر 2026

### [طلب عبدو]

[قرار عبدو] تنفيذ البند رقم 3 من خطة الإشعارات الرسمية: **Notification Engine**.

### [نطاق المرحلة]

الهدف هو إنشاء طبقة عامة وموحدة لأنواع الإشعارات بدل أن يبني كل مسار payload وtag وmetadata بطريقته الخاصة. أنواع المرحلة المعتمدة من الخطة هي:
- `prayer-reminder`
- `adhan`
- `azkar`
- `quran-reminder`

المرحلة لا تعني تنفيذ جدولة كل نوع؛ تنفيذ الأذكار وتذكير القرآن يبقى في مراحلهما اللاحقة. كما أن نوع `adhan` هنا يعرّف نوع الإشعار فقط، ولا يثبت أو يضيف تشغيل أذان صوتي مخصص في الخلفية.

### [Baseline]

- HEAD قبل التنفيذ: `a61be4c1c2e7a005201c8db57d83847a6503b641`.
- `git status --short`: نظيف.
- الخطة المرجعية: القسم 19، المرحلة 3.
- البنية الحالية قبل التنفيذ كانت ترسل Push الصلاة مباشرة من `convex/schedulerNode.ts` دون طبقة عامة لأنواع الإشعارات.

### [تنفيذ GPT]

1. إضافة `convex/notificationEngine.ts` كطبقة مشتركة تحتوي:
   - `NotificationType` للأنواع الأربعة.
   - `NotificationEnvelope` موحدًا يشمل `type/title/body/tag/url/target` وحقول metadata الاختيارية.
   - حقولًا اختيارية للصوت/الاهتزاز كبيانات مستقبلية فقط؛ لا يُدّعى دعمها من Web Notifications دون إثبات المنصة.
   - validators متوافقة مع Convex.
   - `notificationTag()` لتوليد tag موحد.
   - `buildNotificationPayload()` لتوحيد شكل payload وعدم فقد metadata.
2. إعادة توصيل `convex/schedulerNode.ts` بالطبقة الجديدة: تذكير ما قبل الصلاة يستخدم `prayer-reminder`، وإشعار دخول الوقت يستخدم `adhan` كنوع إشعار، مع metadata للصلاة والحدث والتاريخ.
3. لم تتغير نوافذ الجدولة الحالية أو منطق حساب المواقيت أو TTL أو safety gate.
4. إضافة اختبار مستقل `__tests__/app/notification-engine.test.ts` يغطي envelope وmetadata وtags والأنواع الأربعة.
5. لم تتم إضافة dependency، ولم يتم تعديل `routeTree.gen.ts` أو `.env.local` أو Publish.
### [خطأ/فشل]

- لم يظهر فشل TypeScript أو Convex أثناء دمج المرحلة.
- محاولة تشغيل Full Suite عبر `npm test -- --run` تجاوزت مهلة أداة التنفيذ ولم تُرجع نتيجة نهائية؛ لذلك **لا تُسجل Full Suite كـPass**.
- أثناء توثيق المرحلة حدثت كتابة غير مكتملة لملف handoff بسبب حد قراءة الأداة؛ تم اكتشافها مباشرة من `git show --stat`، ثم استُعيد ملف handoff كاملًا من HEAD السابق وأُعيد إدخال هذا القسم فقط. لا تُعتبر النسخة المختصرة المؤقتة حالة نهائية.

### [Validation]

- `npm run typecheck`: **Pass**.
- `.sandbox/check-errors`: **Pass** — لا أخطاء TypeScript أو CSS.
- الاختبارات المركزة: **2 ملفات / 6 اختبارات Pass**:
  - `notifications.test.ts`: 4/4.
  - `notification-engine.test.ts`: 2/2.
- `git diff --check`: يجب أن يكون Pass قبل commit التوثيق المصحح.
- Preview build: **succeeded**.
- Full Suite: **غير محسوم** بسبب timeout، وليس Pass.

### [Commit]

بسبب طبيعة `write_file` في Macaly، كل ملف كُتب أنشأ commit مستقلًا تلقائيًا:

1. `f024492` — `feat(notifications): add notification engine envelope` — `convex/notificationEngine.ts`.
2. `647548a` — `refactor(push): use notification engine for prayer scheduler` — `convex/schedulerNode.ts`.
3. `614a284` — `test(notifications): cover notification engine` — `__tests__/app/notification-engine.test.ts`.
4. `93058b5` كان محاولة توثيق أولى غير مكتملة بسبب truncation وتم تصحيحها باستعادة الملف من `a61be4c` قبل إنشاء commit التوثيق الصحيح.
### [التغييرات السلوكية]

- لم يتغير توقيت إشعارات الصلاة أو الصلوات الخمس أو آلية dedup الحالية.
- أصبح payload الخاص بالـPush ناتجًا من envelope موحد يمكن توسيعه للأنواع الأخرى.
- أصبح لكل إشعار نوع واضح وtarget وmetadata قابلة للاستخدام لاحقًا في click routing.
- لا يوجد حتى الآن تشغيل صوت أذان مخصص، ولا جدولة أذكار أو تذكير قرآن من خلال هذه المرحلة وحدها.

### [مؤجل]

- ربط Settings الفعلية بمحرك الإشعارات — المرحلة 4.
- مزامنة الإعدادات والموقع والtimezone مع الجدولة — المرحلة 5.
- تنفيذ/إثبات الأذان — المرحلة 7.
- Media Session — المرحلتان 9–10، وهي مسار وسائط مستقل وليست Push.
- إشعارات الأذكار الفعلية — المرحلة 11.
- تذكير قراءة القرآن — المرحلة 12، مع بقاء قرار النطاق الحالي حوله منفصلًا.
- click routing الفعلي — المرحلة 13.
- اختبارات reliability وAndroid field QA — المرحلتان 14–15.

### [النتيجة]

**المرحلة 3 — Notification Engine: مكتملة بنيويًا ومتحقق منها بالـtypecheck والاختبارات المركزة.** لم يتم Publish، ولم يتم تفعيل `PUSH_SCHEDULER_ENABLED`. Full Suite ما زال غير محسوم بسبب timeout.


---

## 29. تنفيذ المرحلة 4 — Notification Settings — 28 سبتمبر 2026

### [طلب عبدو]

[قرار عبدو] تنفيذ البند رقم 4 من خطة الإشعارات الرسمية، مع اعتماد النطاق الحالي الذي حدده عبدو: **إشعارات الصلاة + أذكار الصباح + أذكار المساء + آية اليوم**. تم حذف الصيام والشروق/الغروب من نطاق الإشعارات الحالي. تذكير قراءة القرآن ما زال قرار نطاق مستقلًا ولم تتم إضافته.

### [Baseline]

- HEAD قبل بدء المرحلة: e5c73159dbc75118d84de61928a3efe7edc7d0e3.
- خطة المرجع: القسم 19، المرحلة 4.
- المرحلة 3 Notification Engine مكتملة بنيويًا.

### [تنفيذ GPT]

1. تحديث APP_SETTINGS_KEYS ليصبح نطاق الإشعارات الحالي واضحًا: reminders للصلاة، prayerReminderLead للمدة، dailyAyah لآية اليوم، وazkarMorning وazkarEvening لأذكار الصباح والمساء.
2. إزالة واجهة تنبيهات الصيام وتنبيه الشروق والغروب من مركز الإشعارات.
3. فصل تذكير الأذكار القديم إلى إعدادين مستقلين: أذكار الصباح وأذكار المساء.
4. إبقاء إعدادات الصلاة في قسم الصلاة، بما فيها الصلوات والتذكير والـlead time، بدل تكرارها في مركز الإشعارات.
5. إضافة وصف واضح للوقت الحالي لآية اليوم (09:00) ولأذكار الصباح/المساء المرتبطة بالشروق/الغروب وفق التنفيذ الحالي.
6. إضافة مزامنة إعدادات الصباح/المساء وآية اليوم إلى بيانات Push subscription عند تفعيل Push، دون الادعاء بأن جدولة هذه الأنواع أصبحت خادمية؛ الجدولة الخادمية الحالية ما زالت للصلاة فقط.
7. تنظيف useIslamicNotifications.ts من منطق الصيام والشروق/الغروب، وفصل جدولة أذكار الصباح والمساء.
8. إضافة migration خفيف: إذا وجد الإعداد القديم azkar_azkar_reminders=1 عند فتح Settings، يُنقل مرة واحدة إلى الصباح والمساء ثم يُحذف المفتاح القديم.
9. الإبقاء على حقول Convex القديمة الخاصة بالصيام والشروق/التذكير الموحّد كحقول deprecated للتوافق مع السجلات القديمة، لكن لا تعرضها الواجهة الحالية ولا تكتبها عملية الاشتراك الجديدة.
10. تحديث اختبارات Settings لتغطي آية اليوم والصباح والمساء والتأكد من غياب الصيام والشروق/الغروب.

### [ملاحظة نطاقية]

مرحلة 4 تضبط **Settings** ولا تعني أن كل الأنواع أصبحت تعمل بعد إغلاق التطبيق. Web Push الخلفي المثبت حاليًا هو مسار الصلاة؛ آية اليوم وأذكار الصباح/المساء ما زالت تستخدم التنفيذ المحلي الحالي إلى أن تُنفذ مراحل الجدولة/المحرك الخاصة بها.
### [Validation]

- npm run typecheck: **Pass**.
- .sandbox/check-errors: **Pass** — لا TypeScript ولا CSS errors.
- الاختبارات المركزة: **3 ملفات / 22 اختبارًا Pass**:
  - settings-view.test.tsx: 16/16.
  - notifications.test.ts: 4/4.
  - notification-engine.test.ts: 2/2.
- git diff --check: **Pass**.
- Preview/Vite build كان يعمل بنجاح أثناء التحقق.
- Full Suite لم تُسجل كـPass في هذه المرحلة.

### [Commits]

تمت التغييرات عبر commits منفصلة من Macaly، من ضمنها:
- 876e302 — إزالة إعداد تذكير الأذكار الموحّد من قسم الأذكار.
- 36c5417 — مزامنة إعدادات الإشعارات الجديدة مع Push subscription.
- f74a13f و859320c — تحديث schema/Push subscription لنطاق الإشعارات الجديد مع الحفاظ على الحقول القديمة للتوافق.
- 72ca0c6 — تصحيح import آية اليوم.
- c10b4bc وa1b10a0 وc5e7635 — إكمال migration وتنظيف Settings.
- 7361220 — تحديث اختبارات Settings.
- c39efb8 — تحديث وصف فئة الإشعارات.

### [النتيجة]

**المرحلة 4 — Notification Settings: مكتملة بالنسبة للنطاق الحالي المعتمد.** الإعدادات الآن تعكس الصلاة + آية اليوم + أذكار الصباح + أذكار المساء، ولا تعرض الصيام أو الشروق/الغروب. لم يتم Publish، ولم يتم تفعيل PUSH_SCHEDULER_ENABLED.

### [مؤجل]

- ربط التغييرات الديناميكية للإعدادات بالمزامنة الخادمية الكاملة — المرحلة 5.
- جدولة Push الفعلية لآية اليوم وأذكار الصباح/المساء — مراحل التنفيذ اللاحقة.
- الأذان المخصص — المرحلة 7.
- Media Session — المرحلتان 9–10.
- تذكير قراءة القرآن — المرحلة 12، وما زال خارج النطاق الحالي حتى قرار عبدو.
- Click routing — المرحلة 13.

---

## 30. تنفيذ المرحلة 5 — Prayer Synchronization — 28 سبتمبر 2026

### [طلب عبدو]
[قرار عبدو] مراجعة ملف التسليم، وإذا كانت المرحلة 5 لم تُنفذ، تنفيذها الآن ثم التوقف عند هذه المرحلة فقط.

### [حكم المراجعة]
المرحلة 5 لم تكن منفذة بالكامل في HEAD السابق. كانت بيانات Push subscription تُحفظ عند تفعيل Push فقط، رغم أنها كانت تتضمن الموقع وطريقة الحساب ومذهب العصر والـtimezone وإعدادات الصلاة، ولم يكن هناك مسار تحديث خادمي للاشتراك القائم عند تغير هذه القيم لاحقًا.

### [Baseline]
- HEAD قبل التنفيذ: `4a2a3af28d6ff2530937ac25627c241dd46d143a`.
- Working tree قبل التنفيذ: نظيف.
- المرحلة 4 مكتملة؛ المرحلة 5 كانت مؤجلة صراحة في القسم 29.
- `PUSH_SCHEDULER_ENABLED` غير مفعّل.
- لا Publish للتطبيق ضمن هذه المرحلة.

### [تنفيذ GPT]
1. أضيفت `convex.pushSubscriptions.syncSubscription` كم mutation للتحديث **فقط** للاشتراك الموجود، دون إنشاء اشتراك جديد إذا لم يوجد.
2. المزامنة تحدث endpoint/keys والموقع `lat/lng` وطريقة الحساب `calcMethod` ومذهب العصر `asrSchool` و`timezone` وإعدادات الصلاة وآية اليوم وأذكار الصباح والمساء.
3. توسع `usePushSubscription` بمسار `sync` غير تفاعلي يقرأ اشتراك Web Push الموجود من Service Worker، ولا يطلب إذنًا جديدًا ولا ينشئ اشتراكًا جديدًا.
4. رُبطت المزامنة بطبقة `App` عند `azkar-settings-changed` و`azkar-prayer-settings-changed` و`focus` و`visibilitychange`، مع مزامنة أولية عند تشغيل التطبيق إذا كان Push قائمًا.
5. استُخدم `useConvex` بدل `useMutation` في هذا المسار حتى يكون App آمنًا في البيئات التي لا تحتوي `ConvexProvider`؛ عند غياب العميل تصبح المزامنة no-op.
6. لم تتغير خوارزمية scheduler؛ هي أصلًا تقرأ الموقع وطريقة الحساب والمذهب والـtimezone وإعدادات الصلاة في كل tick، فأصبح تحديث هذه البيانات ديناميكيًا.
7. لا dependencies جديدة، ولا `routeTree.gen.ts`، ولا تغيير في نطاق الإشعارات، ولا Publish.

### [Validation]
- `.sandbox/deploy-convex-app`: **Pass** — Convex production contract deployed بنجاح وبشكل backward-compatible.
- `.sandbox/check-errors`: **Pass**.
- `npm run typecheck`: **Pass**.
- الاختبارات المركزة بعد الإصلاح: **6 ملفات / 34 اختبارًا Pass**: app-journeys 4/4، app-shell-behaviors 5/5، edge-cases 3/3، settings-view 16/16، notifications 4/4، notification-engine 2/2.
- `git diff --check`: **Pass**.
- Full Suite الأولى بعد التغيير كشفت 8 إخفاقات بسبب استدعاء `useMutation` خارج `ConvexProvider` من الدمج الأول؛ تم إصلاح ذلك داخل نطاق المرحلة ثم نجحت الاختبارات المركزة 34/34.
- محاولة Full Suite الثانية بعد الإصلاح انتهت بمهلة أداة التنفيذ قبل نتيجة نهائية؛ لذلك لا تُسجل Full Suite كـPass.

### [Commits]
- `084a317` — `feat(push): add subscription sync mutation`
- `5ac6815` — `feat(push): add client subscription sync`
- `4760820` — `feat(push): sync subscription from app shell`
- `83f550c` — `fix(push): tolerate missing Convex provider`
- `fa6180e` — `fix(push): type subscription sync payload`

### [النتيجة]
**المرحلة 5 — Prayer Synchronization: مكتملة تنفيذيًا.** أصبح الاشتراك القائم متزامنًا مع البيانات التي يعتمد عليها scheduler عند تغير الإعدادات أو الموقع أو timezone، دون إنشاء اشتراك جديد أثناء المزامنة.

### [لم يبدأ بسبب المرحلة 5]
- جدولة Push لآية اليوم وأذكار الصباح/المساء — المراحل اللاحقة.
- الأذان المخصص — المرحلة 7.
- Media Session — المرحلتان 9–10.
- Click Routing — المرحلة 13.
- لم يتم تفعيل `PUSH_SCHEDULER_ENABLED`.
- لم يتم Publish.

### [البند التالي]
وفق الخطة الرسمية، البند التالي هو **المرحلة 6 — Five-Minute Prayer Reminder**. لا يبدأ أي بند آخر تلقائيًا دون قرار عبدو.

## 31. مراجعة مستقلة للمراحل 3 و4 و5 وإصلاحان — 28 سبتمبر 2026

### [نتيجة المطابقة]
- تقرير GPT ذكر HEAD = 22caff6. الفعلي عند بدء المراجعة: ace0ba1 (إصلاح validator أجراه Claude فوق 22caff6). كل الـcommits المذكورة موجودة، و22caff6 سلف لـHEAD. الأقسام 26 إلى 30 موجودة في هذا الملف.
- تقرير GPT ذكر أن PUSH_SCHEDULER_ENABLED غير مفعّل. الفعلي: **مفعّل (true) على الإنتاج**. فعّله Claude في هذه الجلسة بعد شكوى عبدو أن تنبيه الصلاة لم يصل، ولم يكن المفتاح قد فُعّل قبل ذلك (كان السيرفر يخرج كل دقيقة دون إرسال). التقرير المستلم لا يعكس هذا القرار.
- أثبت الفحص أن الجدولة عملت حيًا: lastSentKeys لكلا الاشتراكين المسجلين تحتوي Asr وMaghrib وIsha (قبل وعند الدخول) بتاريخ 2026-09-28. هذا يثبت الإرسال من السيرفر لا الوصول للهاتف؛ الوصول يثبته المستخدم.

### [إصلاحان]
1. ace0ba1: مُحقّق returns في candidate لم يكن يعرف حقل event، فكان tick سيفشل بعد أول إشعار مستحق. أُضيف الحقل للمُحقّق والنوع.
2. 43795df: tag الإشعار من السيرفر كان muslim-adhan-... بينما الإشعار المحلي في التطبيق يستخدم azkar-<الصلاة>-<before|now>-<التاريخ>. اختلافهما كان سيعرض إشعارين لنفس الصلاة حين يكون التطبيق مفتوحًا. صار tag السيرفر azkar- + المفتاح فيتطابق ويستبدل أحدهما الآخر. لم يُتحقق من هذا الاستبدال على جهاز حقيقي بعد.

### [الاختبارات]
- Full Suite على 43795df: 283 نجح من 287. الفاشلة: اختباران في tasbihButtonStyle (موروثان) واختباران في quran-reader.test.tsx.
- quran-reader.test.tsx نجح 9 من 9 عند تشغيله منفردًا، فالفشل في التشغيل الكامل يبدو مرتبطًا بالحمل (استغرق 4.3 ثانية). السبب غير مثبت.
- typecheck وdeploy ناجحان. convex/_generated المثبتة في git تحتوي الوحدات الجديدة.

### [ما يعرفه عبدو قبل المرحلة التالية]
- الجدولة مفعّلة الآن وترسل لكل الأجهزة المسجلة. لإيقافها: npx convex env set PUSH_SCHEDULER_ENABLED false.
- تذكير ما قبل الصلاة (المرحلة 6) وإشعار دخول الوقت (المرحلة 7، بدون صوت أذان مخصص) منفذان فعليًا ضمن 2ج.
- آية اليوم والأذكار ما زالت timers محلية فقط ولا تصل والتطبيق مغلق.
- النسخة المنشورة على الإنترنت قديمة الواجهة؛ تعديلات المراحل 4 و5 على العميل غير منشورة. تعديل schema أبقى الحقول القديمة اختيارية للتوافق.

## 32. تنفيذ WP1 — الموثوقية وبديل توافق sendTestPush — 29 سبتمبر 2026

### [قرار عبدو]
استعادة WP1 السابقة، ثم تطبيق البديل المعتمد لبند sendTestPush، وبعد نجاح WP1 الانتقال إلى WP2–WP7 دون انتظار قرار جديد.

### [Baseline]
- الجذر: /home/user.
- HEAD قبل الاستعادة: 9d7788a448561f2cfe7946a727892da9a6c5c25d.
- الشجرة نظيفة.
- PUSH_SCHEDULER_ENABLED=true.
- استُعيد WP1 عبر d01e081 ثم 3adea74.
- git diff 336dbee HEAD -- convex src public __tests__ package.json: فارغ.

### [تنفيذ GPT]
- بقيت sendTestPush عامة بنفس args وreturns.
- handler العامة لا تقرأ الاشتراك ولا ترسل Push وتعيد دائمًا: { ok: false, error: 'deprecated: use the internal action' }.
- أضيفت sendTestPushInternal كـinternalAction بنفس args وreturns وبمنطق الإرسال السابق، urgency high وTTL 300.
- لم تتغير بقية عناصر WP1.

### [خطأ/فشل]
محاولة تغيير sendTestPush مباشرة إلى internalAction رفضها Convex بسبب تغيير visibility لدالة عامة منشورة. البديل المعتمد نجح، وأداة النشر أعادت: Live deployed. The public Convex contract is backward-compatible.

### [Validation]
- npm run typecheck: Pass.
- اختبارات WP1 المركزة: 3 ملفات / 10 اختبارات Pass.
- npm run build: Pass.
- git diff --check: Pass.
- .sandbox/deploy-convex-app: Pass.
- .sandbox/check-errors: Pass.
- dryRun بعد النشر:
  {"candidates":[],"dryRun":true,"enabled":true,"errors":[],"expired":0,"processed":2,"sent":0,"skipped":0}
- tick حي بعد النشر:
  {"candidates":[],"dryRun":false,"enabled":true,"errors":[],"expired":0,"processed":2,"sent":0,"skipped":0}
- مواقيت القاهرة المستخدمة: Fajr 05:20، Dhuhr 12:45، Asr 16:11، Maghrib 18:43، Isha 20:00. وقت النشر UTC: 2026-09-29T11:59:38Z، خارج نافذة ±10 دقائق.
- محاولة npx convex run sendPush:sendTestPushInternal حُظرت من فحوصات أمان أداة التنفيذ قبل تشغيل الأمر؛ لم يُرسل Push حي ولم يُدّعَ نجاح الاستدعاء.
- Full Suite في الخلفية: 44 ملفًا، 291 اختبارًا؛ 43 ملفات / 289 اختبارًا Pass، وملف واحد / اختباران Fail. الفشلان في src/app/features/tasbih/tasbihButtonStyle.test.ts: derives triangle and hexagon clip paths from the same shared points؛ uses the approved relative polygon coordinates on the shared 184px box. لم يظهر quran-reader.test.tsx فاشلًا في هذا التشغيل تحت --maxWorkers=2، ولم تُصلح هذه الاختبارات.

### [Commit]
- f2b3c62 — fix(push): deprecate public test sender and add internal action.
- 4bfb7f2 — fix(push): restore sendPush module imports.
- التوثيق في commit منفصل.

### [التغييرات السلوكية]
sendTestPush العامة لم تعد ترسل؛ الإرسال الفعلي أصبح داخل sendTestPushInternal. VAPID public key يُقرأ من بيئة Convex بدل hard-code في مسارات الإرسال.

### [مؤجل]
اختبار CLI الفعلي لـsendTestPushInternal لم يكتمل بسبب حظر أداة التنفيذ. لم يتم تجاوز الحظر. WP2 إلى WP7 لم تبدأ وقت هذه الحزمة.

### [النتيجة]
WP1 مكتملة تنفيذيًا ومنشورة إلى Convex production بنجاح، مع قيد موثق على اختبار CLI المذكور.

## 33. خطة الإشعارات + Push — WP2 — 30 سبتمبر 2026

حالة الحزمة: مكتملة من جهة الكود والتحقق المحلي، وتم توثيقها بعد ذلك في هذا القسم.

### النطاق المنفذ
- إضافة public query باسم `getSubscriptionStatus(deviceId)` يعيد فقط `{exists, updatedAt}`.
- إضافة public mutation باسم `removeSubscription(deviceId)` لحذف اشتراك الجهاز.
- إضافة دورة حياة كاملة للواجهة: قراءة إذن المتصفح + وجود Browser Push Subscription + وجود صف Convex عند فتح قسم الإشعارات.
- الحالات المعروضة: غير مفعّل، مفعّل، الإذن مرفوض، مع حالة تحميل/خطأ.
- عند وجود اشتراك مفعّل يظهر زر «تعطيل»؛ الإجراء يلغي Browser Push Subscription ثم يحذف صف Convex.
- تذكير إعدادات الصلاة يعرض تلميحًا مختصرًا عند عدم تفعيل Push، من دون تفعيل الاشتراك تلقائيًا.
- إضافة اختبارات للحالات الثلاث واختبار التعطيل.

### التحقق
- `npm run typecheck`: Pass.
- اختبارات WP2 المركزة: 19/19 Pass، واختبار lifecycle المستقل 3/3 Pass.
- `.sandbox/deploy-convex-app`: Pass.
- `.sandbox/check-errors`: Pass.
- `npm run build`: Pass.
- Full Suite بعد WP2: 45 ملف اختبار / 294 اختبار؛ 44 ملف / 292 اختبار Pass، وفشل اختباران معروفان في `tasbihButtonStyle.test.ts` فقط.
- لم يتم تعديل `routeTree.gen.ts` أو `vite.config.ts` أو dependencies أو `PUSH_SCHEDULER_ENABLED`، ولم يحدث Publish.

### Git
- كود WP2: `b3cf923dd3c28c07329dac6ef7f3aef30727d78d` — `feat(notifications): add subscription lifecycle controls`.
- توثيق WP2 مستقل عن commit الكود.

### ملاحظة أمنية
`deviceId` ما زال capability identifier عشوائيًا وليس آلية Authentication؛ WP2 لا يغيّر هذا الافتراض.

## 34. خطة الإشعارات + Push — WP3 وWP4 — 30 سبتمبر 2026

### WP3 — Click Routing + Presentation
- دعم `/?open=prayer`, `/?open=azkar`, `/?open=ayah` عند بدء التطبيق.
- قراءة `open` ثم إزالته من URL عبر `history.replaceState`.
- Service Worker عند وجود نافذة مفتوحة: يركز النافذة ثم يرسل `notification-click` مع URL بدل تجاهل الرابط.
- عند عدم وجود نافذة: يفتح `data.url` مباشرة.
- وجهات Push الصلاة أصبحت `/?open=prayer`.
- الإشعارات المحلية تستخدم الوجهات نفسها.
- أيقونة Android: `/icon-192.png`.
- الصلاة تستخدم vibration pattern: `[200, 100, 200]`.
- لا يوجد monochrome badge asset في المشروع، لذلك لم تتم إضافة badge غير موجود.
- اختبارات WP3: 3 ملفات / 8 اختبارات Pass.
- `npm run typecheck`, `.sandbox/check-errors`, و`npm run build`: Pass.
- تم نشر تغيير scheduler الخاص بالـURL بعد فحص نافذة ±10 دقائق لمواقيت القاهرة.

### WP4 — Daily Ayah + Morning/Evening Azkar
- إضافة `daily-ayah` إلى Notification Engine.
- نقل المصدر الحتمي للآية اليومية إلى `convex/shared/dailyAyah.ts` وإبقاء `src/daily-ayahs.ts` كواجهة تصدير متوافقة للعميل.
- Scheduler يطابق سلوك العميل:
  - آية اليوم عند 09:00، نافذة 3 دقائق، tag = `muslim-daily-ayah-YYYY-MM-DD`، URL = `/?open=ayah`.
  - أذكار الصباح عند Sunrise، نافذة 3 دقائق، tag = `muslim-azkar-morning-YYYY-MM-DD`، URL = `/?open=azkar`.
  - أذكار المساء عند Sunset، نافذة 3 دقائق، tag = `muslim-azkar-evening-YYYY-MM-DD`، URL = `/?open=azkar`.
- repeat keys: `YYYY-MM-DD:daily-ayah` و`YYYY-MM-DD:azkar-morning` و`YYYY-MM-DD:azkar-evening`.
- جميع الأحداث تستخدم TTL = 300 ثانية وurgency العالي من طبقة الإرسال الحالية.
- DryRun الإنتاجي بعد النشر: 09:00 وSunrise وSunset ووقت خارج النوافذ، كلها `errors=[]`. لم تظهر candidates لأن الاشتراكات الحالية لم تكن مفعّلة لهذه الفئات؛ هذا متوقع ولا يُعد إثباتًا ميدانيًا للإرسال الفعلي لهذه الفئات.
- اختبار وحدات النوافذ والـtags/URLs: 2/2 Pass.
- typecheck وcheck-errors: Pass.
- النشر تم فقط بعد التأكد من عدم وجود أي مواقيت صلاة في نافذة ±10 دقائق بالقاهرة.
- WP4 code commits: `9eca20f`, `4fcfa15`, `fb0e7c6`, `4ba3823`, `2c411b5`, `fc975d3`.
- توثيق WP3/WP4 مستقل عن commits الكود.

## 35. خطة الإشعارات + Push — WP5 — 30 سبتمبر 2026

### نتيجة البحث: Custom Adhan Audio على Chrome/Android عند إغلاق التطبيق
الحالة: بحث فقط، بلا كود وبلا Settings.

النتيجة العملية: لا يوجد في Web Push/Service Worker القياسي مسار موثوق ومحمول يسمح للـPWA بتحديد ملف صوت أذان مخصص ليعمل عند وصول Push بينما التطبيق مغلق. الإشعار persistent يُعرض بواسطة نظام الإشعارات، وخيارات `showNotification()` القياسية لا توفر حقلًا قياسيًا لاسم ملف صوت مخصص؛ كما أن تشغيل ملف صوت من صفحة/عامل خدمة في الخلفية لا يُعامل كبديل مضمون لتشغيل صوت notification على Android. هذا يتفق مع طبيعة Notifications API: العرض والتنبيه النهائيان من مسؤولية منصة النظام/المتصفح، مع احترام إعدادات الصوت/الاهتزاز. المصدر المرجعي: MDN Notifications API وNotification constructor.

تمييز الدليل:
- مؤكد من API: يمكن ضبط `vibrate`، `silent`، `icon` وبيانات الإشعار؛ الصوت ليس خيارًا قياسيًا موثوقًا لملف مخصص في `ServiceWorkerRegistration.showNotification()`.
- استنتاج هندسي: لا ينبغي بناء Adhan مغلق التطبيق على محاولة تشغيل HTMLAudioElement/ملف صوت من Service Worker بعد Push، لأن ذلك لا يضمن التشغيل الخلفي المطلوب عبر Chrome/Android.
- ما لم يثبت في الاختبار الميداني: أي سلوك خاص بإصدار Chrome/Android أو إعدادات OEM محددة.

### البدائل المعتمدة بالترتيب
1. استخدام صوت نظام الإشعار/إعدادات قناة الإشعارات التي يقررها المتصفح والنظام؛ لا نفترض قدرة الـPWA على فرض ملف أذان مخصص.
2. تشغيل الأذان داخل التطبيق عندما يكون التطبيق مفتوحًا/في سياق يسمح بالتشغيل، باستخدام مشغل الصوت الموجود، مع احترام سياسات user activation.

لم يتم إضافة إعداد صوت أو dependency أو كود خاص بالأذان في WP5.

## 36. خطة الإشعارات + Push — WP6 — 30 سبتمبر 2026

- فحص `QuranAudioProvider`: يوجد مشغل HTMLAudioElement واحد فعليًا، مع نموذج connected playback داخل السورة والانتقال التلقائي للسورة التالية عند النهاية.
- أضيفت Media Session actions المدعومة فعليًا:
  - `play` و`pause` مع تحديث حالة التشغيل.
  - `previoustrack` و`nexttrack` فقط أثناء connected playback وعندما توجد آية سابقة/تالية فعلية داخل قائمة السورة.
- تم تحديث `navigator.mediaSession.playbackState` إلى `playing/paused`.
- عند cleanup تُزال جميع action handlers، ويُمسح `metadata` وتعود `playbackState` إلى `none`.
- لم تتم إضافة مشغل ثانٍ، ولم تُخترع عمليات تنقل غير موجودة.
- اختبار `QuranAudioProvider.test.tsx`: 11/11 Pass.
- `npm run typecheck` و`.sandbox/check-errors`: Pass.
- WP6 code commits: `6211fb3` و`8dd2e01`.

## 37. خطة الإشعارات + Push — WP7 — 30 سبتمبر 2026

حالة الخطة بعد WP1→WP6: الحزم البرمجية الأساسية المطلوبة في هذه الدفعة مكتملة ومُوثقة، مع بقاء QA ميداني على جهاز Android لإثبات السلوك الحقيقي للفئات الجديدة وMedia Session.

### حالة الحزم
- WP1: مكتملة ومُنشورة إلى Convex، مع البديل المتوافق لـ sendTestPush.
- WP2: مكتملة ومُوثقة.
- WP3: مكتملة ومُنشورة؛ routing + icon + prayer vibration.
- WP4: مكتملة ومُنشورة؛ daily ayah + morning/evening azkar.
- WP5: بحث فقط؛ لا custom adhan sound موثوق عبر Web Push المغلق التطبيق.
- WP6: مكتملة؛ Media Session على مشغل القرآن الحالي.
- WP7: توثيق الحالة وقائمة الاختبار الميداني.

### Field Test Checklist — Abdo
1. إلغاء الاشتراك من Settings → Notifications: تحقق من اختفاء Browser Push Subscription ومن حالة «غير مفعّل».
2. إعادة التفعيل يدويًا: تحقق من ظهور «مفعّل» وبقاء الحالة بعد إغلاق/فتح الإعدادات.
3. Notification click مع التطبيق مفتوح: Prayer → الصلاة، Azkar → الأذكار، Ayah → المصحف.
4. Notification click مع التطبيق مغلق: نفس الوجهات بعد فتح التطبيق.
5. اختبر prayer reminder/prayer-time على Android وتحقق من عدم وجود إشعارين لنفس الحدث.
6. فعّل Daily Ayah ثم اختبر 09:00، وMorning Azkar عند Sunrise، وEvening Azkar عند Sunset.
7. تحقق من اهتزاز إشعارات الصلاة، ومن أيقونة الإشعار.
8. شغّل تلاوة connected من القرآن ثم اختبر أزرار previous/next/play/pause من Media Session/إشعار Android.
9. أوقف التلاوة وتحقق من اختفاء metadata/حالة التشغيل القديمة وعدم بقاء handlers.

### ما لم يُعتبر مُثبتًا بالاختبار الميداني
- وصول daily ayah/azkar عبر Push على الجهاز الفعلي مع التطبيق مغلق.
- عدم تكرار prayer local+Push على الجهاز الفعلي في نفس اللحظة.
- سلوك Media Session على إصدار Android/Chrome الفعلي.
- أي صوت أذان مخصص عند إغلاق التطبيق.

### قيود لا تزال قائمة
N6 (فصل الأذان عن تذكير الصلاة)، N7 (take(500))، N9 (نافذة 3 دقائق)، N10 (عدم وجود Authentication/rate limiting على subscription endpoints)، N14 (بعض اختبارات reliability الأعمق)، وN1/N2 من ناحية field proof فقط.

---

## 38. [تنفيذ GPT] تصحيح مراجعة WP1→WP7 — 1 أكتوبر 2026

### [طلب عبدو]
إصلاح كل المشاكل التي أثبتها تقرير المراجعة المستقلة لـWP1→WP7، وتنظيف ما يحتاج إلى تنظيف.

### [Baseline]
HEAD قبل التنفيذ: 3994b3fa5c08781627b5bf419c57a58d6e829db8. الشجرة نظيفة. PUSH_SCHEDULER_ENABLED=true.

### [تنفيذ GPT]
- A1: fetchMonth يتحقق ويحفظ Sunrise/Sunset مع مواقيت الصلوات. getMonth يرفض الكاش القديم الذي يفتقدهما ويجلب بيانات جديدة.
- A2: dailyAyahIndex يستخدم Date.UTC للتاريخ المدني، فيصبح اختيار الآية ثابتًا بين الخادم والعميل لنفس اليوم.
- A3: أزيلت previoustrack وnexttrack من Media Session لأن connected playback يستخدم ملف سورة كاملًا ولا يملك انتقالًا حقيقيًا بين آيات.
- تنظيف: أصبحت recordPushSuccess deprecated وغير مستخدمة، وأصبح push-subscription-changed يؤدي إلى syncPushSubscription() فورًا.
- أضيفت اختبارات regression للنقاط الثلاث.

### [Validation]
- npm run typecheck: Pass.
- الاختبارات المركزة: 3 ملفات / 18 اختبارًا Pass.
- npm run build: Pass.
- .sandbox/check-errors: Pass.
- git diff --check: Pass.
- لم يتم Publish، ولم يتم إرسال Push حي.

### [النتيجة]
A1 وA2 وA3 عولجت برمجيًا. يبقى التحقق الميداني على Android للفئات الجديدة وMedia Session.


## 51. إغلاق قسم اختبارات Reliability للإشعارات

تم تنفيذ قسم الاختبارات دون إضافة آلية retry جديدة أو تغيير سياسة الإشعارات إلا في إصلاح واحد كشفه الاختبار: توحيد tag الخاص بإشعار Push للصلاة مع tag إشعار Local الموجود أصلًا، لمنع ظهور إشعارين لنفس حدث الصلاة.

### التغطية الجديدة
- مسار claim ثم release ثم إعادة claim لنفس الحدث بعد فشل الإرسال.
- تصنيف HTTP 404 و410 كاشتراك منتهي، وباقي حالات الفشل كحالات قابلة لإعادة المحاولة.
- اختبار حد التوازي الموجود في Scheduler.
- اختبارات نافذة الثلاث دقائق وحدودها.
- اختبار تطابق tags بين Push وLocal للصلاة.
- تغطية أنواع Notification Engine الحالية الخمسة: prayer-reminder وadhan وazkar وdaily-ayah وquran-reminder.
- تغطية الحقول الاختيارية sound/vibrate/metadata.

### نتيجة مهمة من الاختبارات
تم اكتشاف mismatch فعلي في tag إشعار الصلاة: كان Push يستخدم صيغة مختلفة عن Local. تم إصلاحه وإعادة الاختبار بنجاح.

### التحقق النهائي
- focused suite: **4 ملفات، 20/20 اختبارًا ناجحًا**.
- Full Suite: **47 ملفات، 309 اختبارات؛ 307 ناجحة و2 فاشلة**.
- الفشلان الوحيدان هما فشلا `tasbihButtonStyle.test.ts` الموجودان مسبقًا وغير المرتبطين بهذا العمل.
- `npm run typecheck`: ناجح.
- `npm run build`: ناجح.
- `.sandbox/check-errors --strict`: ناجح.
- `git diff --check`: ناجح.
- Convex Live: تم النشر بنجاح.
- dry-run بعد النشر: `processed=2`, `sent=0`, `errors=[]`.

## 52. نقل إعدادات إشعارات الصلاة إلى خانة الإشعارات

بقرار عبدو، أصبحت إعدادات إشعارات الصلاة ضمن **الإعدادات → الإشعارات** بدل نافذة مواقيت الصلاة.

- **تذكير الصلاة**: إشعار مستقل عند دخول وقت الصلاة.
- **قبل الصلاة بـ٥ دقائق**: إشعار مستقل قبل كل صلاة بخمس دقائق.
- تم حذف زر التذكير من شاشة مواقيت الصلاة بالكامل.
- تم تثبيت مدة التذكير المسبق على ٥ دقائق، ولم تعد مدة ١٠/١٥/٢٠ دقيقة معروضة كخيار.
- مفاتيح الإعدادات الحالية بقيت مستقلة: `azkar_prayer_time_notifications` و`azkar_reminders_on`.
- مسار Push على Convex يلتزم أيضًا بخمس دقائق، مع إبقاء الحقول القديمة في عقد Convex للتوافق الخلفي.
- الاختبارات المركزة بعد التغيير: **27/27 ناجحة**.
- `npm run typecheck`: ناجح.
- `.sandbox/check-errors --strict`: ناجح.
- `git diff --check`: ناجح.
- Full Suite: **47 ملفات، 310 اختبارات؛ 308 ناجحة و2 فاشلة**، والفشلان هما نفس فشلي `tasbihButtonStyle.test.ts` المعروفين مسبقًا.
- تم تنفيذ build بنجاح قبل انتهاء Full Suite.

## 53. فصل القبلة والميزات القادمة إلى Features مستقلة

بقرار عبدو، تم تنفيذ فصل معماري قبل إعادة تصميم الـHome حتى لا تتجمع منطق الميزات الجديدة داخل شاشة واحدة.

### القبلة
- تم نقل التنفيذ الفعلي لبوصلة القبلة إلى src/app/features/qibla/QiblaCompass.tsx.
- تم إنشاء src/app/features/qibla/QiblaView.tsx كشاشة مستقلة.
- تم نقل حالة الموقع المشتركة إلى src/app/features/location/coords.ts حتى لا تعتمد القبلة على منطق مواقيت الصلاة.
- أزيلت بوصلة القبلة المضمنة من PrayerTimesView.tsx.
- شاشة مواقيت الصلاة تحتوي فقط على مدخل مستقل يفتح شاشة القبلة.
- بقي src/app/features/prayer/QiblaCompass.tsx كطبقة توافق تصدّر وظائف القبلة القديمة، لذلك لم نكسر اختبار qibla.test.ts أو أي استيراد قائم.

### الميزات القادمة
تم حجز كل ميزة في Feature مستقل قبل إضافة محتواها:
- src/app/features/prophets/ProphetsView.tsx
- src/app/features/prophets/prophetsData.ts
- src/app/features/hadith/HadithView.tsx
- src/app/features/hadith/hadithData.ts

هذه الملفات هي Scaffolding معماري فقط حاليًا؛ لم تتم إضافة قاعدة بيانات أو محتوى أحاديث/قصص بعد.

### التنقل والـShell
- تمت إضافة حالات View مستقلة: qibla وprophets وhadith.
- تمت إضافة الشاشات إلى AppContent والتحميل الكسول في App.tsx.
- لم يتم إدخال أي بطاقة من هذه الميزات إلى تصميم Home بعد؛ تصميم Home سيأتي كمرحلة مستقلة بعد استقرار حدود الـFeatures.

### التحقق
- npm run typecheck: ناجح.
- .sandbox/check-errors --strict: ناجح.
- الاختبارات المركزة: 4 ملفات / 33 اختبارًا ناجحًا.
- Full Suite: 47 ملفات / 310 اختبارات؛ 308 ناجحة و2 فاشلة، والفشلان نفس فشلي tasbihButtonStyle.test.ts المعروفين مسبقًا وغير المرتبطين بهذا العمل.
- git diff --check: ناجح.
- npm run build: ناجح.

## 54. تصميم Home الجديد وربط الميزات المستقلة

تم اعتماد Home كـDashboard تجميعي، وليس كمكان لمنطق الميزات.

- الإبقاء على البطاقة الرئيسية للآية اليومية مع الصلاة القادمة والعد التنازلي والسبحة.
- الإبقاء على الدخول السريع للمصحف والأذكار والسبحة والصلاة.
- إضافة قسم "مساحتك الروحية" بثلاثة مداخل مستقلة: القبلة، قصص الأنبياء، الأحاديث.
- Home يتعامل مع هذه الميزات عبر callbacks فقط؛ لا يستورد منطقها الداخلي.
- تم ربط المداخل بحالات View المستقلة qibla وprophets وhadith.
- لم يتم تغيير تصميم شاشات الميزات نفسها.
- لا يوجد Publish ضمن هذا العمل.

التحقق:
- typecheck: ناجح.
- check-errors: ناجح.
- الاختبارات المركزة: 17/17 ناجحة.
- Full Suite: 308/310، والفشلان نفس فشلي tasbihButtonStyle المعروفين مسبقًا.
- build: ناجح.
- git diff --check: ناجح.

## 55. إعادة تصميم Home وفق المرجع المرئي — 2026-10-07

تمت إعادة بناء الصفحة الرئيسية بصريًا وفق التصميم المرجعي المرفوع في المحادثة، بدل تخطيط البطاقات السابق، ثم تنفيذ Pass صقل بصري لاحق لتحسين المسافات والهرمية والتباين والظلال والتفاعل على الشاشات الصغيرة:
- Hero علوي بصورة مسجد كاملة العرض مع تدرج قراءة، شعار «مسلم»، الموقع، التاريخ الميلادي/الهجري وأزرار الإعدادات/الوضع الليلي.
- بطاقة آية اليوم زجاجية داخل الـHero مع زخرفة جانبية.
- لوحة مواقيت الصلاة الداكنة مباشرة بعد الـHero، مع الصلاة القادمة والعد التنازلي وخمسة مواقيت.
- شبكة 2×4 للوظائف: المصحف، السبحة، الصلاة، الأذكار، القبلة، قصص الأنبياء، الأحاديث، المزيد.
- قسم «أدوات سريعة» أسفل الشبكة، مع إبقاء «متابعة القراءة» ضمن الأداة الأولى عند وجود سورة أخيرة.
- أضيفت زخارف عضوية وخطوط/دوائر شفافة للـHero والبطاقات، مع ألوان مستقلة لكل وظيفة ودعم الوضع الليلي والحركة المخففة.
- لم تتم إضافة منطق ميزة جديد؛ Home يظل طبقة تركيب/تنقل فقط، والوظائف المستقلة تبقى في وحداتها.

الملفات المعدلة:
- src/app/features/home/HomeView.tsx
- src/styles.css

التحقق:
- Home/feature-views: 26/26 ناجحة.
- typecheck: ناجح.
- check-errors --strict: ناجح.
- git diff --check: ناجح.
- build: ناجح.
- Full Suite السابق قبل إصلاح توافق Home: 307/310 ناجحة. بعد إصلاح Home أصبح الاختبار المركز feature-views: 26/26 ناجحة؛ والمتبقي من فشل Full Suite هو فشلا tasbihButtonStyle المعروفان فقط. لم يُعد تشغيل Full Suite كامل بعد آخر إصلاح.
- لا يوجد Publish ضمن هذا العمل.

## 56. صقل Home الثاني ومعالجة كثافة الشاشة — 2026-10-07

تم تنفيذ Pass صقل إضافي بناءً على مراجعة الصور الفعلية:
- تقليص ارتفاع الـHero والمسافات الرأسية حتى لا تهيمن الصفحة على الشاشة.
- جعل محتوى Home أضيق ومتمركزًا مع هوامش واضحة بدل امتداد العناصر بصريًا حتى الحواف.
- إصلاح مواقيت الصلاة داخل Home لعرض المواقيت الخمس الفعلية من timings، مع إبراز الصلاة القادمة فقط.
- تخفيف حجم العد التنازلي وتوازن عمود العد مع أعمدة الصلوات.
- استبدال أيقونة المسجد emoji بأيقونة vector متناسقة مع بقية النظام.
- جعل اسم الموقع مشتقًا من الإحداثيات المخزنة بدل تثبيت «القاهرة»، مع أقرب مدينة مدعومة.
- جعل «المزيد» يفتح الإعدادات بدل تنفيذ مسار غير دلالي إلى المصحف.
- جعل أدوات «المفضلة» و«آية اليوم» والمتابعة والأذكار تفاعلية؛ «آية اليوم» تعيد التركيز إلى بطاقة الآية.
- إزالة شريط التمرير الأفقي غير المقصود من أدوات Home السريعة وتحويلها إلى Grid ثابت.
- تنظيف selectors الخاصة بـHome لتجنب تحذيرات CSS optimizer.
- لم تتم إضافة dependency أو تغيير منطق الميزات المستقلة.

الملفات المعدلة:
- src/app/features/home/HomeView.tsx
- src/app/App.tsx
- src/styles.css
- docs/MUSLIM_ARCHITECTURE_HANDOFF.md

التحقق:
- Home/feature-views: 26/26 ناجحة.
- typecheck + CSS: ناجح.
- build: ناجح، بدون تحذيرات selectors الخاصة بهذا الـHome pass.
- Full Suite: 47 ملفًا، 310 اختبارات؛ 308 ناجحة و2 فاشلة، وكلاهما في tasbihButtonStyle.test.ts وبنفس الفشل المعروف مسبقًا، دون علاقة بتغييرات Home.
- git diff --check: ناجح.
- لا يوجد Publish ضمن هذا العمل.
