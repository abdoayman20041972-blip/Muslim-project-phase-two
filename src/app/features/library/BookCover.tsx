import type { LibraryBook } from './libraryData'

/** A drawn book cover: spine shadow on the right (the Arabic book's spine), gold frame, title and author. */
export function BookCover({ book, className = '' }: { book: Pick<LibraryBook, 'title' | 'author' | 'cover'>; className?: string }) {
  return (
    <span className={`book-cover ${className}`} style={{ ['--cover-from' as string]: book.cover.from, ['--cover-to' as string]: book.cover.to, ['--cover-ink' as string]: book.cover.ink }} aria-hidden="true">
      <span className="book-cover-frame">
        <span className="book-cover-ornament">❖</span>
        <span className="book-cover-title">{book.title}</span>
        <span className="book-cover-author">{book.author}</span>
      </span>
    </span>
  )
}
