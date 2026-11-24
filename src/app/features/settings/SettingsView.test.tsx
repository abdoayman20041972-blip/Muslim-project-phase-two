import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { SettingsView, type SettingsEntry } from './SettingsView'
import { ConfirmDialogProvider } from '../../components/confirm-dialog'

function ui(entry: SettingsEntry | null) {
  return (
    <ConfirmDialogProvider>
      <SettingsView darkMode={false} appearance="light" onAppearance={() => {}} onBack={() => {}} entry={entry} />
    </ConfirmDialogProvider>
  )
}

describe('SettingsView entry deep link', () => {
  it('opens on the main category grid without an entry request', () => {
    const { getByText } = render(ui(null))
    getByText('كل التفضيلات في مكان واحد')
  })

  it('opens directly on the device section (location) when requested', () => {
    const { getAllByText, getByText, queryByText } = render(ui({ category: 'device', at: 1 }))
    // Page header and section card both carry the section name.
    expect(getAllByText('الأذونات والجهاز').length).toBeGreaterThan(0)
    // The location row of the device/permissions section.
    getByText('الموقع')
    expect(queryByText('كل التفضيلات في مكان واحد')).toBeNull()
  })

  it('re-enters the requested section on a fresh entry request', () => {
    const first = render(ui({ category: 'device', at: 1 }))
    first.getByText('الموقع')

    // The user backs out to the settings grid...
    fireEvent.click(first.getByText('‹'))
    first.getByText('كل التفضيلات في مكان واحد')

    // ...then a new entry request (same section, new nonce) lands there again.
    first.rerender(ui({ category: 'device', at: 2 }))
    first.getByText('الموقع')
    expect(first.queryByText('كل التفضيلات في مكان واحد')).toBeNull()
  })

  it('keeps notification permission in the notifications section, not the device section', () => {
    const device = render(ui({ category: 'device', at: 1 }))
    expect(device.queryByText('إشعارات التطبيق')).toBeNull()
    device.getByText('الموقع')
    device.unmount()
    const notifications = render(ui({ category: 'notifications', at: 1 }))
    notifications.getByText('السماح بالإشعارات')
  })
})

describe('SettingsView main grid grouping', () => {
  it('shows six fixed groups with every category exactly once', () => {
    const { container } = render(ui(null))
    const groups = Array.from(container.querySelectorAll('section[aria-label]'))
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual([
      'المظهر', 'الصلاة والإشعارات', 'القرآن والحديث والقصص', 'الأذكار والسبحة', 'البيانات والخصوصية', 'حول',
    ])
    const tiles = groups.map((g) => Array.from(g.querySelectorAll('button b')).map((b) => b.textContent))
    expect(tiles).toEqual([
      ['عام'],
      ['الصلاة', 'الإشعارات', 'الأذونات والجهاز'],
      ['المصحف', 'الأحاديث', 'قصص الأنبياء'],
      ['الأذكار', 'السبحة', 'التحفيز'],
      ['الخصوصية والبيانات'],
      ['حول مسلم'],
    ])
  })

  it('every tile still opens its own section', () => {
    const names = ['عام', 'الصلاة', 'الإشعارات', 'الأذونات والجهاز', 'المصحف', 'الأحاديث', 'قصص الأنبياء', 'الأذكار', 'السبحة', 'التحفيز', 'الخصوصية والبيانات', 'حول مسلم']
    for (const n of names) {
      const r = render(ui(null))
      fireEvent.click(r.getByText(n, { selector: 'b' }).closest('button')!)
      expect(r.queryByText('كل التفضيلات في مكان واحد')).toBeNull()
      expect(r.getAllByText(n).length).toBeGreaterThan(0)
      r.unmount()
    }
  })
})
