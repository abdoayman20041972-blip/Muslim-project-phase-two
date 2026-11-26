import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { setMoreSubBackHandler } from '../home/moreNav'
import { ScreenHeader } from '../library/ScreenHeader'
import { ESSENTIALS_CHAPTERS } from './essentialsData'
import { shippableChapters } from './essentialsGate'
import { installPreinstalledPack } from './essentialsPreinstall'
import { PACK_MAX_BYTES, clearPack, loadPack, parsePack, rejectedLine, savePack } from './essentialsPack'
import { SECTION_LABELS, SECTION_ORDER, type Chapter } from './essentialsTypes'

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
  const open = ready.find((c) => c.id === openId)
  if (open) return <EssentialsChapter chapter={open} onBack={() => setOpenId(null)} />

  return (
    <div className="library-view w-full min-w-0" data-testid="essentials-view">
      <ScreenHeader title="ما لا يسع المسلم جهله" subtitle="شرح مبسط لأساسيات الدين" onBack={onBack} />
      {GROUPS.map((group) => {
        const list = ready.filter((c) => c.audience === group.id)
        if (list.length === 0) return null
        return (
          <section key={group.id} className="lib-shelf">
            <h2 className="lib-shelf-title">{group.label}</h2>
            <p className="lib-shelf-hint">{group.hint}</p>
            <div className="lib-cards">
              {list.map((c) => (
                <button key={c.id} type="button" onClick={() => setOpenId(c.id)} data-testid={`essentials-card-${c.id}`} className="lib-card u-pressable">
                  <span className="lib-card-text">
                    <span className="lib-card-title">{c.title}</span>
                    <span className="lib-card-meta">{c.summary}</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )
      })}
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

export function EssentialsChapter({ chapter, onBack }: { chapter: Chapter; onBack: () => void }) {
  return (
    <article className="library-view w-full min-w-0" data-testid="essentials-chapter">
      <ScreenHeader title={chapter.title} subtitle={chapter.audience === 'universal' ? 'يلزم كل مسلم' : 'حسب حالك'} onBack={onBack} />
      {SECTION_ORDER.map((kind) => {
        const body = chapter.sections[kind]
        if (!body) return null
        return (
          <section key={kind} className="ess-section" data-testid={`ess-section-${kind}`}>
            <h2 className="lib-shelf-title">{body.label ?? SECTION_LABELS[kind]}</h2>
            {body.paragraphs?.map((p, i) => <p key={i} className="ess-p">{p}</p>)}
            {body.items && (
              kind === 'steps'
                ? <ol className="ess-list">{body.items.map((t, i) => <li key={i}>{t}</li>)}</ol>
                : <ul className="ess-list ess-bullets">{body.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
            )}
          </section>
        )
      })}
      <section className="ess-section" data-testid="ess-sources">
        <h2 className="lib-shelf-title">المصادر</h2>
        <ul className="ess-list ess-bullets">{chapter.sources.map((s) => <li key={s.title}>{s.title}</li>)}</ul>
        {chapter.scholarReview ? <p className="lib-credit">راجعه: {chapter.scholarReview.reviewer}</p> : <p className="lib-note" data-testid="ess-unreviewed">لم يراجعه عالم بعد. اعتبره مادة للقراءة الأولية، وارجع لأهل العلم فيما يخصك.</p>}
        {chapter.held && chapter.held.length > 0 && (
          <div data-testid="ess-held">
            <h2 className="lib-shelf-title">مسائل تُركت لأهل العلم</h2>
            <ul className="ess-list ess-bullets">{chapter.held.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}
      </section>
    </article>
  )
}
