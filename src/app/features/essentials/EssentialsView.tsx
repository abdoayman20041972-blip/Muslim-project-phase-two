import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import { setMoreSubBackHandler } from '../home/moreNav'
import { ScreenHeader } from '../library/ScreenHeader'
import { ESSENTIALS_CHAPTERS } from './essentialsData'
import { shippableChapters } from './essentialsGate'
import { installPreinstalledPack } from './essentialsPreinstall'
import { PACK_MAX_BYTES, clearPack, loadPack, parsePack, rejectedLine, savePack } from './essentialsPack'
import { SECTION_LABELS, SECTION_ORDER, type Chapter, type SectionKind } from './essentialsTypes'
import { FONT_LEVELS, groupChapters, loadFontLevel, loadLast, loadRead, readMinutes, readingUnits, saveFontLevel, saveLast, saveRead } from './essentialsReading'

type Props = { onBack: () => void; chapters?: readonly Chapter[] }

const GROUPS: { id: Chapter['audience']; label: string; hint: string }[] = [
  { id: 'universal', label: 'يلزم كل مسلم', hint: 'أساسيات لا يُعذر المسلم بجهلها' },
  { id: 'situational', label: 'حسب حالك', hint: 'اقرأها حين تحتاجها: تجارة، زواج، سفر وغيرها' },
]

const PROBLEM_LIMIT = 3
/** Arabic count phrase for chapters: واحد، فصلان، فصول، فصلًا. */
export function chaptersWord(n: number): string {
  if (n === 1) return 'فصل واحد'
  if (n === 2) return 'فصلان'
  if (n >= 3 && n <= 10) return `${n} فصول`
  return `${n} فصلًا`
}

export function EssentialsView({ onBack, chapters = ESSENTIALS_CHAPTERS }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [pack, setPack] = useState<Chapter[]>(() => { installPreinstalledPack(); return loadPack() })
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [read, setRead] = useState<string[]>(() => loadRead())
  const [last, setLast] = useState<string | null>(() => loadLast())
  const fileRef = useRef<HTMLInputElement>(null)
  const ready = [...shippableChapters(chapters), ...pack.filter((p) => !chapters.some((c) => c.id === p.id))]

  useEffect(() => {
    if (!openId) return
    setMoreSubBackHandler(() => { setOpenId(null); return true })
    return () => setMoreSubBackHandler(null)
  }, [openId])

  async function onPick(file: File | undefined) {
    if (!file) return
    if (file.size > PACK_MAX_BYTES) { setMessage('الملف أكبر من الحد المسموح (٣ ميجا).'); return }
    const raw = await file.text()
    const r = parsePack(raw)
    if (r.error) { setMessage(r.error === 'too-large' ? 'الملف أكبر من الحد المسموح (٣ ميجا).' : 'الملف ليس حزمة محتوى صالحة.'); return }
    if (r.chapters.length === 0) { setMessage(`لم يُقبل أي فصل (${r.rejected.length}). الأسباب: ${r.rejected.slice(0, PROBLEM_LIMIT).map(rejectedLine).join('؛ ')}${r.rejected.length > PROBLEM_LIMIT ? ' وغيرها' : ''}.`); return }
    if (!savePack(raw)) { setMessage('تعذّر حفظ الحزمة على الجهاز.'); return }
    setPack(r.chapters)
    setMessage(r.rejected.length ? `تم استيراد ${chaptersWord(r.chapters.length)}، ورُفض ${r.rejected.length} لعدم اكتمال شروطه.` : `تم استيراد ${chaptersWord(r.chapters.length)}.`)
  }
  const index = ready.findIndex((c) => c.id === openId)
  function openChapter(id: string) { setOpenId(id); setLast(id); saveLast(id) }
  function toggleRead(id: string) {
    const next = read.includes(id) ? read.filter((x) => x !== id) : [...read, id]
    setRead(next); saveRead(next)
  }
  if (index >= 0) {
    const c = ready[index]
    return (
      <EssentialsChapter
        key={c.id}
        chapter={c}
        onBack={() => setOpenId(null)}
        position={{ index: index + 1, total: ready.length }}
        isRead={read.includes(c.id)}
        onToggleRead={() => toggleRead(c.id)}
        prev={index > 0 ? ready[index - 1] : undefined}
        next={index < ready.length - 1 ? ready[index + 1] : undefined}
        onNavigate={openChapter}
      />
    )
  }

  const q = query.trim()
  const shown = q ? ready.filter((c) => (c.title + ' ' + c.summary).includes(q)) : ready
  const groups = groupChapters(shown, GROUPS)
  const lastChapter = !q && last ? ready.find((c) => c.id === last) : undefined
  const readCount = ready.filter((c) => read.includes(c.id)).length

  return (
    <div className="library-view w-full min-w-0" data-testid="essentials-view">
      <ScreenHeader title="ما لا يسع المسلم جهله" subtitle="شرح مبسط لأساسيات الدين" onBack={onBack} />
      {ready.length > 0 && (
        <>
          <div className="ess-search">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في الفصول" aria-label="ابحث في الفصول" data-testid="essentials-search" className="ess-search-input" />
            <span className="ess-count" data-testid="essentials-progress">{`${chaptersWord(ready.length)}${readCount > 0 ? ` · قرأت ${readCount}` : ''}`}</span>
          </div>
          {lastChapter && (
            <button type="button" className="ess-resume u-pressable" data-testid="essentials-resume" onClick={() => openChapter(lastChapter.id)}>
              <span className="ess-resume-label">تابع من حيث وقفت</span>
              <span className="ess-resume-title">{lastChapter.title}</span>
            </button>
          )}
        </>
      )}
      {groups.map((group) => (
        <section key={group.key} className="lib-shelf ess-group" data-testid={`essentials-group-${group.key}`}>
          <h2 className="lib-shelf-title">{group.label}<span className="ess-group-count">{group.chapters.length}</span></h2>
          {group.hint && <p className="lib-shelf-hint">{group.hint}</p>}
          <div className="lib-cards">
            {group.chapters.map((c) => (
              <button key={c.id} type="button" onClick={() => openChapter(c.id)} data-testid={`essentials-card-${c.id}`} className="lib-card u-pressable ess-card">
                <span className="lib-card-text">
                  <span className="lib-card-title">{c.title}</span>
                  <span className="lib-card-meta">{c.summary}</span>
                  <span className="ess-card-foot">{`${readMinutes(c)} د قراءة`}</span>
                </span>
                {read.includes(c.id)
                  ? <Check className="h-4 w-4 shrink-0 ess-read-mark" aria-label="تمت قراءته" />
                  : <ChevronLeft className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>
      ))}
      {q && groups.length === 0 && <p className="lib-note" data-testid="essentials-no-match">لا فصل يطابق «{q}».</p>}
      {ready.length === 0 && <p className="lib-note" data-testid="essentials-empty">لا توجد فصول بعد. يمكنك استيراد حزمة محتوى من ملف على جهازك، وتبقى على الجهاز فقط.</p>}
      <div className="ess-actions">
        <button type="button" className="lib-card u-pressable" data-testid="essentials-import" onClick={() => fileRef.current?.click()}>
          <span className="lib-card-text"><span className="lib-card-title">استيراد حزمة محتوى</span><span className="lib-card-meta">ملف JSON من جهازك، لا يُرفع لأي مكان</span></span>
        </button>
        {pack.length > 0 && (
          <button type="button" className="lib-card u-pressable" data-testid="essentials-clear" onClick={() => { clearPack(); setPack([]); setMessage('تم حذف الحزمة من الجهاز.') }}>
            <span className="lib-card-text"><span className="lib-card-title">حذف الحزمة المستوردة</span></span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="application/json,.json" hidden data-testid="essentials-file" onChange={(e) => { void onPick(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {message && <p className="lib-note" dir="rtl" role="status" data-testid="essentials-message">{message}</p>}
      <p className="lib-credit">للمسائل الخاصة بحالتك اسأل أحد أهل العلم الموثوقين.</p>
    </div>
  )
}

type ChapterProps = {
  chapter: Chapter
  onBack: () => void
  position?: { index: number; total: number }
  isRead?: boolean
  onToggleRead?: () => void
  prev?: Chapter
  next?: Chapter
  onNavigate?: (id: string) => void
}

/** Items that open with a sunnah or recommended-act marker are shown as a separate note, never as a numbered duty. */
const NOTE_START = /^(سنن |سنة |يستحب|يسن|ومن السنن)/

function sectionTitle(chapter: Chapter, kind: SectionKind): string { return chapter.sections[kind]?.label ?? SECTION_LABELS[kind] }

function Units({ text }: { text: string }) {
  return (
    <>
      {readingUnits(text).map((u, i) => u.kind === 'text'
        ? <p key={i} className="ess-p">{u.text}</p>
        : <blockquote key={i} className={u.kind === 'ayah' ? 'ess-quote ess-ayah' : 'ess-quote ess-hadith'}>{u.text}</blockquote>)}
    </>
  )
}

export function EssentialsChapter({ chapter, onBack, position, isRead, onToggleRead, prev, next, onNavigate }: ChapterProps) {
  const [font, setFont] = useState<number>(() => loadFontLevel())
  const kinds = useMemo(() => SECTION_ORDER.filter((k) => chapter.sections[k]), [chapter])
  function jump(kind: SectionKind) {
    const el = typeof document !== 'undefined' ? document.getElementById(`ess-s-${kind}`) : null
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }
  function setLevel(v: number) { const n = Math.min(FONT_LEVELS.length - 1, Math.max(0, v)); setFont(n); saveFontLevel(n) }
  return (
    <article className="library-view ess-reader w-full min-w-0" data-testid="essentials-chapter" style={{ ['--ess-scale' as string]: String(FONT_LEVELS[font]) }}>
      <ScreenHeader title={chapter.title} subtitle={chapter.topic ?? (chapter.audience === 'universal' ? 'يلزم كل مسلم' : 'حسب حالك')} onBack={onBack} />
      <div className="ess-meta">
        <span data-testid="ess-readtime">{`${readMinutes(chapter)} د قراءة`}</span>
        {position && <span data-testid="ess-position">{`الفصل ${position.index} من ${position.total}`}</span>}
        <span className="ess-font" role="group" aria-label="حجم الخط">
          <button type="button" className="u-pressable" aria-label="تصغير الخط" disabled={font === 0} onClick={() => setLevel(font - 1)} data-testid="ess-font-down">أ-</button>
          <button type="button" className="u-pressable" aria-label="تكبير الخط" disabled={font === FONT_LEVELS.length - 1} onClick={() => setLevel(font + 1)} data-testid="ess-font-up">أ+</button>
        </span>
      </div>
      <p className="ess-lead" data-testid="ess-lead">{chapter.summary}</p>
      {kinds.length > 2 && (
        <nav className="ess-nav" aria-label="أقسام الفصل، مرّر أفقيًا لعرض بقية الأقسام" tabIndex={0} data-testid="ess-nav">
          {kinds.map((k) => <button key={k} type="button" className="ess-chip u-pressable" onClick={() => jump(k)}>{sectionTitle(chapter, k)}</button>)}
        </nav>
      )}
      {kinds.map((kind, n) => {
        const body = chapter.sections[kind]!
        return (
          <section key={kind} id={`ess-s-${kind}`} className={`ess-section ess-s-${kind}`} data-testid={`ess-section-${kind}`}>
            <h2 className="ess-h"><span className="ess-num">{n + 1}</span>{sectionTitle(chapter, kind)}</h2>
            {body.paragraphs?.map((p, i) => <Units key={i} text={p} />)}
            {body.items && (
              kind === 'steps'
                ? <ol className="ess-steps">{body.items.map((t, i) => NOTE_START.test(t)
                    ? <li key={i} className="ess-step-note" data-testid="ess-step-note"><span className="ess-note-tag">سنة</span><span>{t}</span></li>
                    : <li key={i}><span className="ess-step-n">{body.items!.slice(0, i).filter((x) => !NOTE_START.test(x)).length + 1}</span><span>{t}</span></li>)}</ol>
                : kind === 'review'
                  ? <ul className="ess-qs">{body.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  : <ul className="ess-list ess-bullets">{body.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
            )}
          </section>
        )
      })}
      {onToggleRead && (
        <button type="button" className={`ess-done u-pressable${isRead ? ' is-read' : ''}`} onClick={onToggleRead} data-testid="ess-done" aria-pressed={!!isRead}>
          {isRead ? 'تمت قراءته ✓' : 'علّمه كمقروء'}
        </button>
      )}
      {(prev || next) && onNavigate && (
        <div className="ess-pager" data-testid="ess-pager">
          {next ? <button type="button" className="ess-pager-btn u-pressable" onClick={() => onNavigate(next.id)} data-testid="ess-next"><span className="ess-pager-label">التالي</span><span className="ess-pager-title">{next.title}</span></button> : <span />}
          {prev ? <button type="button" className="ess-pager-btn u-pressable" onClick={() => onNavigate(prev.id)} data-testid="ess-prev"><span className="ess-pager-label">السابق</span><span className="ess-pager-title">{prev.title}</span></button> : <span />}
        </div>
      )}
      {chapter.held && chapter.held.length > 0 && (
        <aside className="ess-held" data-testid="ess-held">
          <h2 className="ess-held-h">تنبيهات لا تُهمل</h2>
          <ul className="ess-held-list">{chapter.held.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </aside>
      )}
      <footer className="ess-source" data-testid="ess-sources">
        <h2 className="ess-source-h">المصدر</h2>
        <ul className="ess-source-list">{chapter.sources.map((s) => <li key={s.title}>{s.title}</li>)}</ul>
        <p className="ess-source-note">الأحكام هنا كما ذكرها المصدر المنسوبة إليه، وقد يكون لأهل العلم أقوال أخرى في بعض المسائل.{chapter.scholarReview ? ` راجعه: ${chapter.scholarReview.reviewer}.` : ''}</p>
        {!chapter.scholarReview && <p className="ess-source-note" data-testid="ess-unreviewed">لم يراجعه عالم بعد.</p>}
      </footer>
    </article>
  )
}
