import { useEffect, useState } from 'react'
import type { ZikrCategory } from '../../../azkar-data'
import { toArabicDigits, toArabicNumber } from '../../constants'
import { TasbihPad } from './TasbihPad'
import { completedItemCount, countedItems, isCountedZikr, itemTarget } from './azkarProgress'
import { favoriteKey } from './useFavorites'
import { parseReference } from './zikrReference'
import { clearJourneyPosition, readJourneyPosition, saveJourneyPosition } from './journeyPosition'
type Props={category:ZikrCategory;progress:Record<string,number>;counterEnabled:boolean;autoAdvanceEnabled:boolean;fontScale?:number;onProgressChange:(next:Record<string,number>)=>void;onExit:()=>void}
const pill='u-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-[0.75rem] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal'
export function AzkarJourney({category,progress,counterEnabled,autoAdvanceEnabled,fontScale,onProgressChange,onExit}:Props){
 const total=category.items.length
 const keys=category.items.map(item=>favoriteKey(category,item))
 const [index,setIndex]=useState(()=>{const saved=readJourneyPosition(category.id);if(saved!==null&&Number.isInteger(saved)&&saved>=0&&saved<total)return saved;const first=category.items.findIndex((item,i)=>isCountedZikr(item)&&Math.min(Number(progress[keys[i]]||0),itemTarget(item.repeat))<itemTarget(item.repeat));return first===-1?0:first})
 const [finished,setFinished]=useState(false)
 const safeIndex=Math.min(index,Math.max(0,total-1))
 const item=category.items[safeIndex]
 const key=keys[safeIndex]
 const counted=!!item&&isCountedZikr(item)
 const kindLabel=item?.kind==='fadl'?'فضل وخبر':item?.kind==='guidance'?'إرشاد وآداب':undefined
 const target=item?itemTarget(item.repeat):0
 const current=item?Math.min(Number(progress[key]||0),target):0
 const completed=!!item&&(!counted||current>=target)
 const isLast=!!item&&safeIndex===total-1
 const goNext=()=>{if(isLast){clearJourneyPosition(category.id);setFinished(true)}else{const nextIndex=safeIndex+1;saveJourneyPosition(category.id,nextIndex);setIndex(nextIndex)}}
 useEffect(()=>{if(!completed||!counted||!autoAdvanceEnabled||!counterEnabled||isLast)return;const timer=window.setTimeout(goNext,600);return()=>window.clearTimeout(timer)},[completed,counted,autoAdvanceEnabled,counterEnabled,isLast,safeIndex])
 if(finished||!item){const countedList=countedItems(category.items);const countedKeys=countedList.map(it=>favoriteKey(category,it));const done=completedItemCount(countedList,countedKeys,progress);const countedTotal=countedList.length;return <div role="status" className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-10 text-center"><div className="font-cairo text-2xl font-bold text-azkar-teal-ink">{'أنهيت رحلة '+category.label}</div>{counterEnabled&&countedTotal>0?<div className="mt-2 text-[0.75rem] text-azkar-ink-soft">{'أكملت '+toArabicNumber(done)+' من '+toArabicNumber(countedTotal)}</div>:<div className="mt-2 text-[0.75rem] text-azkar-ink-soft">أنهيت قراءة أذكار القسم</div>}{counterEnabled&&done<countedTotal&&<div className="mt-1 text-[0.6875rem] text-azkar-ink-faint">{toArabicNumber(countedTotal-done)+' متبقي'}</div>}<button data-sound="none" onClick={onExit} aria-label="رجوع للقسم" className={pill+' mt-6 border-azkar-teal bg-azkar-teal text-azkar-card'}>رجوع للقسم</button></div>}
 const parsedSource=item.source?parseReference(item.source):undefined
 const displaySource=parsedSource&&!parsedSource.ignored?parsedSource.value:undefined
 const increment=()=>{if(!item||completed)return;onProgressChange({...progress,[key]:current+1})}
 const goPrev=()=>{const nextIndex=Math.max(0,safeIndex-1);if(nextIndex!==safeIndex)saveJourneyPosition(category.id,nextIndex);setIndex(nextIndex)}
 const nextPrimary=completed||!counterEnabled
 const nextLabel=isLast?'إنهاء الرحلة':'التالي'
 return <div className="azkar-journey-redesign flex min-h-[calc(100dvh-7rem)] flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-cairo text-xl font-bold text-azkar-teal-ink">{category.label}</div><div aria-live="polite" className="mt-0.5 text-[0.6875rem] text-azkar-ink-faint">{'الذكر '+toArabicNumber(safeIndex+1)+' من '+toArabicNumber(total)}</div></div><button data-sound="none" onClick={onExit} aria-label="الخروج من الرحلة" className={pill+' border-azkar-hairline bg-azkar-surface-1 text-azkar-ink-soft'}>خروج</button></div>
 <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={safeIndex+1} aria-label="موضع الذكر في الرحلة"><div className="h-full rounded-full bg-azkar-teal transition-all duration-200" style={{width:(safeIndex+1)/total*100+'%'}}/></div>
 <article className="azkar-journey-card rounded-[var(--r-lg)] border-2 border-azkar-teal/20 bg-azkar-card px-5 py-7 u-shadow-1">
  {counted&&item.repeat?<span className="mb-4 inline-block rounded-full border border-azkar-teal/15 bg-azkar-teal-tint px-2.5 py-1 text-[0.8125rem] font-bold text-azkar-teal-ink">{'الهدف '+toArabicNumber(item.repeat)+' مرة'}</span>:kindLabel?<span className={'mb-4 inline-block rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold '+(item.kind==='fadl'?'border-azkar-gold/30 bg-azkar-gold-tint text-azkar-gold':'border-azkar-hairline bg-azkar-surface-1 text-azkar-ink-faint')}>{kindLabel}</span>:null}
  <p className="u-reading-text whitespace-pre-line text-[1.3125rem] leading-[2.1] text-azkar-ink" style={fontScale?{['--zikr-scale' as string]:fontScale}:undefined}>{toArabicDigits(item.text)}</p>
  {(displaySource||item.reference)&&<div className="mt-4 flex flex-wrap items-center gap-2">{displaySource&&<p className="text-[0.6875rem] text-azkar-ink-faint">{toArabicDigits(displaySource)}</p>}{item.reference?.grade&&<span className="rounded-full border border-azkar-hairline bg-azkar-surface-1 px-2 py-0.5 text-[0.6875rem] font-bold text-azkar-ink-soft">{item.reference.grade}</span>}{item.reference?.url&&<a href={item.reference.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[2.5rem] items-center px-1 text-[0.8125rem] font-bold text-azkar-teal underline underline-offset-2">المصدر</a>}</div>}
  {counterEnabled&&counted&&<TasbihPad variant="journey" current={current} target={target} onTap={increment}/>}
 </article>
 <div className="mt-4 flex items-center justify-between gap-3"><button data-sound="none" onClick={goPrev} disabled={safeIndex===0} aria-label="السابق" className={pill+' border-azkar-hairline bg-azkar-card text-azkar-ink-soft disabled:opacity-40'}><span aria-hidden="true">→</span><span>السابق</span></button><button data-sound="none" onClick={goNext} aria-label={nextLabel} className={pill+' '+(nextPrimary?'border-azkar-teal bg-azkar-teal text-azkar-card':'border-azkar-teal/30 bg-azkar-teal-tint text-azkar-teal-ink')}><span>{nextLabel}</span><span aria-hidden="true">←</span></button></div>
 </div>
}
