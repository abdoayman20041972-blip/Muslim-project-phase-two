import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { formatCountdown, formatPrayerTime, reminderLeadText, pickNextPrayer } from '../../src/app/features/prayer/prayerTimes'
import { PrayerTimesView } from '../../src/app/features/prayer/PrayerTimesView'
const timings={Fajr:'04:10',Sunrise:'05:35',Dhuhr:'12:00',Asr:'15:30',Maghrib:'18:20',Isha:'19:45'}
function mockFetch(data=timings){
 const day=new Date().getDate()
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({data:{[String(day)]:{date:{gregorian:{day}},timings:data}}})}))
}
describe('PrayerTimesView',()=>{
 beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();vi.stubGlobal('Notification',{permission:'default',requestPermission:vi.fn().mockResolvedValue('granted')})})
 it('asks for location when no saved coordinates exist',()=>{render(<PrayerTimesView onBack={vi.fn()}/>);expect(screen.getByText('تحديد موقعي')).toBeTruthy()})
 it('shows a permission-specific location error and offers retry',async()=>{vi.stubGlobal('navigator',{geolocation:{getCurrentPosition:(_ok:any,fail:any)=>fail({code:1})}});render(<PrayerTimesView onBack={vi.fn()}/>);fireEvent.click(screen.getByText('تحديد موقعي'));await waitFor(()=>expect(screen.getByText(/تم رفض إذن الموقع/)).toBeTruthy());expect(screen.getByText('اختر مدينة')).toBeTruthy()})
 it('loads coordinates and prayer timings from the shared monthly endpoint',async()=>{localStorage.setItem('azkar_coords',JSON.stringify({lat:30.46,lng:31.18}));mockFetch();render(<PrayerTimesView onBack={vi.fn()}/>);await waitFor(()=>expect(screen.getAllByText('الفجر').length).toBeGreaterThan(0));expect(fetch).toHaveBeenCalled();expect(String((fetch as any).mock.calls[0][0])).toContain('/calendar/')})
 it('rejects incomplete API responses',async()=>{localStorage.setItem('azkar_coords',JSON.stringify({lat:30.46,lng:31.18}));mockFetch({Fajr:'bad',Sunrise:'05:35',Dhuhr:'12:00',Asr:'15:30',Maghrib:'18:20',Isha:'19:45'});render(<PrayerTimesView onBack={vi.fn()}/>);await waitFor(()=>expect(screen.getByText(/تعذر الحصول على مواقيت الصلاة/)).toBeTruthy())})
 it('passes the selected calculation method and school into the monthly request and cache key',async()=>{localStorage.setItem('azkar_coords',JSON.stringify({lat:30.46,lng:31.18}));localStorage.setItem('azkar_prayer_calc_method','1');localStorage.setItem('azkar_asr_school','1');mockFetch();render(<PrayerTimesView onBack={vi.fn()}/>);await waitFor(()=>expect(fetch).toHaveBeenCalled());const url=String((fetch as any).mock.calls[0][0]);expect(url).toContain('method=1');expect(url).toContain('school=1');expect(Object.keys(localStorage).some(k=>k.includes('azkar_pt_v2_')&&k.includes('_m1_s1'))).toBe(true)})
})

describe('Next prayer selection',()=>{
  const t={Fajr:'04:10',Sunrise:'05:35',Dhuhr:'12:00',Asr:'15:30',Maghrib:'18:20',Isha:'19:45'}
  beforeEach(()=>vi.useFakeTimers())
  afterEach(()=>vi.useRealTimers())
  it('keeps Dhuhr at 11:59:59 and moves to Asr after two seconds',()=>{
    const d=new Date(2026,8,19,11,59,59)
    expect(pickNextPrayer(t,d,null)?.key).toBe('Dhuhr')
    const d2=new Date(d.getTime()+2000)
    expect(pickNextPrayer(t,d2,null)?.key).toBe('Asr')
  })
  it('uses tomorrow Fajr after Isha',()=>{
    const d=new Date(2026,8,19,20,0,0)
    const next=pickNextPrayer(t,d,'04:10')
    expect(next?.key).toBe('Fajr')
    expect(next?.tomorrow).toBe(true)
  })
  it('moves to the following prayer when times are exactly equal',()=>{
    const d=new Date(2026,8,19,12,0,0)
    expect(pickNextPrayer(t,d,null)?.key).toBe('Asr')
  })
})

describe('Prayer number formatting',()=>{
  beforeEach(()=>{localStorage.clear()})
  it('respects the western number setting for countdown and prayer time',()=>{
    localStorage.setItem('azkar_number_style','western')
    expect(formatCountdown(3661000)).toBe('01:01:01')
    expect(formatPrayerTime('05:07')).not.toMatch(/[٠-٩]/)
    expect(reminderLeadText(5)).toBe('بعد 5 دقائق')
  })
  it('uses Arabic-Indic digits by default',()=>{
    localStorage.setItem('azkar_number_style','arabic')
    expect(formatCountdown(3661000)).toBe('٠١:٠١:٠١')
    expect(formatPrayerTime('05:07')).toMatch(/[٠-٩]/)
    expect(reminderLeadText(5)).toBe('بعد ٥ دقائق')
  })
})
