import { describe, expect, it } from 'vitest'
import { notificationOpenTarget } from '../../src/app/App'

describe('notification routing', () => {
  it('maps supported open targets to app views', () => {
    expect(notificationOpenTarget('prayer')).toEqual({ name: 'prayer-times' })
    expect(notificationOpenTarget('azkar')).toEqual({ name: 'azkar-list' })
    expect(notificationOpenTarget('ayah')).toEqual({ name: 'mushaf-list' })
  })

  it('ignores missing or unknown open targets', () => {
    expect(notificationOpenTarget(null)).toBeNull()
    expect(notificationOpenTarget('home')).toBeNull()
  })
})
