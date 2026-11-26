import { useState } from 'react'
import { toArabicNumber } from '../../constants'
import { ChevronLeft, PlayCircle } from 'lucide-react'
import { LessonsView } from './LessonsView'
import { PdfBookReader } from './PdfBookReader'
import { SCANNED_BOOKS } from './scannedBooks'
import { BookCover } from './BookCover'
import { BookViewer } from './BookViewer'
import { ScreenHeader } from './ScreenHeader'
import { LIBRARY_BOOKS, SHELVES, type LibraryBook } from './libraryData'

type Props = { onBack: () => void }

export function LibraryView({ onBack }: Props) {
  const [open, setOpen] = useState<LibraryBook | null>(null)
  const [lessons, setLessons] = useState(false)
  const [sifat, setSifat] = useState(false)
  const [scan, setScan] = useState<(typeof SCANNED_BOOKS)[number] | null>(null)

  if (scan) return (
    <div className="w-full min-w-0">
      <ScreenHeader title={`${scan.title} ${scan.vol}`} onBack={() => setScan(null)} backLabel="رجوع إلى المكتبة" />
      <PdfBookReader title={`${scan.title} ${scan.vol}`} pdfUrl={scan.pdfUrl} credit={scan.credit} />
    </div>
  )
  if (sifat) return (
    <div className="library-view w-full min-w-0" data-testid="sifat-volumes">
      <ScreenHeader title="صفة الصفوة" subtitle="ابن الجوزي ت ٥٩٧ هـ · نسخة مصورة" onBack={() => setSifat(false)} backLabel="رجوع إلى المكتبة" />
      <ul className="lib-list">
        {SCANNED_BOOKS.map((b, i) => (
          <li key={b.id}><button type="button" onClick={() => setScan(b)} data-testid={`scan-${b.id}`} className="lib-row lib-row-vol u-pressable"><span className="lib-row-n">{toArabicNumber(i + 1)}</span><span className="lib-row-t">{b.vol}</span><span className="lib-row-count">{toArabicNumber(b.pages)} صفحة</span><ChevronLeft className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" /></button></li>
        ))}
      </ul>
      <p role="note" data-testid="safwa-missing" className="lib-note">المتوفر في التطبيق: الجزءان الأول والثاني فقط. الكتاب في أربعة أجزاء في هذه الطبعة، والجزءان الثالث والرابع غير متوفرين حاليًا.</p>
    </div>
  )
  if (lessons) return <LessonsView onBack={() => setLessons(false)} />
  if (open) return <BookViewer book={open} onClose={() => setOpen(null)} />

  return (
    <div className="library-view w-full min-w-0" data-testid="library-view">
      <ScreenHeader title="المكتبة" subtitle="كتب تُقرأ داخل التطبيق" onBack={onBack} />
      {SHELVES.map((shelf) => (
        <section key={shelf.id} className="lib-shelf">
          <h2 className="lib-shelf-title">{shelf.label}</h2>
          <p className="lib-shelf-hint">{shelf.hint}</p>
          <div className="lib-cards">
            {LIBRARY_BOOKS.filter((b) => b.shelf === shelf.id).map((book) => (
              <button key={book.id} type="button" onClick={() => book.status === 'ready' && setOpen(book)} disabled={book.status !== 'ready'} aria-label={`${book.title}، ${book.author}`} className="lib-card u-pressable">
                {book.status === 'ready' && <span className="lib-dot lib-dot-local" role="img" aria-label="متاح دون إنترنت" />}
                <span className="lib-card-cover"><BookCover book={book} /></span>
                <span className="lib-card-text">
                  <span className="lib-card-title">{book.title}</span>
                  <span className="lib-card-meta">{book.author} {book.died}</span>
                  {book.status !== 'ready' && <span className="lib-card-tag">قريبًا</span>}
                </span>
                {book.status === 'ready' && <ChevronLeft className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" />}
              </button>
            ))}
            {shelf.id === 'companions' && (
              <button type="button" onClick={() => setSifat(true)} data-testid="scan-safwa" aria-label="صفة الصفوة، ابن الجوزي" className="lib-card u-pressable">
                <span className="lib-dot lib-dot-local" role="img" aria-label="متاح دون إنترنت" />
                <span className="lib-card-cover"><BookCover book={SCANNED_BOOKS[0]} /></span>
                <span className="lib-card-text">
                  <span className="lib-card-title">صفة الصفوة</span>
                  <span className="lib-card-meta">ابن الجوزي ت ٥٩٧ هـ</span>
                  <span className="lib-card-meta">نسخة مصورة، جزءان من أربعة</span>
                </span>
                <ChevronLeft className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      ))}
      <section className="lib-shelf">
        <h2 className="lib-shelf-title">دروس مرئية</h2>
        <p className="lib-shelf-hint">تفتح على يوتيوب، وتحتاج اتصالًا بالإنترنت</p>
        <div className="lib-cards">
          <button type="button" onClick={() => setLessons(true)} data-testid="lessons-entry" className="lib-card u-pressable">
            <span className="lib-dot lib-dot-net" role="img" aria-label="يحتاج إنترنت" />
            <span className="lib-card-icon" aria-hidden="true"><PlayCircle className="h-6 w-6" /></span>
            <span className="lib-card-text">
              <span className="lib-card-title">دروس السيرة</span>
              <span className="lib-card-meta">د. طارق السويدان، ٢٤ حلقة</span>
            </span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}
