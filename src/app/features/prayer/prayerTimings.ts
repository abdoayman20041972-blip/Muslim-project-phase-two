import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useState } from 'react'
import { currentMethod, currentSchool, dateKey, REQUIRED_TIMINGS } from './prayerTimes'
import { normalizeCoords } from './prayerCoords'
import type { Coords, Timings } from './prayerTimes'
import type { PrayerMethod, PrayerSchool } from './prayerTimes'
import { writeSetting } from '../../settings'

// Local astronomical fallback (adhan) so prayer times, and every reminder
// scheduled from them, still work with no network at all.
const METHOD_FACTORIES = {
  '1': 'Karachi',
  '2': 'NorthAmerica',
  '3': 'MuslimWorldLeague',
  '4': 'UmmAlQura',
  '5': 'Egyptian',
} as const

async function computeTimingsLocally(c: Coords, date: Date, method: PrayerMethod, school: PrayerSchool): Promise<Timings | null> {
  try {
    const adhan = await import('adhan')
    const factoryName = METHOD_FACTORIES[method] ?? 'Egyptian'
    const factory = (adhan.CalculationMethod as unknown as Record<string, () => InstanceType<typeof adhan.CalculationParameters>>)[factoryName]
    const params = factory.call(adhan.CalculationMethod)
    if (school === '1') params.madhab = adhan.Madhab.Hanafi
    const times = new adhan.PrayerTimes(new adhan.Coordinates(c.lat, c.lng), date, params)
    const format = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    const timings: Timings = {
      Fajr: format(times.fajr),
      Sunrise: format(times.sunrise),
      Sunset: format(times.sunset),
      Dhuhr: format(times.dhuhr),
      Asr: format(times.asr),
      Maghrib: format(times.maghrib),
      Isha: format(times.isha),
    }
    return validTimings(timings) ? timings : null
  } catch {
    return null
  }
}

const API='https://api.aladhan.com/v1'
const MAX_CACHE_AGE=3*24*60*60*1000
const TIME_RE=/^\d{1,2}:\d{2}/

function cacheKey(date:Date,c:Coords,method=currentMethod(),school=currentSchool()){
  return `azkar_pt_v2_${dateKey(date)}_${c.lat.toFixed(2)}_${c.lng.toFixed(2)}_m${method}_s${school}`
}
function monthCacheKey(date:Date,c:Coords,method=currentMethod(),school=currentSchool()){
  return `azkar_pt_month_v2_${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}_${c.lat.toFixed(2)}_${c.lng.toFixed(2)}_m${method}_s${school}`
}
function validTimings(value:unknown):value is Timings{
  if(!value||typeof value!=='object')return false
  const t=value as Record<string,unknown>
  return REQUIRED_TIMINGS.every(k=>typeof t[k]==='string'&&TIME_RE.test(t[k] as string))
}
function tz(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch{return ''}}
function store(key:string,value:unknown){writeSetting(key,JSON.stringify({savedAt:Date.now(),value}))}
function read(key:string):unknown{
  try{
    const raw=localStorage.getItem(key);if(!raw)return null
    const parsed=JSON.parse(raw)
    if(parsed?.savedAt&&Date.now()-Number(parsed.savedAt)>MAX_CACHE_AGE){localStorage.removeItem(key);return null}
    return parsed?.value??parsed
  }catch{return null}
}
function storeDay(date:Date,c:Coords,t:Timings,method=currentMethod(),school=currentSchool()){store(cacheKey(date,c,method,school),t)}
type PrayerMonthResponse={data?:Record<string,{date?:{gregorian?:{day?:unknown}};timings?:unknown}>}
function extractMonth(json:unknown):Map<number,Timings>{
  const out=new Map<number,Timings>()
  const data=(json as PrayerMonthResponse|undefined)?.data??{}
  for(const item of Object.values(data)){
    const d=Number(item?.date?.gregorian?.day)
    const t=item?.timings
    if(Number.isInteger(d)&&validTimings(t))out.set(d,t)
  }
  return out
}
async function fetchMonth(c:Coords,date:Date,method=currentMethod(),school=currentSchool(),signal?:AbortSignal):Promise<Map<number,Timings>>{
  const cached=read(monthCacheKey(date,c,method,school))
  if(cached&&typeof cached==='object'){
    const map=extractMonth({data:cached})
    if(map.size)return map
  }
  const y=date.getFullYear(),m=date.getMonth()+1
  const qs=new URLSearchParams({latitude:String(c.lat),longitude:String(c.lng),method,school,timezonestring:tz()})
  const res=await fetch(`${API}/calendar/${y}/${m}?${qs}`,{signal})
  if(!res.ok)throw Error('prayer-api')
  const json=await res.json()
  const map=extractMonth(json)
  if(map.size===0)throw Error('invalid-prayer-api')
  store(monthCacheKey(date,c,method,school),json.data)
  return map
}
export async function getTimings(coords:Coords,date:Date,options:{signal?:AbortSignal}={}):Promise<Timings|null>{
  const c=normalizeCoords(coords);if(!c)return null
  const method=currentMethod(),school=currentSchool(),key=cacheKey(date,c,method,school)
  const cached=read(key)
  if(validTimings(cached))return cached
  // Inside the APK the local astronomical calculation is the primary source, so
  // prayer times (and the reminders built on them) work with no network at all.
  // Aladhan remains the fallback if the local calculation fails.
  if(Capacitor.isNativePlatform()&&!options.signal?.aborted){
    const local=await computeTimingsLocally(c,date,method,school)
    if(local){storeDay(date,c,local,method,school);return local}
  }
  try{
    const map=await fetchMonth(c,date,method,school,options.signal)
    const t=map.get(date.getDate())
    if(!t||!validTimings(t))throw Error('prayer-api')
    storeDay(date,c,t,method,school)
    return t
  }catch{
    if(options.signal?.aborted)return null
    const local=await computeTimingsLocally(c,date,method,school)
    if(local)storeDay(date,c,local,method,school)
    return local
  }
}
export function cleanupPrayerCache(){
  try{
    for(let i=localStorage.length-1;i>=0;i--){
      const k=localStorage.key(i)
      if(!k)continue
      if(k.startsWith('azkar_prayer_timings_'))localStorage.removeItem(k)
      else if(k.startsWith('azkar_pt_v2_')||k.startsWith('azkar_pt_month_v2_')){
        const raw=localStorage.getItem(k)
        try{const p=JSON.parse(raw||'');if(p?.savedAt&&Date.now()-Number(p.savedAt)>MAX_CACHE_AGE)localStorage.removeItem(k)}catch{localStorage.removeItem(k)}
      }
    }
  }catch{}
}
export function usePrayerTimings(coords:Coords|null){
  const dayKey=useMemo(()=>dateKey(new Date()),[new Date().getFullYear(),new Date().getMonth(),new Date().getDate()])
  const [timings,setTimings]=useState<Timings|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{cleanupPrayerCache();if(!coords){setTimings(null);return}
    let cancelled=false
    const controller=new AbortController()
    setLoading(true);setError(null)
    getTimings(coords,new Date(),{signal:controller.signal}).then(t=>{if(!cancelled)setTimings(t);if(!t&&!cancelled)setError('تعذر الحصول على مواقيت الصلاة. تحقق من الاتصال أو حدّث الموقع.')}).catch(()=>{if(!cancelled){setError('تعذر الحصول على مواقيت الصلاة. تحقق من الاتصال أو حدّث الموقع.');setTimings(null)}}).finally(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true;controller.abort()}
  },[coords?.lat,coords?.lng,dayKey,currentMethod(),currentSchool()])
  return {timings,loading,error,dayKey}
}
