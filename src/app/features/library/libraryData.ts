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
  { id: 'bidaya-prophets', status: 'ready', shelf: 'seerah', title: 'المبتدأ وقصص الأنبياء', author: 'ابن كثير', died: 'ت ٧٧٤ هـ', edition: 'البداية والنهاية، الجزء الأول ط. كردستان ١٣٤٨ هـ، والثاني ط. السعادة ١٣٥١ هـ (قبل السيرة)', sourceUrl: 'https://ar.wikisource.org/wiki/البداية_والنهاية_(ط._السعادة)', cover: { from: '#2c4f7a', to: '#16293f', ink: '#e8f0fb' } },
  { id: 'bidaya-seerah', status: 'ready', shelf: 'seerah', title: 'كتاب سيرة رسول الله ﷺ', author: 'ابن كثير', died: 'ت ٧٧٤ هـ', edition: 'البداية والنهاية، ط. السعادة ١٣٥١ هـ', sourceUrl: 'https://ar.wikisource.org/wiki/البداية_والنهاية_(ط._السعادة)', cover: { from: '#1f5a46', to: '#0f3328', ink: '#f3dc9a' } },
  { id: 'siyar-nubala', status: 'ready', shelf: 'companions', title: 'سير أعلام النبلاء', author: 'الذهبي', died: 'ت ٧٤٨ هـ', edition: 'الأجزاء ١–١٠ فقط، نص ويكي مصدر (الطبعة غير مذكورة)', sourceUrl: 'https://ar.wikisource.org/wiki/سير_أعلام_النبلاء', cover: { from: '#7a4b22', to: '#43260d', ink: '#f6e3b8' } },
  { id: 'bidaya-history', status: 'ready', shelf: 'history', title: 'تاريخ الإسلام الأول', author: 'ابن كثير', died: 'ت ٧٧٤ هـ', edition: 'البداية والنهاية، ط. السعادة ١٣٥١ هـ، القرن الأول الهجري فقط', sourceUrl: 'https://ar.wikisource.org/wiki/البداية_والنهاية_(ط._السعادة)', cover: { from: '#6b2b3a', to: '#3b1220', ink: '#f6dfe3' } },
]

export const SHELVES: { id: ShelfId; label: string; hint: string }[] = [
  { id: 'seerah', label: 'السيرة النبوية', hint: 'كتب تقرأها صفحة صفحة' },
  { id: 'companions', label: 'التراجم والأعلام', hint: 'تراجم الصحابة ومن بعدهم' },
  { id: 'history', label: 'التاريخ الإسلامي', hint: 'من الخلافة الراشدة وما بعدها' },
]
