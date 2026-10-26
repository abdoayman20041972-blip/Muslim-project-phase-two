// First Mushaf page of each juz (standard 604-page Madani Mushaf).
// Used only to label the page header; the real page map is never modified.
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462,
  482, 502, 522, 542, 562, 582,
]

export function juzForPage(page: number | null | undefined): number | null {
  if (page == null || !Number.isFinite(page) || page < 1 || page > 604) return null
  let juz = 1
  for (let i = 0; i < JUZ_START_PAGES.length; i += 1) {
    if (page >= JUZ_START_PAGES[i]) juz = i + 1
    else break
  }
  return juz
}
