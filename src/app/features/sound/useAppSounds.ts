import { useCallback, useEffect, useRef } from 'react'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'

function flag(key:string){return readSetting(key,'1')!=='0'}
function tone(ctx:AudioContext,frequency:number,duration:number,volume:number,startAt=ctx.currentTime){
 const oscillator=ctx.createOscillator(),gain=ctx.createGain()
 oscillator.type='sine'; oscillator.frequency.setValueAtTime(frequency,startAt)
 gain.gain.setValueAtTime(0.0001,startAt); gain.gain.exponentialRampToValueAtTime(volume,startAt+0.006); gain.gain.exponentialRampToValueAtTime(0.0001,startAt+duration)
 oscillator.connect(gain).connect(ctx.destination); oscillator.start(startAt); oscillator.stop(startAt+duration+0.01)
}
export function useAppSounds(){
 const ctxRef=useRef<AudioContext|null>(null)
 const getContext=useCallback(()=>{
  if(typeof window==='undefined') return null
  if(!ctxRef.current){const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!C)return null;ctxRef.current=new C()}
  return ctxRef.current
 },[])
 const tapFeedback=useCallback((kind:'ui'|'tasbih'|'tasbih-complete'='ui')=>{
  const soundEnabled=flag(kind!=='ui'?APP_SETTINGS_KEYS.tasbihSound:APP_SETTINGS_KEYS.uiSound),vibrationEnabled=flag(APP_SETTINGS_KEYS.vibration),context=getContext()
  if(context&&soundEnabled) void context.resume().then(()=>{if(kind==='tasbih-complete'){const start=context.currentTime+0.004;tone(context,220,0.09,0.04,start);tone(context,440,0.12,0.03,start+0.06)}else if(kind==='tasbih'){const start=context.currentTime+0.004;tone(context,285,0.085,0.035,start);tone(context,570,0.065,0.022,start+0.038)}else tone(context,520,0.055,0.025)})
  if(kind!=='ui'&&vibrationEnabled&&typeof navigator!=='undefined'&&navigator.vibrate) navigator.vibrate(kind==='tasbih-complete'?[35,45,35]:[10,18,10])
 },[getContext])
 useEffect(()=>()=>{void ctxRef.current?.close()},[])
 return {tapFeedback}
}
