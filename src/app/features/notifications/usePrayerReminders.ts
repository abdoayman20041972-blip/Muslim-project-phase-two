import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { getNotificationPermission, showAppNotification } from './notifications'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { dateKey, getTimings, parsePrayerTime, readPrayerCoords, reminderLeadText, type Timings } from '../prayer/prayerTimes'
const PRAYERS=['Fajr','Dhuhr','Asr','Maghrib','Isha'] as const
const LABELS:Record<string,string>={Fajr:'الفجر',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'}
function reminderLead(){return 5}
export function usePrayerReminders(){
 const timers=useRef<number[]>([]),run=useRef(0)
 useEffect(()=>{let cancelled=false
  if(Capacitor.isNativePlatform())return // native local notifications handle this
  const clear=()=>{timers.current.forEach(id=>window.clearTimeout(id));timers.current=[]}
  const schedule=async()=>{const id=++run.current;clear();if(readSetting(APP_SETTINGS_KEYS.reminders)!=='1'&&readSetting(APP_SETTINGS_KEYS.prayerTime)!=='1'||getNotificationPermission()!=='granted')return
   const c=readPrayerCoords();if(!c)return
   const today=new Date(),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1)
   let a: Awaited<ReturnType<typeof getTimings>> = null,b: Awaited<ReturnType<typeof getTimings>> = null
   try{[a,b]=await Promise.all([getTimings(c,today),getTimings(c,tomorrow)])}catch{return}
   if(cancelled||id!==run.current)return
   const lead=reminderLead()
   const day=(date:Date,t:Timings|null)=>{if(!t)return;for(const k of PRAYERS){const p=parsePrayerTime(t[k],date);if(!p)continue
    const now=Date.now(),before=p.getTime()-lead*60000-now,at=p.getTime()-now
    if(readSetting(APP_SETTINGS_KEYS.reminders)==='1'&&before>0&&before<=2147483647)timers.current.push(window.setTimeout(()=>{if(getNotificationPermission()==='granted'&&readSetting(APP_SETTINGS_KEYS.reminders)==='1')void showAppNotification('اقترب وقت الصلاة',LABELS[k]+' '+reminderLeadText(lead),'azkar-'+k+'-before-'+dateKey(date),'prayer')},before))
    if(readSetting(APP_SETTINGS_KEYS.prayerTime)==='1'&&at>0&&at<=2147483647)timers.current.push(window.setTimeout(()=>{if(getNotificationPermission()==='granted'&&readSetting(APP_SETTINGS_KEYS.prayerTime)==='1')void showAppNotification('حان وقت الصلاة',LABELS[k],'azkar-'+k+'-now-'+dateKey(date),'prayer')},at))
   }}
   day(today,a);day(tomorrow,b)
  }
  const refresh=()=>{void schedule()}
  const interval=window.setInterval(refresh,60000)
  window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh)
  window.addEventListener('azkar-prayer-settings-changed',refresh);window.addEventListener('azkar-settings-changed',refresh)
  let idleHandle: number | null = null
  let idleTimer: number | null = null
  const scheduleIdle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback.bind(window) : null
  if (scheduleIdle) idleHandle = scheduleIdle(() => void schedule(), { timeout: 1800 })
  else idleTimer = window.setTimeout(() => void schedule(), 0)
  return()=>{cancelled=true;++run.current;clear();if(idleHandle!==null) window.cancelIdleCallback(idleHandle);if(idleTimer!==null) window.clearTimeout(idleTimer);window.clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('azkar-prayer-settings-changed',refresh);window.removeEventListener('azkar-settings-changed',refresh)}
 },[])
}
