import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AboutSection, DATA_SOURCES } from '../../src/app/features/settings/sections/AboutSection'

describe('About screen data sources', () => {
  it('lists every data source with an https link and keeps the photo credits', () => {
    render(<AboutSection />)
    const list = screen.getByTestId('data-sources')
    expect(list.querySelectorAll('li')).toHaveLength(DATA_SOURCES.length)
    const hrefs = Array.from(list.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '')
    for (const host of ['alquran.cloud', 'tanzil.net', 'github.com/fawazahmed0/hadith-api', 'sunnah.com', 'hisnmuslim.com', 'mp3quran.net', 'qurango.net', 'islamic.network']) {
      expect(hrefs.some((h) => h.startsWith('https://') && h.includes(host)), host).toBe(true)
    }
    for (const a of Array.from(list.querySelectorAll('a'))) expect(a.getAttribute('rel')).toContain('noopener')
    expect(list.textContent).toContain('وهي تأخذ نصوصها من مصادر منها مشروع تنزيل')
    expect(screen.getByTestId('photo-credits').querySelectorAll('li').length).toBeGreaterThan(0)
  })
})
