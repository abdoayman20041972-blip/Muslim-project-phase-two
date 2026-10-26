import { useEffect, useState } from 'react'
import type { ZikrCategory } from '../../../azkar-data'
import { toArabicDigits, toArabicNumber } from '../../constants'
import { completedItemCount, itemTarget } from './azkarProgress'
import { favoriteKey } from './useFavorites'
import { parseReference } from './zikrReference'
import { clearJourneyPosition, readJourneyPosition, saveJourneyPosition } from './journeyPosition'
type Props={category:ZikrCategory;progress:Record<string,number>;counterEnabled:boolean;autoAdvanceEnabled:boolean;onProgressChange:(next:Record<string,number>)=>void;onExit:()=>void}
const pill='u-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-[12px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal'
export function AzkarJourney({category,progress,counterEnabled,autoAdvanceEnabled,onProgressChange,onExit}:Props){
 const total=category.items.length
 const keys=category.items.map(item=>favoriteKey(category,item))
 const [index,setIndex]=useState(()=>{const saved=readJourneyPosition(category.id);if(saved!==null&&Number.isInteger(saved)&&saved>=0&&saved<total)return saved;const first=category.items.findIndex((item,i)=>Math.min(Number(progress[keys[i]]||0),itemTarget(item.repeat))<itemTarget(item.repeat));return first===-1?0:first})
 const [finished,setFinished]=useState(false)
 const safeIndex=Math.min(index,Math.max(0,total-1))
 const item=category.items[safeIndex]
 const key=keys[safeIndex]
 const target=item?itemTarget(item.repeat):0
 const current=item?Number(progress[key]||0):0
 const completed=!!item&&current>=target
 const isLast=!!item&&safeIndex===total-1
 const goNext=()=>{if(isLast){clearJourneyPosition(category.id);setFinished(true)}else{const nextIndex=safeIndex+1;saveJourneyPosition(category.id,nextIndex);setIndex(nextIndex)}}
 useEffect(()=>{if(!completed||!autoAdvanceEnabled||!counterEnabled||isLast)return;const timer=window.setTimeout(goNext,600);return()=>window.clearTimeout(timer)},[completed,autoAdvanceEnabled,counterEnabled,isLast,safeIndex])
 if(finished||!item){const done=completedItemCount(category.items,keys,progress);return <div role="status" className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-10 text-center"><div className="font-amiri text-2xl font-bold text-azkar-teal-ink">{'أنهيت رحلة '+category.label}</div>{counterEnabled?<div className="mt-2 text-[12px] text-azkar-ink-soft">{'أكملت '+toArabicNumber(done)+' من '+toArabicNumber(total)}</div>:<div className="mt-2 text-[12px] text-azkar-ink-soft">أنهيت قراءة أذكار القسم</div>}{counterEnabled&&done<total&&<div className="mt-1 text-[10px] text-azkar-ink-faint">{toArabicNumber(total-done)+' متبقي'}</div>}<button data-sound="none" onClick={onExit} aria-label="رجوع للقسم" className={pill+' mt-6 border-azkar-teal bg-azkar-teal text-azkar-card'}>رجوع للقسم</button></div>}
 const parsedSource=item.source?parseReference(item.source):undefined
 const displaySource=parsedSource&&!parsedSource.ignored?parsedSource.value:undefined
 const increment=()=>{onProgressChange({...progress,[key]:current+1})}
 const goPrev=()=>{const nextIndex=Math.max(0,safeIndex-1);if(nextIndex!==safeIndex)saveJourneyPosition(category.id,nextIndex);setIndex(nextIndex)}
 const nextPrimary=completed||!counterEnabled
 const nextLabel=isLast?'إنهاء الرحلة':'التالي'
 return <div className="azkar-journey-redesign flex min-h-[calc(100dvh-7rem)] flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-amiri text-xl font-bold text-azkar-teal-ink">{category.label}</div><div aria-live="polite" className="mt-0.5 text-[11px] text-azkar-ink-faint">{'الذكر '+toArabicNumber(safeIndex+1)+' من '+toArabicNumber(total)}</div></div><button data-sound="none" onClick={onExit} aria-label="الخروج من الرحلة" className={pill+' border-azkar-hairline bg-azkar-surface-1 text-azkar-ink-soft'}>خروج</button></div>
 <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={safeIndex+1} aria-label="موضع الذكر في الرحلة"><div className="h-full rounded-full bg-azkar-teal transition-all duration-200" style={{width:(safeIndex+1)/total*100+'%'}}/></div>
 <article className="azkar-journey-card rounded-[var(--r-lg)] border-2 border-azkar-teal/20 bg-azkar-card px-5 py-7 u-shadow-1">
  {item.repeat?<span className="mb-4 inline-block rounded-full border border-azkar-teal/15 bg-azkar-teal-tint px-2.5 py-1 text-[10.5px] font-bold text-azkar-teal-ink">{'الهدف '+toArabicNumber(item.repeat)+' مرة'}</span>:null}
  <p className="u-reading-text whitespace-pre-line text-[21px] leading-[2.1] text-azkar-ink">{toArabicDigits(item.text)}</p>
  {displaySource&&<p className="mt-4 text-[10.5px] text-azkar-ink-faint">{toArabicDigits(displaySource)}</p>}
  {counterEnabled&&<div className="azkar-journey-counter mt-5 rounded-2xl border border-azkar-hairline bg-azkar-surface-1 p-2.5"><div className="mb-2 h-1.5 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={current} aria-label={'تقدم الذكر: '+current+' من '+target}><div className={'h-full rounded-full transition-all duration-200 '+(completed?'bg-azkar-gold':'bg-azkar-teal')} style={{width:Math.min(100,current/target*100)+'%'}}/></div><div className="flex items-center gap-3"><div className="flex min-w-[68px] flex-1 flex-col items-center justify-center"><button data-sound="tasbih" onClick={increment} aria-label={completed?'تم إكمال الذكر':'تسجيل مرة من الذكر'} className={'u-pressable flex size-12 items-center justify-center rounded-full border-2 text-lg font-bold transition '+(completed?'border-azkar-gold bg-azkar-gold/15 text-azkar-gold':'border-azkar-teal bg-azkar-teal-tint text-azkar-teal-ink')}><span aria-hidden="true">{completed?'✓':'＋'}</span></button><span className="mt-1.5 text-[9px] font-bold text-azkar-ink-faint">زر التسجيل</span></div><div className="min-w-[68px] text-center"><div className="text-[9px] text-azkar-ink-faint">المتبقي</div><div className="text-[13px] font-bold text-azkar-ink">{toArabicNumber(Math.max(0,target-current))}</div>{completed&&<div className="mt-1 text-[9px] font-bold text-azkar-gold">تم الإكمال ✓</div>}</div></div></div>}
 </article>
 <div className="mt-4 flex items-center justify-between gap-3"><button data-sound="none" onClick={goPrev} disabled={safeIndex===0} aria-label="السابق" className={pill+' border-azkar-hairline bg-azkar-card text-azkar-ink-soft disabled:opacity-40'}><span aria-hidden="true">→</span><span>السابق</span></button><button data-sound="none" onClick={goNext} aria-label={nextLabel} className={pill+' '+(nextPrimary?'border-azkar-teal bg-azkar-teal text-azkar-card':'border-azkar-teal/30 bg-azkar-teal-tint text-azkar-teal-ink')}><span>{nextLabel}</span><span aria-hidden="true">←</span></button></div>
 </div>
}
