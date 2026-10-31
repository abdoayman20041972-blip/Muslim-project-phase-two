
import { useCallback, useEffect, useRef, useState } from 'react'
import { getTasbihWords, todayKey, type TasbihWord } from '../../constants'
import { writeSetting } from '../../settings'

const COUNTS_KEY='azkar_counts'
const TOTAL_KEY='azkar_day_total'
const DATE_KEY='azkar_day_total_date'
const SELECTED_WORD_KEY='azkar_tasbih_selected_word'
const ROUNDS_KEY='azkar_tasbih_rounds'
const ROUND_COUNTS_KEY='azkar_tasbih_round_counts'
const DAILY_HISTORY_KEY='azkar_tasbih_daily_history'

function isRecord(v:unknown):v is Record<string,unknown>{return Boolean(v&&typeof v==='object'&&!Array.isArray(v))}
function readJson<T>(key:string,ok:(v:unknown)=>v is T,fb:T):T{try{const v=JSON.parse(localStorage.getItem(key)??'null');return ok(v)?v:fb}catch{return fb}}
function validCounts(v:unknown):v is Record<string,number>{return isRecord(v)&&Object.values(v).every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0)}
function validHistory(v:unknown):v is Record<string,number>{return isRecord(v)&&Object.values(v).every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0)}
function validStringRecord(v:unknown):v is Record<string,number>{return validCounts(v)}
function readDailyHistory(){return readJson(DAILY_HISTORY_KEY,validHistory,{})}
function writeDailyHistory(history:Record<string,number>){writeSetting(DAILY_HISTORY_KEY,JSON.stringify(history))}
function migrateCounts(raw:Record<string,number>,words:TasbihWord[]){const out:Record<string,number>={...raw};for(const w of words){const legacy=raw[w.word];const stable=raw[w.id];out[w.id]=Number.isFinite(stable)?Math.max(0,stable):Number.isFinite(legacy)?Math.max(0,legacy):0;if(w.word!==w.id&&Object.prototype.hasOwnProperty.call(out,w.word))delete out[w.word]}return out}
function migrateRounds(raw:Record<string,number>,words:TasbihWord[]){const out:Record<string,number>={};for(const w of words)out[w.id]=Math.max(0,Number(raw[w.id]??raw[w.word]??0)||0);return out}

export function useTasbih(){
 const [counts,setCounts]=useState<Record<string,number>>({})
 const [dayTotal,setDayTotal]=useState(0)
 const [selectedWord,setSelectedWordState]=useState<string|null>(null)
 const [roundCounts,setRoundCounts]=useState<Record<string,number>>({})
 const [rounds,setRounds]=useState<Record<string,number>>({})
 type TasbihState={counts:Record<string,number>;dayTotal:number;roundCounts:Record<string,number>;rounds:Record<string,number>}
 const stateRef=useRef<TasbihState>({counts:{},dayTotal:0,roundCounts:{},rounds:{}})
 const persistTimer=useRef<number|null>(null)

 const persist=useCallback(()=>{
  const s=stateRef.current
  try{localStorage.setItem(COUNTS_KEY,JSON.stringify(s.counts));localStorage.setItem(TOTAL_KEY,String(s.dayTotal));localStorage.setItem(DATE_KEY,todayKey());localStorage.setItem(ROUND_COUNTS_KEY,JSON.stringify(s.roundCounts));localStorage.setItem(ROUNDS_KEY,JSON.stringify(s.rounds))}catch (error) { console.debug('[useTasbih]', error) }
  const today=todayKey(),history=readDailyHistory();history[today]=s.dayTotal
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-29);const cutoffKey=todayKey(cutoff)
  Object.keys(history).filter(k=>k<cutoffKey).forEach(k=>delete history[k]);writeDailyHistory(history);window.dispatchEvent(new Event('azkar-tasbih-changed'))
 },[])

 const schedulePersist=useCallback(()=>{if(persistTimer.current!==null)window.clearTimeout(persistTimer.current);persistTimer.current=window.setTimeout(()=>{persistTimer.current=null;persist()},300)},[persist])
 const flush=useCallback(()=>{if(persistTimer.current!==null){window.clearTimeout(persistTimer.current);persistTimer.current=null}persist()},[persist])

 const load=useCallback(()=>{
  const words=getTasbihWords()
  const rawCounts=readJson(COUNTS_KEY,validCounts,{})
  const rawRounds=readJson(ROUNDS_KEY,validStringRecord,{})
  const rawRoundCounts=readJson(ROUND_COUNTS_KEY,validStringRecord,{})
  const savedTotal=Number(localStorage.getItem(TOTAL_KEY)||0)
  const savedDate=localStorage.getItem(DATE_KEY)
  const rawSelected=localStorage.getItem(SELECTED_WORD_KEY)
  const selected=words.find(w=>w.id===rawSelected||w.word===rawSelected)?.id??null
  const today=todayKey()
  const nextCounts=migrateCounts(rawCounts,words)
  const nextRounds=migrateRounds(rawRounds,words)
  const nextRoundCounts=migrateCounts(rawRoundCounts,words)
  const nextDayTotal=savedDate===today&&Number.isFinite(savedTotal)&&savedTotal>=0?savedTotal:0
  stateRef.current={counts:nextCounts,dayTotal:nextDayTotal,roundCounts:nextRoundCounts,rounds:nextRounds}
  setCounts(nextCounts);setDayTotal(nextDayTotal);setRoundCounts(nextRoundCounts);setRounds(nextRounds);setSelectedWordState(selected)
  try{localStorage.setItem(SELECTED_WORD_KEY,selected??'');localStorage.setItem(DATE_KEY,today);localStorage.setItem(TOTAL_KEY,String(nextDayTotal))}catch (error) { console.debug('[useTasbih]', error) }
 },[])

 useEffect(()=>{load();const onFocus=()=>{flush();load();};const onVisibility=()=>{if(document.visibilityState==='visible')load();else flush()};window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onVisibility);window.addEventListener('pagehide',flush);return()=>{window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',flush);flush()}},[load,flush])

 const setSelectedWord=useCallback((id:string)=>{const words=getTasbihWords();const word=words.find(w=>w.id===id)||words.find(w=>w.word===id);if(!word)return;setSelectedWordState(word.id);writeSetting(SELECTED_WORD_KEY,word.id)},[])
 const tap=useCallback((id:string)=>{
  const words=getTasbihWords(),word=words.find(w=>w.id===id)||words.find(w=>w.word===id);if(!word)return
  const s=stateRef.current,today=todayKey()
  const lastDate=localStorage.getItem(DATE_KEY)
  if(lastDate!==today){s.dayTotal=0;try{localStorage.setItem(TOTAL_KEY,'0');localStorage.setItem(DATE_KEY,today)}catch (error) { console.debug('[useTasbih]', error) }}
  const nextTotal=s.dayTotal+1
  const nextCounts={...s.counts,[word.id]:(s.counts[word.id]||0)+1}
  let nextRound=(s.roundCounts[word.id]||0)+1,nextRounds={...s.rounds}
  if(nextRound>=word.goal){nextRound=0;nextRounds={...nextRounds,[word.id]:(nextRounds[word.id]||0)+1}}
  const nextRoundCounts={...s.roundCounts,[word.id]:nextRound}
  stateRef.current={counts:nextCounts,dayTotal:nextTotal,roundCounts:nextRoundCounts,rounds:nextRounds}
  setCounts(nextCounts);setDayTotal(nextTotal);setRoundCounts(nextRoundCounts);setRounds(nextRounds)
  schedulePersist()
 },[schedulePersist])
 const resetWord=useCallback((id:string)=>{const words=getTasbihWords(),word=words.find(w=>w.id===id)||words.find(w=>w.word===id);if(!word)return;const s=stateRef.current,nextRoundCounts={...s.roundCounts,[word.id]:0};stateRef.current={...s,roundCounts:nextRoundCounts};setRoundCounts(nextRoundCounts);schedulePersist()},[schedulePersist])
 const resetToday=useCallback(()=>{const s=stateRef.current;s.dayTotal=0;stateRef.current={...s,dayTotal:0};setDayTotal(0);try{localStorage.setItem(TOTAL_KEY,'0');localStorage.setItem(DATE_KEY,todayKey())}catch (error) { console.debug('[useTasbih]', error) };schedulePersist()},[schedulePersist])
 return {counts,dayTotal,selectedWord,roundCounts,rounds,setSelectedWord,load,tap,resetWord,resetToday}
}
export { DAILY_HISTORY_KEY, todayKey }
