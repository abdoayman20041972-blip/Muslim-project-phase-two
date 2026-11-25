export type ShelfId = 'seerah' | 'companions' | 'history'
export type LibraryBook = {
  id: string
  shelf: ShelfId
  title: string
  author: string
  died: string
  edition: string
  sourceUrl: string
  /** 'ready' books have their text in public/books/<id>.json; 'planned' ones are shown as coming soon. */
  status: 'ready' | 'planned'
  cover: { from: string; to: string; ink: string }
}

/**
 * Real classical books that exist as transcribed text on Arabic Wikisource. Every book here must have its full
 * text checked before it is offered to read; this list is the plan, not a promise that a book is complete.
 */
export const LIBRARY_BOOKS: LibraryBook[] = [
  { id: 'bidaya-seerah', status: 'ready', shelf: 'seerah', title: 'كتاب سيرة رسول الله ﷺ', author: 'ابن كثير', died: 'ت ٧٧٤ هـ', edition: 'البداية والنهاية، ط. السعادة ١٣٥١ هـ', sourceUrl: 'https://ar.wikisource.org/wiki/البداية_والنهاية_(ط._السعادة)', cover: { from: '#1f5a46', to: '#0f3328', ink: '#f3dc9a' } },
  { id: 'siyar-companions', status: 'planned', shelf: 'companions', title: 'سير أعلام النبلاء: الصحابة', author: 'الذهبي', died: 'ت ٧٤٨ هـ', edition: 'ويكي مصدر', sourceUrl: 'https://ar.wikisource.org/wiki/سير_أعلام_النبلاء', cover: { from: '#7a4b22', to: '#43260d', ink: '#f6e3b8' } },
  { id: 'bidaya-history', status: 'ready', shelf: 'history', title: 'تاريخ الإسلام الأول', author: 'ابن كثير', died: 'ت ٧٧٤ هـ', edition: 'البداية والنهاية، ط. السعادة ١٣٥١ هـ، القرن الأول الهجري فقط', sourceUrl: 'https://ar.wikisource.org/wiki/البداية_والنهاية_(ط._السعادة)', cover: { from: '#6b2b3a', to: '#3b1220', ink: '#f6dfe3' } },
]

export const SHELVES: { id: ShelfId; label: string; hint: string }[] = [
  { id: 'seerah', label: 'السيرة النبوية', hint: 'كتب تقرأها صفحة صفحة' },
  { id: 'companions', label: 'الصحابة', hint: 'تراجمهم وأخبارهم من أمهات الكتب' },
  { id: 'history', label: 'التاريخ الإسلامي', hint: 'من الخلافة الراشدة وما بعدها' },
]
