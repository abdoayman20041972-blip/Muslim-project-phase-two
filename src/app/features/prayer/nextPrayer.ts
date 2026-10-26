import { useEffect, useMemo, useState } from 'react'
import { toArabicDigits } from '../../constants'
import { dateKey, currentMethod, currentSchool, parsePrayerTime } from './prayerTimes'
import { getTimings, usePrayerTimings } from './prayerTimings'
import type { Coords, Timings } from './prayerTimes'

const FIVE=['Fajr','Dhuhr','Asr','Maghrib','Isha'] as const

export function hhmm(d:Date){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
export function pickNextPrayer(t:Timings,now:Date,tomorrowFajr:string|null){
  for(const key of FIVE){const p=parsePrayerTime(t[key],now);if(p&&p>now)return {key,time:p,tomorrow:false}}
  if(tomorrowFajr){const d=new Date(now);d.setDate(d.getDate()+1);const p=parsePrayerTime(tomorrowFajr,d);if(p)return {key:'Fajr' as const,time:p,tomorrow:true}}
  return null
}
export function formatCountdown(ms:number){
  const total=Math.max(0,Math.floor(ms/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60
  const n=(v:number)=>toArabicDigits(String(v).padStart(2,'0'))
  return `${n(h)}:${n(m)}:${n(s)}`
}
export function reminderLeadText(n:number){
  const d=n===15||n===20?'دقيقة':'دقائق'
  return 'بعد '+toArabicDigits(n)+' '+d
}
export function useNextPrayer(coords:Coords|null){
  const {timings,loading,error}=usePrayerTimings(coords)
  const [now,setNow]=useState(()=>new Date()),[tf,setTf]=useState<string|null>(null)
  useEffect(()=>{const t=()=>setNow(new Date());const id=setInterval(t,1000)
    window.addEventListener('focus',t);document.addEventListener('visibilitychange',t)
    return()=>{clearInterval(id);window.removeEventListener('focus',t);document.removeEventListener('visibilitychange',t)}},[])
  const day=dateKey(now)
  useEffect(()=>{if(!coords){setTf(null);return}
    let dead=false;const ac=new AbortController();const d=new Date(now);d.setDate(d.getDate()+1)
    getTimings(coords,d,{signal:ac.signal}).then(t=>{if(!dead)setTf(t?.Fajr??null)}).catch(()=>{if(!dead)setTf(null)})
    return()=>{dead=true;ac.abort()}
  },[coords?.lat,coords?.lng,day,currentMethod(),currentSchool()])
  const next=useMemo(()=>timings?pickNextPrayer(timings,now,tf):null,[timings,now,tf])
  return {next,remainingMs:next?Math.max(0,next.time.getTime()-now.getTime()):0,loading,error,timings}
}
