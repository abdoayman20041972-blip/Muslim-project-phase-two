import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { HomeView } from '../../src/app/features/home/HomeView'
import { AZKAR_PROGRESS_KEY, todayKey } from '../../src/app/features/azkar/azkarProgress'
import { azkarCategories } from '../../src/azkar-data'
import { withStableIds } from '../../src/app/features/azkar/useAzkarCatalog'
import { favoriteKey } from '../../src/app/features/azkar/useFavorites'
import { PRAYER_PHOTOS } from '../../src/app/features/home/prayerPhotos'

const noop = () => {}
const props = { onOpenPrayer: noop, onOpenMushaf: noop, onOpenAzkar: noop, onOpenTasbih: noop, onContinueReading: noop }

describe('home progress cards use live data', () => {
  beforeEach(() => localStorage.clear())
  it('shows the real completed count for morning azkar from today\'s stored progress', async () => {
    const morning = withStableIds(azkarCategories).find((c) => c.id === 'morning')!
    const first = morning.items[0]
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: { [todayKey()]: { [favoriteKey(morning, first)]: 999 } } }))
    render(<HomeView {...props} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /أذكار الصباح: ١ من / })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'أذكار المساء: لم تبدأ' })).toBeTruthy()
  })
  it('has a licensed credit for every prayer photo', () => {
    for (const photo of Object.values(PRAYER_PHOTOS)) {
      expect(photo.artist && photo.license && photo.licenseUrl && photo.sourceUrl).toBeTruthy()
    }
    expect(Object.keys(PRAYER_PHOTOS)).toEqual(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'])
  })
})
