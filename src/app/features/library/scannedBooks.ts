/**
 * Original printed pages of Ibn al-Jawzi's Sifat al-Safwa as scanned PDFs, bundled inside the app (public/books) so they
 * read with no connection. Source: the Wikisource file pages (each carries a public-domain tag; not independently verified):
 * https://ar.wikisource.org/wiki/%D9%85%D9%84%D9%81:%D8%B5%D9%81%D8%A9_%D8%A7%D9%84%D8%B5%D9%81%D9%88%D8%A91.pdf and ...%D8%A92.pdf
 */
const BASE = import.meta.env.BASE_URL
const CREDIT = 'ابن الجوزي ت ٥٩٧ هـ، صفة الصفوة، دائرة المعارف العثمانية، حيدر آباد. الصفحات مصورة من ويكي مصدر.'
export const SCANNED_BOOKS = [
  { id: 'safwa-vol1', title: 'صفة الصفوة',vol: 'الجزء الأول', author: 'ابن الجوزي', died: 'ت ٥٩٧ هـ', pages: 348, local: true, pdfUrl: `${BASE}books/sifat-safwa-1.pdf`, credit: `${CREDIT} الجزء الأول، ط ١٣٥٥ هـ.`, cover: { from: '#3d4a6b', to: '#1d2740', ink: '#f1e6c2' } },
  { id: 'safwa-vol2', title: 'صفة الصفوة',vol: 'الجزء الثاني', author: 'ابن الجوزي', died: 'ت ٥٩٧ هـ', pages: 316, local: true, pdfUrl: `${BASE}books/sifat-safwa-2.pdf`, credit: `${CREDIT} الجزء الثاني، ط ١٣٨٩ هـ عن ١٣٥٥ هـ.`, cover: { from: '#3d4a6b', to: '#1d2740', ink: '#f1e6c2' } },
] as const
