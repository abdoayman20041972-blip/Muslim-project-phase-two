import { fetchWithTimeout } from '../../net'
import { convertDehlawiOrthography } from './hadithIntegrity'

/** A grade is shown only when it names who graded it and links to where it was read. */
export type HadithGrade = { label: string; by: string; url: string }

export type Hadith = {
  id: string
  text: string
  source: string
  note: string
  category?: string
  /** True when `text` is only part of the full narration at the cited source. */
  excerpt?: boolean
  /** Optional, attributed. No entry carries one until a grade has passed human review. */
  grade?: HadithGrade
}

// Curated, well-established hadiths with primary collection references.
// These work fully offline. Extended collections load on demand from the
// open hadith-api dataset (fawazahmed0/hadith-api via jsDelivr).
export const HADITH_COLLECTION: Hadith[] = [
  {
    id: 'bukhari-1',
    excerpt: true,
    text: 'إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى',
    source: 'صحيح البخاري — ١',
    note: 'النية هي التي تجعل العمل عبادة، ولكل إنسان من عمله ما نواه به.',
  },
  {
    id: 'muslim-55a',
    excerpt: true,
    text: 'الدين النصيحة',
    source: 'صحيح مسلم — ٥٥',
    note: 'النصيحة لله ولكتابه ورسوله ولأئمة المسلمين وعامتهم أساس هذا الدين.',
  },
  {
    id: 'bukhari-10',
    excerpt: true,
    text: 'المسلم من سلم المسلمون من لسانه ويده',
    source: 'صحيح البخاري — ١٠',
    note: 'من علامات الإسلام الصادق أن يسلم الناس من أذى لسانك ويدك.',
  },
  {
    id: 'bukhari-13',
    text: 'لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه',
    source: 'صحيح البخاري — ١٣',
    note: 'كمال الإيمان أن تتمنى الخير لأخيك كما تتمناه لنفسك.',
  },
  {
    id: 'tirmidhi-2317',
    text: 'من حسن إسلام المرء تركه ما لا يعنيه',
    source: 'سنن الترمذي — ٢٣١٧',
    note: 'من كمال إسلام المرء أن يترك القول والفعل الذي لا يعنيه ولا نفع فيه.',
  },
  {
    id: 'muslim-101',
    excerpt: true,
    text: 'من غشنا فليس منا',
    source: 'صحيح مسلم — ١٠١',
    note: 'تحذير شديد من الغش في البيع والمعاملات، فالصدق والأمانة جزء من الدين.',
  },
  {
    id: 'bukhari-52',
    excerpt: true,
    text: 'الحلال بيّن والحرام بيّن، وبينهما مشبَّهات',
    source: 'صحيح البخاري — ٥٢',
    note: 'من اتّقى الشبهات استبرأ دينه وعرضه، ومن وقع فيها وقع في الحرام.',
  },
  {
    id: 'bukhari-6682',
    text: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم',
    source: 'صحيح البخاري — ٦٦٨٢',
    note: 'كلمتان يسيرتان على اللسان عظيمتا الأجر في الميزان، فاحرص على ذكرهما.',
  },
  {
    id: 'bukhari-6168',
    text: 'المرء مع من أحبّ',
    source: 'صحيح البخاري — ٦١٦٨',
    note: 'فاختر جليسك، فإنّ الصحبة تدبّ إلى القلب تدريجًا.',
  },
  {
    id: 'muslim-2664',
    excerpt: true,
    text: 'المؤمن القويّ خيرٌ وأحبّ إلى الله من المؤمن الضعيف، وفي كلٍّ خير',
    source: 'صحيح مسلم — ٢٦٦٤',
    note: 'القوة هنا بالإيمان والعزم والعمل، فاحرص على قلبٍ قويّ وجسدٍ صالح.',
  },
  {
    id: 'muslim-2699',
    excerpt: true,
    text: 'من سلك طريقًا يلتمس فيه علمًا سهّل الله له به طريقًا إلى الجنة',
    source: 'صحيح مسلم — ٢٦٩٩',
    note: 'طلب العلم عبادةٌ تفتح أبواب الجنة، فاعزم ولو خطوة.',
  },
  {
    id: 'muslim-54',
    text: 'لا تدخلون الجنة حتى تؤمنوا، ولا تؤمنوا حتى تحابّوا، أوَلا أدلّكم على شيءٍ إذا فعلتموه تحاببتم؟ أفشوا السلام بينكم',
    source: 'صحيح مسلم — ٥٤',
    note: 'السلام مفتاح المحبة، والمحبة إيمان، والإيمان مدخل الجنة.',
  },
  {
    id: 'muslim-2626',
    text: 'لا تحقرنّ من المعروف شيئًا، ولو أن تلقى أخاك بوجهٍ طلْق',
    source: 'صحيح مسلم — ٢٦٢٦',
    note: 'لا تستصغر أي معروف، ولو كان لقاء أخيك بوجه طلق بشوش.',
  },
  {
    id: 'muslim-223',
    excerpt: true,
    text: 'الطُّهور شطر الإيمان',
    source: 'صحيح مسلم — ٢٢٣',
    note: 'الطُّهور شطر الإيمان، وتتمة الحديث في الحمد والتسبيح والصلاة والصدقة والصبر والقرآن.',
  },
  {
    id: 'bukhari-69',
    text: 'يسّروا ولا تعسّروا، وبشّروا ولا تنفّروا',
    source: 'صحيح البخاري — ٦٩',
    note: 'أصل الدعوة والتعليم: التيسير والبشارة لا التثقيل والنفور.',
  },
  {
    id: 'bukhari-6018',
    excerpt: true,
    text: 'من كان يؤمن بالله واليوم الآخر فليقل خيرًا أو ليصمت',
    source: 'صحيح البخاري — ٦٠١٨',
    note: 'حفظ اللسان علامة إيمانٍ صادق، فقل خيرًا أو اسكت.',
  },
  {
    id: 'muslim-2578',
    excerpt: true,
    text: 'اتقوا الظلم فإنّ الظلم ظلماتٌ يوم القيامة',
    source: 'صحيح مسلم — ٢٥٧٨',
    note: 'الظلم ظلمات يوم القيامة على صاحبه، فاحذر ظلم الناس مهما بلغت قوتك.',
  },
  {
    id: 'tirmidhi-3895',
    excerpt: true,
    text: 'خيرُكم خيرُكم لأهله، وأنا خيرُكم لأهلي',
    source: 'سنن الترمذي — ٣٨٩٥',
    note: 'خير الرجال من أحسن إلى أهله، فالبيت أول ميدان للإحسان.',
  },
  {
    id: 'tirmidhi-1987',
    text: 'اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن',
    source: 'سنن الترمذي — ١٩٨٧',
    note: 'وصية جامعة: تقوى الله في السر والعلن، والعود إلى الله بعد الزلل، ومعاملة الناس بالحسنى.',
  },
  {
    id: 'muslim-91',
    excerpt: true,
    text: 'إن الله جميل يحب الجمال',
    source: 'صحيح مسلم — ٩١',
    note: 'لا بأس أن يحب المرء حسن ثوبه ونعله، فالله جميل يحب الجمال، أما الكبر فهو رد الحق واحتقار الناس.',
  },
  {
    id: 'bukhari-6116',
    text: 'لا تغضب',
    source: 'صحيح البخاري — ٦١١٦',
    note: 'وصية نبوية موجزة: «لا تغضب»، وقد كررها النبي ﷺ لمن طلب الوصية.',
  },
  {
    id: 'bukhari-5027',
    text: 'خيركم من تعلم القرآن وعلمه',
    source: 'صحيح البخاري — ٥٠٢٧',
    note: 'خير الناس من تعلم القرآن وعلّمه غيره.',
  },
  {
    id: 'abudawud-4811',
    text: 'لا يشكر اللهَ من لا يشكر الناس',
    source: 'سنن أبي داود — ٤٨١١',
    note: 'شكر الناس على معروفهم من خلق المؤمن، وقد ربطه الحديث بشكر الله.',
  },
  {
    id: 'muslim-783',
    text: 'أحبّ الأعمال إلى الله تعالى أدومُها وإن قلّ',
    source: 'صحيح مسلم — ٧٨٣',
    note: 'الاستمرار على العمل القليل أحب إلى الله، فاختر عملًا تقدر على مداومته.',
  },
  {
    id: 'tirmidhi-1956',
    excerpt: true,
    text: 'تبسمك في وجه أخيك لك صدقة',
    source: 'سنن الترمذي — ١٩٥٦',
    note: 'ابتسامتك في وجه أخيك صدقة، وتتمة الحديث تعد أبوابًا أخرى من الصدقة كالأمر بالمعروف وإرشاد الضال وإماطة الأذى.',
  },
  {
    id: 'bukhari-2989',
    excerpt: true,
    text: 'الكلمة الطيبة صدقة',
    source: 'صحيح البخاري — ٢٩٨٩',
    note: 'الكلمة الطيبة صدقة لا تكلف مالًا، وهي من أبواب الصدقة التي ذكرها الحديث.',
  },
]

export type ApiEdition = {
  key: string
  edition: string
  name: string
  blurb: string
}

// Small Arabic editions from the open hadith-api dataset (fawazahmed0/hadith-api, CC0-like open data).
// The three editions are bundled in public/data/hadith, so they work offline;
// jsDelivr is only a fallback if a bundled file cannot be read.
export const API_EDITIONS: ApiEdition[] = [
  {
    key: 'nawawi',
    edition: 'ara-nawawi',
    name: 'الأربعون النووية',
    blurb: 'اثنان وأربعون حديثًا جمعها الإمام النووي، تدور على أصول الدين والأخلاق.',
  },
  {
    key: 'qudsi',
    edition: 'ara-qudsi',
    name: 'الأربعون القدسية',
    blurb: 'أربعون حديثًا قدسيًّا يُروى فيها عن الله تعالى بمعناه.',
  },
  {
    key: 'dehlawi',
    edition: 'ara-dehlawi',
    name: 'أربعون حديثًا لشاه ولي الله',
    blurb: 'أربعون حديثًا مختارة من جامعها شاه ولي الله الدهلوي.',
  },
]

export const HADITH_API_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'
// The extra hadith editions are bundled with the app (public/data/hadith) so
// they open instantly and work fully offline; the CDN stays as a fallback.
const HADITH_LOCAL_BASE = '/data/hadith'

export type ApiHadith = { hadithnumber: string | number; text: string }
export type ApiEditionData = { hadiths: ApiHadith[] }
/** Where the loaded edition actually came from: the file bundled in the app, or the CDN fallback. */
export type EditionOrigin = 'bundled' | 'network'
export type LoadedEdition = ApiEditionData & { origin: EditionOrigin }

const editionCache = new Map<string, LoadedEdition>()
const EDITION_CACHE_VERSION = 2
const EDITION_STORAGE_PREFIX = 'hadith-edition:'

/** Apply the reviewed mechanical fixes equally to bundled, CDN and cached data. */
function prepareEdition(edition: string, value: unknown, origin: EditionOrigin): LoadedEdition | null {
  if (!value || typeof value !== 'object' || !('hadiths' in value) || !Array.isArray(value.hadiths) || !value.hadiths.length) return null
  const seen = new Set<string>()
  const hadiths: ApiHadith[] = []
  for (const entry of value.hadiths) {
    if (!entry || typeof entry !== 'object' || !['string', 'number'].includes(typeof entry.hadithnumber) || typeof entry.text !== 'string' || !entry.text.trim()) return null
    const number = String(entry.hadithnumber)
    if (!/^\d+$/.test(number) || Number(number) < 1 || seen.has(number)) return null
    seen.add(number)
    let text = entry.text
    if (edition === 'ara-dehlawi') text = convertDehlawiOrthography(text)
    if (edition === 'ara-nawawi') text = text.replace(/[\u202b\u202c]/g, '')
    hadiths.push({ hadithnumber: entry.hadithnumber, text })
  }
  return { hadiths, origin }
}

export function clearEditionCache() {
  editionCache.clear()
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(EDITION_STORAGE_PREFIX)) sessionStorage.removeItem(key)
    }
  } catch {
    // Storage can be disabled; the in-memory cache was still cleared.
  }
}

export async function loadApiEdition(edition: string): Promise<LoadedEdition> {
  const cached = editionCache.get(edition)
  if (cached) return cached
  const storageKey = `${EDITION_STORAGE_PREFIX}v${EDITION_CACHE_VERSION}:${edition}`
  try {
    // Retire this edition's legacy cache without touching unrelated session state.
    sessionStorage.removeItem(`${EDITION_STORAGE_PREFIX}${edition}`)
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as LoadedEdition
      if (parsed.origin === 'bundled' || parsed.origin === 'network') {
        const prepared = prepareEdition(edition, parsed, parsed.origin)
        if (prepared) {
          editionCache.set(edition, prepared)
          return prepared
        }
      }
      sessionStorage.removeItem(storageKey)
    }
  } catch {
    // sessionStorage unavailable; fall through to loading
  }
  const sources: { url: string; origin: EditionOrigin; timeout: number }[] = [
    { url: `${HADITH_LOCAL_BASE}/${edition}.min.json`, origin: 'bundled', timeout: 8_000 },
    { url: `${HADITH_API_BASE}/${edition}.min.json`, origin: 'network', timeout: 15_000 },
  ]
  let data: LoadedEdition | null = null
  for (const source of sources) {
    try {
      const response = await fetchWithTimeout(source.url, source.timeout)
      if (!response.ok) continue
      data = prepareEdition(edition, await response.json(), source.origin)
      if (data) break
    } catch {
      // try the next source
    }
  }
  if (!data) throw new Error('تعذّر تحميل هذا القسم: الملف المضمّن في التطبيق لم يُقرأ والشبكة غير متاحة.')
  editionCache.set(edition, data)
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(data))
  } catch {
    // quota or private mode; memory cache still works
  }
  return data
}
