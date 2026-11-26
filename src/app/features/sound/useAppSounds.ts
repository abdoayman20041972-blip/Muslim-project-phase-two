import { useCallback, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { ExactAlarms } from '@muslim/exact-alarms'
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
  if(!ctxRef.current){const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!C)return null;ctxRef.current=new C({latencyHint:'interactive'})}
  return ctxRef.current
 },[])
 // Browsers only start audio from a user gesture, and resume() is asynchronous. Unlock the context on the
 // first touch so every later tap plays immediately instead of waiting on resume().
 // A context with nothing playing lets the phone's audio output go idle, and the first tone after that waits for
 // the output to wake up. A silent looping source keeps the output open while the app is on screen.
 const keepAliveRef=useRef<AudioBufferSourceNode|null>(null)
 const startKeepAlive=useCallback((context:AudioContext)=>{
  if(keepAliveRef.current||typeof context.createBuffer!=='function')return
  try{const source=context.createBufferSource();source.buffer=context.createBuffer(1,context.sampleRate,context.sampleRate);source.loop=true;const quiet=context.createGain();quiet.gain.value=0;source.connect(quiet).connect(context.destination);source.start();keepAliveRef.current=source}catch{keepAliveRef.current=null}
 },[])
 const stopKeepAlive=useCallback(()=>{try{keepAliveRef.current?.stop()}catch{/* already stopped */}keepAliveRef.current=null},[])
 const unlock=useCallback(()=>{
  const context=getContext()
  if(!context)return
  if(document.visibilityState==='hidden'){stopKeepAlive();return}
  if(context.state!=='running')void context.resume().then(()=>startKeepAlive(context)).catch(()=>{})
  else startKeepAlive(context)
 },[getContext,startKeepAlive,stopKeepAlive])
 useEffect(()=>{
  if(typeof document==='undefined')return
  const events=['pointerdown','touchstart','keydown'] as const
  events.forEach((name)=>document.addEventListener(name,unlock,{capture:true,passive:true}))
  document.addEventListener('visibilitychange',unlock)
  return()=>{stopKeepAlive();events.forEach((name)=>document.removeEventListener(name,unlock,{capture:true}));document.removeEventListener('visibilitychange',unlock)}
 },[unlock,stopKeepAlive])
 const tapFeedback=useCallback((kind:'ui'|'tasbih'|'tasbih-complete'='ui')=>{
  const soundEnabled=flag(kind!=='ui'?APP_SETTINGS_KEYS.tasbihSound:APP_SETTINGS_KEYS.uiSound),vibrationEnabled=flag(APP_SETTINGS_KEYS.vibration),context=getContext()
  const play=()=>{const start=context!.currentTime;if(kind==='tasbih-complete'){tone(context!,220,0.09,0.04,start);tone(context!,440,0.12,0.03,start+0.06)}else if(kind==='tasbih'){tone(context!,285,0.085,0.035,start);tone(context!,570,0.065,0.022,start+0.038)}else tone(context!,520,0.055,0.025,start)}
  // On the Android app the click is played natively (SoundPool): no WebView audio output delay. Web Audio stays as the
  // fallback for the browser and for any failure of the native call.
  let nativeSent=false
  if(soundEnabled&&Capacitor.isNativePlatform()){
   try{void Promise.resolve(ExactAlarms.tapSound({kind})).catch(()=>{});nativeSent=true}catch{nativeSent=false}
  }
  if(!nativeSent&&context&&soundEnabled){if(context.state==='running')play();else void context.resume().then(play).catch(()=>{})}
  if(kind!=='ui'&&vibrationEnabled&&typeof navigator!=='undefined'&&navigator.vibrate) navigator.vibrate(kind==='tasbih-complete'?[35,45,35]:[10,18,10])
 },[getContext])
 useEffect(()=>()=>{void ctxRef.current?.close()},[])
 return {tapFeedback}
}
