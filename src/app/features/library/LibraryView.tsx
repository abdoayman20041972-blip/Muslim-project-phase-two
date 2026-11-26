import { useEffect, useState } from 'react'
import { ChevronLeft, PlayCircle } from 'lucide-react'
import { LessonsView } from './LessonsView'
import { BookCover } from './BookCover'
import { BookViewer } from './BookViewer'
import { ScreenHeader } from './ScreenHeader'
import { LIBRARY_BOOKS, SHELVES, type LibraryBook } from './libraryData'

type Props = { onBack: () => void }

export function LibraryView({ onBack }: Props) {
  const [open, setOpen] = useState<LibraryBook | null>(null)
  const [lessons, setLessons] = useState(false)

  // Sifat al-Safwa was removed from the app: drop any scanned-page cache an earlier version left on the device.
  useEffect(() => { try { void globalThis.caches?.delete('library-scans-v1') } catch { /* ignore */ } }, [])

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
