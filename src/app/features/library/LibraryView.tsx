import { useState } from 'react'
import { ArrowRight, BookOpen, PlayCircle } from 'lucide-react'
import { LessonsView } from './LessonsView'
import { PdfBookReader } from './PdfBookReader'
import { SCANNED_BOOKS } from './scannedBooks'
import { BookCover } from './BookCover'
import { BookViewer } from './BookViewer'
import { LIBRARY_BOOKS, SHELVES, type LibraryBook } from './libraryData'

type Props = { onBack: () => void }

export function LibraryView({ onBack }: Props) {
  const [open, setOpen] = useState<LibraryBook | null>(null)
  const [lessons, setLessons] = useState(false)
  const [scan, setScan] = useState<(typeof SCANNED_BOOKS)[number] | null>(null)

  if (scan) return (
    <div className="w-full min-w-0">
      <button type="button" onClick={() => setScan(null)} className="u-pressable mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.875rem] font-bold text-azkar-teal-ink"><ArrowRight className="h-4 w-4" />المكتبة</button>
      <PdfBookReader title={scan.title} pdfUrl={scan.pdfUrl} credit={scan.credit} />
    </div>
  )
  if (lessons) return <LessonsView onBack={() => setLessons(false)} />
  if (open) return <BookViewer book={open} onClose={() => setOpen(null)} />

  return (
    <div className="library-view w-full min-w-0" data-testid="library-view">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="رجوع" className="u-pressable home-v4-round"><ArrowRight className="h-5 w-5" /></button>
        <h1 className="font-amiri text-[1.75rem] font-bold text-azkar-teal-ink">المكتبة</h1>
      </div>
      {SHELVES.map((shelf) => (
        <section key={shelf.id} className="mt-6">
          <div className="font-amiri text-[1.25rem] font-bold text-azkar-teal-ink">{shelf.label}</div>
          <div className="text-[0.75rem] font-semibold text-azkar-ink-soft">{shelf.hint}</div>
          <div className="library-shelf mt-3">
            {LIBRARY_BOOKS.filter((b) => b.shelf === shelf.id).map((book) => (
              <button key={book.id} type="button" onClick={() => book.status === 'ready' && setOpen(book)} disabled={book.status !== 'ready'} aria-label={`${book.title}، ${book.author}`} className="u-pressable library-book">
                <BookCover book={book} />
                <span className="library-book-meta">{book.status === 'ready' ? `${book.author} ${book.died}` : 'قريبًا'}</span>
              </button>
            ))}
          </div>
          {shelf.id === 'companions' && SCANNED_BOOKS.map((b) => (
        <button key={b.id} type="button" onClick={() => setScan(b)} data-testid={`scan-${b.id}`} className="u-pressable mt-3 flex w-full items-center gap-3 rounded-2xl border border-azkar-hairline bg-azkar-card px-4 py-3 text-right">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-azkar-teal-tint text-azkar-teal-ink" aria-hidden="true"><BookOpen className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-amiri text-[1.1875rem] font-bold text-azkar-teal-ink">{b.title}</span>
            <span className="block text-[0.75rem] font-semibold text-azkar-ink-soft">{b.hint}</span>
          </span>
        </button>
          ))}
        </section>
      ))}
      <button type="button" onClick={() => setLessons(true)} data-testid="lessons-entry" className="u-pressable mt-7 flex w-full items-center gap-3 rounded-2xl border border-azkar-hairline bg-azkar-card px-4 py-3 text-right">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-azkar-teal-tint text-azkar-teal-ink" aria-hidden="true"><PlayCircle className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-amiri text-[1.1875rem] font-bold text-azkar-teal-ink">دروس السيرة</span>
          <span className="block text-[0.75rem] font-semibold text-azkar-ink-soft">د. طارق السويدان، ٢٤ حلقة على يوتيوب</span>
        </span>
      </button>
    </div>
  )
}
