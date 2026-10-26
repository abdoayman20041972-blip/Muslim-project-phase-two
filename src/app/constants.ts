import type { QuranAudioReciter } from './features/quran/quranAudioPlayback'
import { readSetting } from './settings'
import {
  getCustomTasbihList,
  hasCustomTasbihList,
  saveCustomTasbihList,
} from './features/tasbih/customTasbih'
export function toArabicDigits(value:number|string){const text=String(value);const style=readSetting('azkar_number_style','arabic');if(style==='western')return text.replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));return text.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)])}
export function toArabicNumber(value:number){return readSetting('azkar_number_style','arabic')==='western'?value.toLocaleString('en-US'):value.toLocaleString('ar-EG')}
export type ArabicCountForms={one:string;two:string;few:string;many:string}
export function arabicCount(n:number,forms:ArabicCountForms){if(n===1)return forms.one;if(n===2)return forms.two;if(n>=11)return `${toArabicNumber(n)} ${forms.many}`;return `${toArabicNumber(n)} ${forms.few}`}
export const ZIKR_COUNT_FORMS:ArabicCountForms={one:'ذكر',two:'ذكران',few:'أذكار',many:'ذكرًا'}
export const CATEGORY_COUNT_FORMS:ArabicCountForms={one:'فئة',two:'فئتان',few:'فئات',many:'فئةً'}
export function numLocale(base='ar-EG'){if(readSetting('azkar_number_style','arabic')!='western')return base;return base.includes('-u-')?base+'-nu-latn':base+'-u-nu-latn'}
export function formatLocalizedDate(date:Date,options:Intl.DateTimeFormatOptions,base='ar-EG'){return toArabicDigits(new Intl.DateTimeFormat(base,options).format(date))}
export function todayKey(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
export const tasbihWords=[
  {id:'subhanallah',word:'سبحان الله',goal:33},
  {id:'alhamdulillah',word:'الحمد لله',goal:33},
  {id:'allahuakbar',word:'الله أكبر',goal:34},
] as const
const OLD_CUSTOM_KEY='azkar_custom_tasbih'
export type TasbihWord={id:string;word:string;goal:number}
export function normalizeTasbihText(s:string){return s.normalize('NFD').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'').replace(/[إأآٱ]/g,'ا').replace(/\s+/g,' ').trim()}
export function getTasbihWords():TasbihWord[]{
  try{
    const builtins=tasbihWords.map(x=>({...x}))
    const hasCustom=hasCustomTasbihList()
    let custom:unknown=hasCustom?getCustomTasbihList():null
    if(!hasCustom){
      const old=localStorage.getItem(OLD_CUSTOM_KEY)?.trim()
      custom=old?[{id:'custom-1',word:old,goal:33}]:[]
      if(old) saveCustomTasbihList(custom as Array<{id:string;word:string;goal:number}>)
    }
    const seen=new Set(builtins.map(x=>normalizeTasbihText(x.word)))
    const customList=Array.isArray(custom)?custom:[]
    const list=customList.filter((x):x is {id:string;word:string;goal:number}=>{if(!x||typeof x!=='object')return false;const entry=x as Record<string,unknown>;return typeof entry.id==='string'&&typeof entry.word==='string'&&Number.isFinite(Number(entry.goal))}).map(x=>({id:x.id,word:x.word.trim(),goal:Math.max(1,Math.min(10000,Number(x.goal)||33))})).filter(x=>x.word&& !seen.has(normalizeTasbihText(x.word)) && (seen.add(normalizeTasbihText(x.word)),true)).slice(0,10)
    return [...builtins,...list]
  }catch{return tasbihWords.map(x=>({...x}))}
}
export const BISMILLAH='بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
export const AUDIO_CDN='https://cdn.islamic.network/quran/audio'
export const QURAN_SURAH_AUDIO_SERVERS: Record<QuranAudioReciter, string> = {
  'ar.minshawi': 'https://server10.mp3quran.net/minsh',
  'ar.alafasy': 'https://server8.mp3quran.net/afs',
  'ar.husary': 'https://server13.mp3quran.net/husr',
  'ar.abdulbasitmurattal': 'https://server7.mp3quran.net/basit',
  'ar.abdurrahmaansudais': 'https://server11.mp3quran.net/sds',
  'ar.mahermuaiqly': 'https://server12.mp3quran.net/maher',
  'ar.hudhaify': 'https://server9.mp3quran.net/hthfi',
  'ar.saoodshuraym': 'https://server7.mp3quran.net/shur',
  'ar.ahmedajamy': 'https://server10.mp3quran.net/ajm',
  'ar.shaatree': 'https://server11.mp3quran.net/shatri',
}
export function quranAudioUrl(reciter:string,ayahNumber:number,withBismillah=false){const bitrate=reciter==='ar.abdulbasitmurattal'||reciter==='ar.abdurrahmaansudais'?192:128;const edition=withBismillah&&ayahNumber>0?`${reciter}-2`:reciter;return AUDIO_CDN+'/'+bitrate+'/'+edition+'/'+ayahNumber+'.mp3'}
export function quranSurahAudioUrl(reciter: QuranAudioReciter, surahNumber: number){
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) throw new RangeError('surahNumber must be between 1 and 114')
  return QURAN_SURAH_AUDIO_SERVERS[reciter] + '/' + String(surahNumber).padStart(3, '0') + '.mp3'
}
export const FONT_SIZES={sm:{text:'text-[18px]',leading:'leading-[2.2]',label:'صغير'},md:{text:'text-[21px]',leading:'leading-[2.5]',label:'متوسط'},lg:{text:'text-[24px]',leading:'leading-[2.6]',label:'كبير'},xl:{text:'text-[28px]',leading:'leading-[2.9]',label:'كبير جدًا'}} as const
export type FontSizeKey=keyof typeof FONT_SIZES
export const FONT_ORDER:FontSizeKey[]=['sm','md','lg','xl']
export type View={name:'home'}|{name:'azkar-list'}|{name:'favorites'}|{name:'category';id:string}|{name:'tasbih'}|{name:'mushaf-list'}|{name:'mushaf-surah';number:number}|{name:'prayer-times'}|{name:'qibla'}|{name:'settings'}|{name:'prophets'}|{name:'hadith'}
export type Section='mushaf'|'hadith'|'home'|'azkar'|'tasbih'|'more'
export type Ayah={number:number;numberInSurah:number;text:string}
export function sectionOf(view:View):Section|null{switch(view.name){case'home':return'home';case'mushaf-list':case'mushaf-surah':return'mushaf';case'hadith':return'hadith';case'azkar-list':case'category':case'favorites':return'azkar';case'tasbih':return'tasbih';case'settings':return'more';default:return null}}
const DIACRITICS=/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D4-\u08E1\u08D3-\u08FF]/g
export function normalizeArabic(s:string){return s.replace(DIACRITICS,'').replace(/[إأآٱ]/g,'ا').replace(/\s+/g,' ').trim()}
export function stripBismillahPrefix(text:string){const target=normalizeArabic(BISMILLAH);let normalized='';for(let i=0;i<text.length;i++){normalized=normalizeArabic(text.slice(0,i+1));if(normalized===target){let cut=i+1;while(cut<text.length&&(text[cut]===' '||/[ؐ-ًؚ-ٰٟۖ-ۭ]/.test(text[cut])))cut++;return text.slice(cut).trim()}if(!target.startsWith(normalized))return text}return text}
