import { toArabicDigits } from '../../constants'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'

export const PRAYER_METHODS = ['1','2','3','4','5'] as const
export const PRAYER_SCHOOLS = ['0','1'] as const
export type PrayerMethod = typeof PRAYER_METHODS[number]
export type PrayerSchool = typeof PRAYER_SCHOOLS[number]
export type Coords = { lat:number; lng:number }
export type Timings = Record<string,string>
export const REQUIRED_TIMINGS = ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'] as const
export const PRAYER_LABELS = {Fajr:'الفجر',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'} as const

export function currentMethod():PrayerMethod{
  const v=readSetting(APP_SETTINGS_KEYS.prayerCalcMethod,'5')
  return (PRAYER_METHODS as readonly string[]).includes(v)?v as PrayerMethod:'5'
}
export function currentSchool():PrayerSchool{
  const v=readSetting(APP_SETTINGS_KEYS.asrSchool,'0')
  return (PRAYER_SCHOOLS as readonly string[]).includes(v)?v as PrayerSchool:'0'
}
export function dateKey(date:Date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
export function parsePrayerTime(value:string|undefined,date:Date){
  if(!value)return null
  const [h,m]=value.split(' ')[0].split(':').map(Number)
  if(!Number.isFinite(h)||!Number.isFinite(m))return null
  const d=new Date(date);d.setHours(h,m,0,0);return d
}
export function formatPrayerTime(value:string){
  const raw=value.split(' ')[0]
  const [h,m]=raw.split(':').map(Number)
  if(!Number.isFinite(h)||!Number.isFinite(m))return '—:—'
  const use12=readSetting('azkar_time_format','24')==='12'
  let hh=h
  let suffix=''
  if(use12){suffix=h<12?' ص':' م';hh=h%12||12}
  const s=`${String(hh).padStart(2,'0')}:${String(m).padStart(2,'0')}${suffix}`
  return toArabicDigits(s)
}

export * from './prayerCoords'
export * from './prayerTimings'
export * from './nextPrayer'
